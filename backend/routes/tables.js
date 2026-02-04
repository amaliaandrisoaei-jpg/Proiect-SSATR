// backend/routes/tables.js
import express from 'express';

export default function(io, pool) {
    const router = express.Router();

    // GET all tables
    router.get('/', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM tables ORDER BY id');
            res.json(result.rows);
        } catch (err) {
            console.error('Error fetching tables:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // GET a single table by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query('SELECT * FROM tables WHERE id = $1', [id]);
            if (result.rows.length > 0) {
                res.json(result.rows[0]);
            } else {
                res.status(404).json({ error: 'Table not found' });
            }
        } catch (err) {
            console.error(`Error fetching table with ID ${id}:`, err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // POST create a new table
    router.post('/', async (req, res) => {
        const { qr_code, status } = req.body;
        try {
            const result = await pool.query(
                'INSERT INTO tables (qr_code, status) VALUES ($1, $2) RETURNING *',
                [qr_code, status]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Error creating table:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // PUT update an existing table
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { qr_code, status } = req.body;
        try {
            const result = await pool.query(
                'UPDATE tables SET qr_code = $1, status = $2, updated_at = current_timestamp WHERE id = $3 RETURNING *',
                [qr_code, status, id]
            );
            if (result.rows.length > 0) {
                res.json(result.rows[0]);
            } else {
                res.status(404).json({ error: 'Table not found' });
            }
        } catch (err) {
            console.error(`Error updating table with ID ${id}:`, err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // DELETE a table
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query('DELETE FROM tables WHERE id = $1 RETURNING *', [id]);
            if (result.rows.length > 0) {
                res.status(204).send(); // No content
            } else {
                res.status(404).json({ error: 'Table not found' });
            }
        } catch (err) {
            console.error(`Error deleting table with ID ${id}:`, err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    return router;
}
