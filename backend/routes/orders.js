// backend/routes/orders.js
import express from 'express';
import { getAndEmitStatistics } from './statistics.js'; // Import statistics helper

export default function(io, pool) {
    const router = express.Router();

    // GET all orders
    router.get('/', async (req, res) => {
        try {
            // Fetch all orders
            const ordersResult = await pool.query('SELECT * FROM orders ORDER BY id');
            const orders = ordersResult.rows.map(order => ({
                ...order,
                total_amount: parseFloat(order.total_amount)
            }));

            // If there are orders, fetch their items
            if (orders.length > 0) {
                const orderIds = orders.map(order => order.id);
                const orderItemsResult = await pool.query(`
                    SELECT oi.*, mi.name as menu_item_name, mi.description as menu_item_description
                    FROM order_items oi
                    JOIN menu_items mi ON oi.menu_item_id = mi.id
                    WHERE oi.order_id = ANY($1::int[])
                    ORDER BY oi.order_id, oi.id;
                `, [orderIds]);

                // Map items to their respective orders
                const ordersWithItems = orders.map(order => {
                    const items = orderItemsResult.rows
                        .filter(item => item.order_id === order.id)
                        .map(item => ({
                            ...item,
                            price: parseFloat(item.price), // Ensure price is float
                            // total_amount: parseFloat(item.total_amount) // Assuming order_items do not have total_amount, but individual price
                        }));
                    return { ...order, items };
                });
                res.json(ordersWithItems);
            } else {
                res.json([]);
            }
        } catch (err) {
            console.error('Error fetching orders:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // GET a single order by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
            if (orderResult.rows.length > 0) {
                const order = {
                    ...orderResult.rows[0],
                    total_amount: parseFloat(orderResult.rows[0].total_amount)
                };

                // Fetch order items for this order
                const orderItemsResult = await pool.query(`
                    SELECT oi.*, mi.name as menu_item_name, mi.description as menu_item_description
                    FROM order_items oi
                    JOIN menu_items mi ON oi.menu_item_id = mi.id
                    WHERE oi.order_id = $1
                    ORDER BY oi.id;
                `, [id]);

                const items = orderItemsResult.rows.map(item => ({
                    ...item,
                    price: parseFloat(item.price), // Ensure price is float
                }));

                res.json({ ...order, items });
            } else {
                res.status(404).json({ error: 'Order not found' });
            }
        } catch (err) {
            console.error(`Error fetching order with ID ${id}:`, err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // POST create a new order
    router.post('/', async (req, res) => {
        const { table_id, items } = req.body; // items: [{ menu_item_id, quantity }]
        let client;
        try {
            client = await pool.connect();
            await client.query('BEGIN');

            // Fetch menu item prices to calculate total_amount and store in order_items
            const menuItemIds = items.map(item => item.menu_item_id);
            const menuItemsResult = await client.query(
                'SELECT id, price FROM menu_items WHERE id = ANY($1::int[])',
                [menuItemIds]
            );
            const menuItemsPrices = new Map(menuItemsResult.rows.map(item => [item.id, parseFloat(item.price)]));

            let total_amount = 0;
            const orderItemsToInsert = [];

            for (const item of items) {
                const price = menuItemsPrices.get(item.menu_item_id);
                if (price === undefined) {
                    throw new Error(`Menu item with ID ${item.menu_item_id} not found.`);
                }
                total_amount += price * item.quantity;
                orderItemsToInsert.push({
                    menu_item_id: item.menu_item_id,
                    quantity: item.quantity,
                    price: price // Store price at the time of order
                });
            }

            // Insert the new order
            const orderResult = await client.query(
                'INSERT INTO orders (table_id, status, total_amount) VALUES ($1, $2, $3) RETURNING *',
                [table_id, 'pending', total_amount] // Default status to 'pending'
            );
            const newOrder = {
                ...orderResult.rows[0],
                total_amount: parseFloat(orderResult.rows[0].total_amount)
            };

            // Insert order items
            for (const item of orderItemsToInsert) {
                await client.query(
                    'INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES ($1, $2, $3, $4)',
                    [newOrder.id, item.menu_item_id, item.quantity, item.price]
                );
            }

            // Update table status to 'occupied'
            const updatedTableResult = await client.query(
                'UPDATE tables SET status = $1, updated_at = current_timestamp WHERE id = $2 RETURNING *',
                ['occupied', table_id]
            );
            const updatedTable = updatedTableResult.rows[0];

            await client.query('COMMIT');
            res.status(201).json(newOrder);
            io.emit('newOrder', newOrder); // Emit new order event
            io.emit('tableStatusUpdate', updatedTable); // Emit table status update event
            getAndEmitStatistics(io, pool)(); // Emit updated statistics
        } catch (err) {
            if (client) {
                await client.query('ROLLBACK');
            }
            console.error('Error creating order:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } finally {
            if (client) {
                client.release();
            }
        }
    });

    // PUT update order status
    router.put('/:id/status', async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;
        let client; // Declare client here
        try {
            client = await pool.connect(); // Get client for transaction
            await client.query('BEGIN');

            const result = await client.query( // Use client for query
                'UPDATE orders SET status = $1, updated_at = current_timestamp WHERE id = $2 RETURNING *',
                [status, id]
            );
            if (result.rows.length > 0) {
                const updatedOrder = {
                    ...result.rows[0],
                    total_amount: parseFloat(result.rows[0].total_amount)
                };

                // Fetch order items for this updated order
                const orderItemsResult = await client.query(`
                    SELECT oi.*, mi.name as menu_item_name, mi.description as menu_item_description
                    FROM order_items oi
                    JOIN menu_items mi ON oi.menu_item_id = mi.id
                    WHERE oi.order_id = $1
                    ORDER BY oi.id;
                `, [updatedOrder.id]);

                const items = orderItemsResult.rows.map(item => ({
                    ...item,
                    price: parseFloat(item.price), // Ensure price is float
                }));

                updatedOrder.items = items; // Attach items to the updated order

                // Check if the order status indicates table availability change
                if (['served', 'completed', 'cancelled'].includes(status)) {
                    const tableId = updatedOrder.table_id;
                    const updatedTableResult = await client.query(
                        'UPDATE tables SET status = $1, updated_at = current_timestamp WHERE id = $2 RETURNING *',
                        ['available', tableId]
                    );
                    const updatedTable = updatedTableResult.rows[0];
                    io.emit('tableStatusUpdate', updatedTable); // Emit table status update event
                }

                await client.query('COMMIT'); // Commit transaction
                res.json(updatedOrder);
                io.emit('orderStatusUpdate', updatedOrder); // Emit order status update event
                getAndEmitStatistics(io, pool)(); // Emit updated statistics
            } else {
                await client.query('ROLLBACK'); // Rollback if order not found
                res.status(404).json({ error: 'Order not found' });
            }
        } catch (err) {
            if (client) {
                await client.query('ROLLBACK'); // Rollback on error
            }
            console.error(`Error updating order status for ID ${id}:`, err);
            res.status(500).json({ error: 'Internal Server Error' });
        } finally {
            if (client) {
                client.release();
            }
        }
    });

    // PUT update an existing order
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { table_id, status, total_amount } = req.body;
        try {
            const result = await pool.query(
                'UPDATE orders SET table_id = $1, status = $2, total_amount = $3, updated_at = current_timestamp WHERE id = $4 RETURNING *',
                [table_id, status, total_amount, id]
            );
            if (result.rows.length > 0) {
                const updatedOrder = {
                    ...result.rows[0],
                    total_amount: parseFloat(result.rows[0].total_amount)
                };
                res.json(updatedOrder);
            } else {
                res.status(404).json({ error: 'Order not found' });
            }
        } catch (err) {
            console.error(`Error updating order with ID ${id}:`, err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // DELETE an order
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query('DELETE FROM orders WHERE id = $1 RETURNING *', [id]);
            if (result.rows.length > 0) {
                res.status(204).send(); // No content
            } else {
                res.status(404).json({ error: 'Order not found' });
            }
        } catch (err) {
            console.error(`Error deleting order with ID ${id}:`, err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    return router;
}