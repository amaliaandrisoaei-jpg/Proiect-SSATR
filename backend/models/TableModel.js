export default class TableModel {
    constructor(pool) {
        this.pool = pool;
    }

    async findAll() {
        const result = await this.pool.query('SELECT * FROM tables ORDER BY id');
        return result.rows;
    }

    async findById(id) {
        const result = await this.pool.query('SELECT * FROM tables WHERE id = $1', [id]);
        return result.rows[0];
    }

    async create(data) {
        const { qr_code, status } = data;
        const result = await this.pool.query(
            'INSERT INTO tables (qr_code, status) VALUES ($1, $2) RETURNING *',
            [qr_code, status]
        );
        return result.rows[0];
    }

    async update(id, data) {
        const { qr_code, status } = data;
        const result = await this.pool.query(
            'UPDATE tables SET qr_code = $1, status = $2, updated_at = current_timestamp WHERE id = $3 RETURNING *',
            [qr_code, status, id]
        );
        return result.rows[0];
    }

    async delete(id) {
        const result = await this.pool.query('DELETE FROM tables WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
    }

    async updateStatus(id, status, client = null) {
        const queryExecutor = client || this.pool;
        const result = await queryExecutor.query(
            'UPDATE tables SET status = $1, updated_at = current_timestamp WHERE id = $2 RETURNING *',
            [status, id]
        );
        return result.rows[0];
    }
}
