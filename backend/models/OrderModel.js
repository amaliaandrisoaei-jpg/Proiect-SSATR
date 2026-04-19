export default class OrderModel {
    constructor(pool) {
        this.pool = pool;
    }

    async findAll() {
        const result = await this.pool.query('SELECT * FROM orders ORDER BY id');
        return result.rows;
    }

    async findById(id, client = null) {
        const executor = client || this.pool;
        const result = await executor.query('SELECT * FROM orders WHERE id = $1', [id]);
        return result.rows[0];
    }

    async create(data, client) {
        const { table_id, status, total_amount } = data;
        const result = await client.query(
            'INSERT INTO orders (table_id, status, total_amount) VALUES ($1, $2, $3) RETURNING *',
            [table_id, status, total_amount]
        );
        return result.rows[0];
    }

    async updateStatus(id, status, client) {
        const result = await client.query(
            'UPDATE orders SET status = $1, updated_at = current_timestamp WHERE id = $2 RETURNING *',
            [status, id]
        );
        return result.rows[0];
    }

    async update(id, data) {
        const { table_id, status, total_amount } = data;
        const result = await this.pool.query(
            'UPDATE orders SET table_id = $1, status = $2, total_amount = $3, updated_at = current_timestamp WHERE id = $4 RETURNING *',
            [table_id, status, total_amount, id]
        );
        return result.rows[0];
    }

    async delete(id) {
        const result = await this.pool.query('DELETE FROM orders WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
    }
}
