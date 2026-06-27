import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../app.js';
import { newTestPool, truncateAll } from '../helpers/db.js';
import { insertTable, insertOrder } from '../helpers/fixtures.js';

describe('Statistics API (integration)', () => {
    let pool;
    let app;

    beforeAll(() => {
        pool = newTestPool();
        app = createApp(pool);
    });
    afterAll(async () => {
        await pool.end();
    });
    beforeEach(async () => {
        await truncateAll(pool);
    });

    test('GET /api/statistics/summary returns all-zero stats for an empty DB', async () => {
        const res = await request(app).get('/api/statistics/summary');

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            totalTables: 0,
            occupiedTables: 0,
            availableTables: 0,
            pendingOrders: 0,
            preparingOrders: 0,
            readyOrders: 0,
            totalRevenue: 0,
        });
    });

    test('GET /api/statistics/summary aggregates tables, orders and revenue', async () => {
        // 3 tables: 2 occupied, 1 available.
        const occ1 = await insertTable(pool, { qr_code: 'st-1', status: 'occupied' });
        const occ2 = await insertTable(pool, { qr_code: 'st-2', status: 'occupied' });
        await insertTable(pool, { qr_code: 'st-3', status: 'available' });

        // Orders across the status machine; revenue counts served + completed.
        await insertOrder(pool, { table_id: occ1.id, status: 'pending', total_amount: 5 });
        await insertOrder(pool, { table_id: occ1.id, status: 'preparing', total_amount: 7 });
        await insertOrder(pool, { table_id: occ2.id, status: 'ready', total_amount: 9 });
        await insertOrder(pool, { table_id: occ2.id, status: 'served', total_amount: 20 });
        await insertOrder(pool, { table_id: occ2.id, status: 'completed', total_amount: 30 });

        const res = await request(app).get('/api/statistics/summary');

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            totalTables: 3,
            occupiedTables: 2,
            availableTables: 1,
            pendingOrders: 1,
            preparingOrders: 1,
            readyOrders: 1,
            totalRevenue: 50, // 20 (served) + 30 (completed)
        });
    });
});
