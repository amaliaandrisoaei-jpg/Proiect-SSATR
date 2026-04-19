// backend/routes/menuItems.js
import express from 'express';

export default function(menuItemService) {
    const router = express.Router();

    // GET all menu items
    router.get('/', async (req, res) => {
        try {
            const menuItems = await menuItemService.getAllMenuItems();
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
            const item = await menuItemService.getMenuItemById(id);
            if (item) {
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
        try {
            const newItem = await menuItemService.createMenuItem(req.body);
            res.status(201).json(newItem);
        } catch (err) {
            console.error('Error creating menu item:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // PUT update an existing menu item
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const updatedItem = await menuItemService.updateMenuItem(id, req.body);
            if (updatedItem) {
                res.json(updatedItem);
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
            const deletedItem = await menuItemService.deleteMenuItem(id);
            if (deletedItem) {
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
