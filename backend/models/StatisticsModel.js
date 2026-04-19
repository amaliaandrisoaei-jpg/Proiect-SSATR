export default class StatisticsModel {
    constructor(pool) {
        this.pool = pool;
    }

    async getTableStats(client = null) {
        const executor = client || this.pool;
        const result = await executor.query(`
            SELECT
                COUNT(*) AS total_tables,
                SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) AS occupied_tables,
                SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available_tables
            FROM tables;
        `);
        return result.rows[0];
    }

    async getOrderStats(client = null) {
        const executor = client || this.pool;
        const result = await executor.query(`
            SELECT
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_orders,
                SUM(CASE WHEN status = 'preparing' THEN 1 ELSE 0 END) AS preparing_orders,
                SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) AS ready_orders
            FROM orders;
        `);
        return result.rows[0];
    }

    async getRevenueStats(client = null) {
        const executor = client || this.pool;
        const result = await executor.query(`
            SELECT SUM(total_amount) AS total_revenue
            FROM orders
            WHERE status IN ('served', 'completed');
        `);
        return result.rows[0].total_revenue || 0;
    }

    async getFullStatistics(client = null) {
        const tableStats = await this.getTableStats(client);
        const orderStats = await this.getOrderStats(client);
        const revenue = await this.getRevenueStats(client);

        return {
            totalTables: parseInt(tableStats.total_tables, 10) || 0,
            occupiedTables: parseInt(tableStats.occupied_tables, 10) || 0,
            availableTables: parseInt(tableStats.available_tables, 10) || 0,
            pendingOrders: parseInt(orderStats.pending_orders || '0', 10),
            preparingOrders: parseInt(orderStats.preparing_orders || '0', 10),
            readyOrders: parseInt(orderStats.ready_orders || '0', 10),
            totalRevenue: parseFloat(revenue),
        };
    }
}
