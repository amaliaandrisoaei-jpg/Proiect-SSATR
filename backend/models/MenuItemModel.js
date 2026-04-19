export default class MenuItemModel {
    constructor(pool) {
        this.pool = pool;
    }

    async findAll() {
        const result = await this.pool.query('SELECT * FROM menu_items ORDER BY id');
        return result.rows;
    }

    async findById(id) {
        const result = await this.pool.query('SELECT * FROM menu_items WHERE id = $1', [id]);
        return result.rows[0];
    }

    async create(data) {
        const { name, description, price, category, image_url, is_available } = data;
        const result = await this.pool.query(
            'INSERT INTO menu_items (name, description, price, category, image_url, is_available) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, description, price, category, image_url, is_available]
        );
        return result.rows[0];
    }

    async update(id, data) {
        const { name, description, price, category, image_url, is_available } = data;
        const result = await this.pool.query(
            'UPDATE menu_items SET name = $1, description = $2, price = $3, category = $4, image_url = $5, is_available = $6, updated_at = current_timestamp WHERE id = $7 RETURNING *',
            [name, description, price, category, image_url, is_available, id]
        );
        return result.rows[0];
    }

    async delete(id) {
        const result = await this.pool.query('DELETE FROM menu_items WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
    }
}
