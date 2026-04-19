export default class OrderService {
    constructor(orderModel, orderItemModel, tableModel, menuItemModel, statisticsService, io, pool) {
        this.orderModel = orderModel;
        this.orderItemModel = orderItemModel;
        this.tableModel = tableModel;
        this.menuItemModel = menuItemModel;
        this.statisticsService = statisticsService;
        this.io = io;
        this.pool = pool;
    }

    async getAllOrders() {
        const orders = await this.orderModel.findAll();
        const parsedOrders = orders.map(order => ({
            ...order,
            total_amount: parseFloat(order.total_amount)
        }));

        if (parsedOrders.length > 0) {
            const orderIds = parsedOrders.map(order => order.id);
            const allItems = await this.orderItemModel.findByOrderIds(orderIds);

            return parsedOrders.map(order => {
                const items = allItems
                    .filter(item => item.order_id === order.id)
                    .map(item => ({
                        ...item,
                        price: parseFloat(item.price)
                    }));
                return { ...order, items };
            });
        }
        return [];
    }

    async getOrderById(id) {
        const order = await this.orderModel.findById(id);
        if (order) {
            const parsedOrder = {
                ...order,
                total_amount: parseFloat(order.total_amount)
            };
            const items = await this.orderItemModel.findByOrderId(id);
            parsedOrder.items = items.map(item => ({
                ...item,
                price: parseFloat(item.price)
            }));
            return parsedOrder;
        }
        return null;
    }

    async createOrder(table_id, items) {
        let client;
        try {
            client = await this.pool.connect();
            await client.query('BEGIN');

            let total_amount = 0;
            const orderItemsToInsert = [];

            for (const item of items) {
                const menuItem = await this.menuItemModel.findById(item.menu_item_id);
                if (!menuItem) {
                    throw new Error(`Menu item with ID ${item.menu_item_id} not found.`);
                }
                const price = parseFloat(menuItem.price);
                total_amount += price * item.quantity;
                orderItemsToInsert.push({
                    menu_item_id: item.menu_item_id,
                    quantity: item.quantity,
                    price: price
                });
            }

            const newOrder = await this.orderModel.create({
                table_id,
                status: 'pending',
                total_amount
            }, client);

            for (const item of orderItemsToInsert) {
                await this.orderItemModel.create({
                    order_id: newOrder.id,
                    ...item
                }, client);
            }

            const updatedTable = await this.tableModel.updateStatus(table_id, 'occupied', client);

            await client.query('COMMIT');

            const resultOrder = {
                ...newOrder,
                total_amount: parseFloat(newOrder.total_amount)
            };

            if (this.io) {
                this.io.emit('newOrder', resultOrder);
                this.io.emit('tableStatusUpdate', updatedTable);
                this.statisticsService.emitStatistics();
            }

            return resultOrder;
        } catch (err) {
            if (client) await client.query('ROLLBACK');
            throw err;
        } finally {
            if (client) client.release();
        }
    }

    async updateOrderStatus(id, status) {
        let client;
        try {
            client = await this.pool.connect();
            await client.query('BEGIN');

            const updatedOrder = await this.orderModel.updateStatus(id, status, client);
            if (!updatedOrder) {
                await client.query('ROLLBACK');
                return null;
            }

            const items = await this.orderItemModel.findByOrderId(id, client);
            const resultOrder = {
                ...updatedOrder,
                total_amount: parseFloat(updatedOrder.total_amount),
                items: items.map(item => ({
                    ...item,
                    price: parseFloat(item.price)
                }))
            };

            if (['served', 'completed', 'cancelled'].includes(status)) {
                const updatedTable = await this.tableModel.updateStatus(resultOrder.table_id, 'available', client);
                if (this.io) {
                    this.io.emit('tableStatusUpdate', updatedTable);
                }
            }

            await client.query('COMMIT');

            if (this.io) {
                this.io.emit('orderStatusUpdate', resultOrder);
                this.statisticsService.emitStatistics();
            }

            return resultOrder;
        } catch (err) {
            if (client) await client.query('ROLLBACK');
            throw err;
        } finally {
            if (client) client.release();
        }
    }

    async updateOrder(id, data) {
        const order = await this.orderModel.update(id, data);
        if (order) {
            return {
                ...order,
                total_amount: parseFloat(order.total_amount)
            };
        }
        return null;
    }

    async deleteOrder(id) {
        return await this.orderModel.delete(id);
    }
}
