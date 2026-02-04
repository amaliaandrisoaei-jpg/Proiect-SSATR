// backend/routes/menuItems.js
import express from 'express';

export default function(io, pool) {
    const router = express.Router();

    // GET all menu items
    router.get('/', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM menu_items ORDER BY id');
            // Convert price from string (PostgreSQL DECIMAL) to number for each item
            const menuItems = result.rows.map(item => ({
                ...item,
                price: parseFloat(item.price)
            }));
            res.json(menuItems);
        } catch (err) {
            console.error('Error fetching menu items:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // GET a single menu item by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query('SELECT * FROM menu_items WHERE id = $1', [id]);
            if (result.rows.length > 0) {
                const item = result.rows[0];
                // Convert price from string (PostgreSQL DECIMAL) to number
                item.price = parseFloat(item.price);
                res.json(item);
            } else {
                res.status(404).json({ error: 'Menu item not found' });
            }
        } catch (err) {
            console.error(`Error fetching menu item with ID ${id}:`, err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // POST create a new menu item
    router.post('/', async (req, res) => {
        const { name, description, price, category, image_url, is_available } = req.body;
        try {
            const result = await pool.query(
                'INSERT INTO menu_items (name, description, price, category, image_url, is_available) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                [name, description, price, category, image_url, is_available]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Error creating menu item:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // PUT update an existing menu item
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { name, description, price, category, image_url, is_available } = req.body;
        try {
            const result = await pool.query(
                'UPDATE menu_items SET name = $1, description = $2, price = $3, category = $4, image_url = $5, is_available = $6, updated_at = current_timestamp WHERE id = $7 RETURNING *',
                [name, description, price, category, image_url, is_available, id]
            );
            if (result.rows.length > 0) {
                res.json(result.rows[0]);
            } else {
                res.status(404).json({ error: 'Menu item not found' });
            }
        } catch (err) {
            console.error(`Error updating menu item with ID ${id}:`, err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // DELETE a menu item
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query('DELETE FROM menu_items WHERE id = $1 RETURNING *', [id]);
            if (result.rows.length > 0) {
                res.status(204).send(); // No content
            } else {
                res.status(404).json({ error: 'Menu item not found' });
            }
        } catch (err) {
            console.error(`Error deleting menu item with ID ${id}:`, err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    return router;
}