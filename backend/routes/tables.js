// backend/routes/tables.js
import express from 'express';

export default function(tableService) {
    const router = express.Router();

    // GET all tables
    router.get('/', async (req, res) => {
        try {
            const tables = await tableService.getAllTables();
            res.json(tables);
        } catch (err) {
            console.error('Error fetching tables:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // GET a single table by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const table = await tableService.getTableById(id);
            if (table) {
                res.json(table);
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
        try {
            const newTable = await tableService.createTable(req.body);
            res.status(201).json(newTable);
        } catch (err) {
            console.error('Error creating table:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // PUT update an existing table
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const updatedTable = await tableService.updateTable(id, req.body);
            if (updatedTable) {
                res.json(updatedTable);
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
            const deletedTable = await tableService.deleteTable(id);
            if (deletedTable) {
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
