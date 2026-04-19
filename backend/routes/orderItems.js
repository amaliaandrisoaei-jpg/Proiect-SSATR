// backend/routes/orderItems.js
import express from 'express';

export default function(orderItemService) {
    const router = express.Router();

    // GET all order items
    router.get('/', async (req, res) => {
        try {
            const items = await orderItemService.getAllOrderItems();
            res.json(items);
        } catch (err) {
            console.error('Error fetching order items:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // GET a single order item by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const item = await orderItemService.getOrderItemById(id);
            if (item) {
                res.json(item);
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
        try {
            const newItem = await orderItemService.createOrderItem(req.body);
            res.status(201).json(newItem);
        } catch (err) {
            console.error('Error creating order item:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // PUT update an existing order item
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const updatedItem = await orderItemService.updateOrderItem(id, req.body);
            if (updatedItem) {
                res.json(updatedItem);
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
            const deletedItem = await orderItemService.deleteOrderItem(id);
            if (deletedItem) {
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
