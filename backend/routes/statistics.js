// backend/routes/statistics.js
import express from 'express';
import { Pool } from 'pg';

export const getAndEmitStatistics = (io, pool) => async () => {
    try {
        const client = await pool.connect();

        // Total, occupied, and available tables
        const tablesResult = await client.query(`
            SELECT
                COUNT(*) AS total_tables,
                SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) AS occupied_tables,
                SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available_tables
            FROM tables;
        `);
        const { total_tables, occupied_tables, available_tables } = tablesResult.rows[0];

        // Pending, preparing, and ready orders
        const ordersResult = await client.query(`
            SELECT
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_orders,
                SUM(CASE WHEN status = 'preparing' THEN 1 ELSE 0 END) AS preparing_orders,
                SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) AS ready_orders
            FROM orders;
        `);
        const { pending_orders, preparing_orders, ready_orders } = ordersResult.rows[0];

        // Total Revenue (all time for now)
        const revenueResult = await client.query(`
            SELECT SUM(total_amount) AS total_revenue
            FROM orders
            WHERE status IN ('served', 'completed');
        `);
        const total_revenue = parseFloat(revenueResult.rows[0].total_revenue || 0);

        client.release();

        const statistics = {
            totalTables: parseInt(total_tables, 10) || 0,
            occupiedTables: parseInt(occupied_tables, 10) || 0,
            availableTables: parseInt(available_tables, 10) || 0,
            pendingOrders: parseInt(pending_orders || '0', 10),
            preparingOrders: parseInt(preparing_orders || '0', 10),
            readyOrders: parseInt(ready_orders || '0', 10),
            totalRevenue: total_revenue,
        };
        io.emit('statisticsUpdate', statistics);
        return statistics;

    } catch (err) {
        console.error('Error fetching and emitting statistics summary:', err);
        return null;
    }
};

export default function(io, pool) {
    const router = express.Router();

    router.get('/summary', async (req, res) => {
        const stats = await getAndEmitStatistics(io, pool)();
        if (stats) {
            res.json(stats);
        } else {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    return router;
}