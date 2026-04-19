// backend/routes/orders.js
import express from 'express';

export default function(orderService) {
    const router = express.Router();

    // GET all orders
    router.get('/', async (req, res) => {
        try {
            const orders = await orderService.getAllOrders();
            res.json(orders);
        } catch (err) {
            console.error('Error fetching orders:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // GET a single order by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const order = await orderService.getOrderById(id);
            if (order) {
                res.json(order);
            } else {
                res.status(404).json({ error: 'Order not found' });
            }
        } catch (err) {
            console.error(`Error fetching order with ID ${id}:`, err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // POST create a new order
    router.post('/', async (req, res) => {
        const { table_id, items } = req.body;
        try {
            const newOrder = await orderService.createOrder(table_id, items);
            res.status(201).json(newOrder);
        } catch (err) {
            console.error('Error creating order:', err);
            res.status(500).json({ error: err.message || 'Internal Server Error' });
        }
    });

    // PUT update order status
    router.put('/:id/status', async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;
        try {
            const updatedOrder = await orderService.updateOrderStatus(id, status);
            if (updatedOrder) {
                res.json(updatedOrder);
            } else {
                res.status(404).json({ error: 'Order not found' });
            }
        } catch (err) {
            console.error(`Error updating order status for ID ${id}:`, err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // PUT update an existing order
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const updatedOrder = await orderService.updateOrder(id, req.body);
            if (updatedOrder) {
                res.json(updatedOrder);
            } else {
                res.status(404).json({ error: 'Order not found' });
            }
        } catch (err) {
            console.error(`Error updating order with ID ${id}:`, err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // DELETE an order
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const deletedOrder = await orderService.deleteOrder(id);
            if (deletedOrder) {
                res.status(204).send(); // No content
            } else {
                res.status(404).json({ error: 'Order not found' });
            }
        } catch (err) {
            console.error(`Error deleting order with ID ${id}:`, err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    return router;
}
