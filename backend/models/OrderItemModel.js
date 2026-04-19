export default class OrderItemModel {
    constructor(pool) {
        this.pool = pool;
    }

    async findAll() {
        const result = await this.pool.query('SELECT * FROM order_items ORDER BY id');
        return result.rows;
    }

    async findById(id) {
        const result = await this.pool.query('SELECT * FROM order_items WHERE id = $1', [id]);
        return result.rows[0];
    }

    async findByOrderIds(orderIds) {
        const result = await this.pool.query(`
            SELECT oi.*, mi.name as menu_item_name, mi.description as menu_item_description
            FROM order_items oi
            JOIN menu_items mi ON oi.menu_item_id = mi.id
            WHERE oi.order_id = ANY($1::int[])
            ORDER BY oi.order_id, oi.id;
        `, [orderIds]);
        return result.rows;
    }

    async findByOrderId(orderId, client = null) {
        const executor = client || this.pool;
        const result = await executor.query(`
            SELECT oi.*, mi.name as menu_item_name, mi.description as menu_item_description
            FROM order_items oi
            JOIN menu_items mi ON oi.menu_item_id = mi.id
            WHERE oi.order_id = $1
            ORDER BY oi.id;
        `, [orderId]);
        return result.rows;
    }

    async create(data, client) {
        const { order_id, menu_item_id, quantity, price } = data;
        const result = await client.query(
            'INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES ($1, $2, $3, $4) RETURNING *',
            [order_id, menu_item_id, quantity, price]
        );
        return result.rows[0];
    }

    async update(id, data) {
        const { order_id, menu_item_id, quantity, price, notes } = data;
        const result = await this.pool.query(
            'UPDATE order_items SET order_id = $1, menu_item_id = $2, quantity = $3, price = $4, notes = $5, updated_at = current_timestamp WHERE id = $6 RETURNING *',
            [order_id, menu_item_id, quantity, price, notes, id]
        );
        return result.rows[0];
    }

    async delete(id) {
        const result = await this.pool.query('DELETE FROM order_items WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
    }
}
