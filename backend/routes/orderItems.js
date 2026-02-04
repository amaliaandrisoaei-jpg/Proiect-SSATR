// backend/routes/orderItems.js
import express from 'express';

export default function(io, pool) {
    const router = express.Router();

    // GET all order items
    router.get('/', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM order_items ORDER BY id');
            res.json(result.rows);
        } catch (err) {
            console.error('Error fetching order items:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // GET a single order item by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query('SELECT * FROM order_items WHERE id = $1', [id]);
            if (result.rows.length > 0) {
                res.json(result.rows[0]);
            } else {
                res.status(404).json({ error: 'Order item not found' });
            }
        } catch (err) {
            console.error(`Error fetching order item with ID ${id}:`, err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // POST create a new order item
    router.post('/', async (req, res) => {
        const { order_id, menu_item_id, quantity, price, notes } = req.body;
        try {
            const result = await pool.query(
                'INSERT INTO order_items (order_id, menu_item_id, quantity, price, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [order_id, menu_item_id, quantity, price, notes]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Error creating order item:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // PUT update an existing order item
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { order_id, menu_item_id, quantity, price, notes } = req.body;
        try {
            const result = await pool.query(
                'UPDATE order_items SET order_id = $1, menu_item_id = $2, quantity = $3, price = $4, notes = $5, updated_at = current_timestamp WHERE id = $6 RETURNING *',
                [order_id, menu_item_id, quantity, price, notes, id]
            );
            if (result.rows.length > 0) {
                res.json(result.rows[0]);
            } else {
                res.status(404).json({ error: 'Order item not found' });
            }
        } catch (err) {
            console.error(`Error updating order item with ID ${id}:`, err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // DELETE an order item
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query('DELETE FROM order_items WHERE id = $1 RETURNING *', [id]);
            if (result.rows.length > 0) {
                res.status(204).send(); // No content
            } else {
                res.status(404).json({ error: 'Order item not found' });
            }
        } catch (err) {
            console.error(`Error deleting order item with ID ${id}:`, err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    return router;
}