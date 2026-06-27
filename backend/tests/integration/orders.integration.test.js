import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../app.js';
import { newTestPool, truncateAll, getDatabaseUrl } from '../helpers/db.js';
import { insertTable, insertMenuItem, insertOrder, insertOrderItem } from '../helpers/fixtures.js';

/**
 * Integration tests for /api/orders against the ephemeral Testcontainers DB.
 * Each test asserts the HTTP status, the response body AND the resulting DB state.
 */
describe('Orders API (integration)', () => {
    let pool;
    let app;

    beforeAll(async () => {
        // Safety: the Testcontainers globalSetup hands over an ephemeral
        // "restaurant_test" database — never a real one.
        if (!getDatabaseUrl().includes('restaurant_test')) {
            throw new Error('Integration tests must run against the restaurant_test database!');
        }
        pool = newTestPool();
        app = createApp(pool); // no io -> pure HTTP contract
    });

    afterAll(async () => {
        await pool.end();
    });

    beforeEach(async () => {
        await truncateAll(pool);
    });

    // --- GET / -------------------------------------------------------------
    describe('GET /api/orders', () => {
        test('returns [] when there are no orders', async () => {
            const res = await request(app).get('/api/orders');
            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });

        test('returns orders with their items and numeric amounts', async () => {
            const table = await insertTable(pool, { qr_code: 'g-1' });
            const menuItem = await insertMenuItem(pool, { name: 'Soup', price: 7.5 });
            const order = await insertOrder(pool, { table_id: table.id, status: 'pending', total_amount: 15.0 });
            await insertOrderItem(pool, { order_id: order.id, menu_item_id: menuItem.id, quantity: 2, price: 7.5 });

            const res = await request(app).get('/api/orders');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].total_amount).toBe(15.0);
            expect(res.body[0].items).toHaveLength(1);
            expect(res.body[0].items[0].menu_item_name).toBe('Soup');
            expect(res.body[0].items[0].price).toBe(7.5);
        });
    });

    // --- GET /:id ----------------------------------------------------------
    describe('GET /api/orders/:id', () => {
        test('returns a single order when found', async () => {
            const table = await insertTable(pool, { qr_code: 'g-2' });
            const order = await insertOrder(pool, { table_id: table.id, total_amount: 9.99 });

            const res = await request(app).get(`/api/orders/${order.id}`);

            expect(res.status).toBe(200);
            expect(res.body.id).toBe(order.id);
            expect(res.body.total_amount).toBe(9.99);
            expect(res.body.items).toEqual([]);
        });

        test('returns 404 for an unknown order', async () => {
            const res = await request(app).get('/api/orders/424242');
            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Order not found');
        });
    });

    // --- POST / ------------------------------------------------------------
    describe('POST /api/orders', () => {
        test('creates an order, persists items and occupies the table', async () => {
            const table = await insertTable(pool, { qr_code: 'p-1', status: 'available' });
            const menuItem = await insertMenuItem(pool, { name: 'Pizza', price: 12.5 });

            const res = await request(app)
                .post('/api/orders')
                .send({ table_id: table.id, items: [{ menu_item_id: menuItem.id, quantity: 2 }] });

            expect(res.status).toBe(201);
            expect(res.body.total_amount).toBe(25.0);
            expect(res.body.status).toBe('pending');

            const tableRow = await pool.query('SELECT status FROM tables WHERE id = $1', [table.id]);
            expect(tableRow.rows[0].status).toBe('occupied');

            const items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [res.body.id]);
            expect(items.rows).toHaveLength(1);
            expect(parseFloat(items.rows[0].price)).toBe(12.5);
        });

        // DEF-002
        test('rejects an empty cart and does NOT occupy the table or persist an order', async () => {
            const table = await insertTable(pool, { qr_code: 'p-2', status: 'available' });

            const res = await request(app)
                .post('/api/orders')
                .send({ table_id: table.id, items: [] });

            expect(res.status).toBe(500);
            expect(res.body.error).toBe('Cannot create an order with no items.');

            const tableRow = await pool.query('SELECT status FROM tables WHERE id = $1', [table.id]);
            expect(tableRow.rows[0].status).toBe('available');
            const orders = await pool.query('SELECT * FROM orders');
            expect(orders.rows).toHaveLength(0);
        });

        test('rolls back fully when a menu item does not exist', async () => {
            const table = await insertTable(pool, { qr_code: 'p-3', status: 'available' });

            const res = await request(app)
                .post('/api/orders')
                .send({ table_id: table.id, items: [{ menu_item_id: 999999, quantity: 1 }] });

            expect(res.status).toBe(500);
            expect(res.body.error).toContain('Menu item with ID 999999 not found.');

            // Transaction rolled back: no order, table untouched.
            const orders = await pool.query('SELECT * FROM orders');
            expect(orders.rows).toHaveLength(0);
            const tableRow = await pool.query('SELECT status FROM tables WHERE id = $1', [table.id]);
            expect(tableRow.rows[0].status).toBe('available');
        });

        test('fails (and persists nothing) for a non-existent table', async () => {
            const menuItem = await insertMenuItem(pool, { name: 'Salad', price: 6.0 });

            const res = await request(app)
                .post('/api/orders')
                .send({ table_id: 999999, items: [{ menu_item_id: menuItem.id, quantity: 1 }] });

            expect(res.status).toBe(500);
            const orders = await pool.query('SELECT * FROM orders');
            expect(orders.rows).toHaveLength(0);
        });
    });

    // --- PUT /:id/status ---------------------------------------------------
    describe('PUT /api/orders/:id/status', () => {
        async function seedOccupiedOrder() {
            const table = await insertTable(pool, { qr_code: 's-1', status: 'occupied' });
            const order = await insertOrder(pool, { table_id: table.id, status: 'pending', total_amount: 10.0 });
            return { table, order };
        }

        test('advances a non-terminal status without freeing the table', async () => {
            const { table, order } = await seedOccupiedOrder();

            const res = await request(app).put(`/api/orders/${order.id}/status`).send({ status: 'preparing' });

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('preparing');

            const tableRow = await pool.query('SELECT status FROM tables WHERE id = $1', [table.id]);
            expect(tableRow.rows[0].status).toBe('occupied');
        });

        test.each(['served', 'completed', 'cancelled'])(
            'terminal status "%s" frees the table',
            async (status) => {
                const { table, order } = await seedOccupiedOrder();

                const res = await request(app).put(`/api/orders/${order.id}/status`).send({ status });

                expect(res.status).toBe(200);
                expect(res.body.status).toBe(status);

                const tableRow = await pool.query('SELECT status FROM tables WHERE id = $1', [table.id]);
                expect(tableRow.rows[0].status).toBe('available');
            }
        );

        test('returns 404 for an unknown order', async () => {
            const res = await request(app).put('/api/orders/999999/status').send({ status: 'ready' });
            expect(res.status).toBe(404);
        });
    });

    // --- PUT /:id ----------------------------------------------------------
    describe('PUT /api/orders/:id', () => {
        test('updates an existing order', async () => {
            const table = await insertTable(pool, { qr_code: 'u-1' });
            const order = await insertOrder(pool, { table_id: table.id, status: 'pending', total_amount: 5.0 });

            const res = await request(app)
                .put(`/api/orders/${order.id}`)
                .send({ table_id: table.id, status: 'ready', total_amount: 8.5 });

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ready');
            expect(res.body.total_amount).toBe(8.5);

            const dbRow = await pool.query('SELECT status, total_amount FROM orders WHERE id = $1', [order.id]);
            expect(dbRow.rows[0].status).toBe('ready');
        });

        test('returns 404 for an unknown order', async () => {
            const res = await request(app)
                .put('/api/orders/999999')
                .send({ table_id: 1, status: 'ready', total_amount: 1 });
            expect(res.status).toBe(404);
        });
    });

    // --- DELETE /:id -------------------------------------------------------
    describe('DELETE /api/orders/:id', () => {
        test('deletes an order and returns 204', async () => {
            const table = await insertTable(pool, { qr_code: 'd-1' });
            const order = await insertOrder(pool, { table_id: table.id, total_amount: 1.0 });

            const res = await request(app).delete(`/api/orders/${order.id}`);

            expect(res.status).toBe(204);
            const dbRows = await pool.query('SELECT * FROM orders WHERE id = $1', [order.id]);
            expect(dbRows.rows).toHaveLength(0);
        });

        test('returns 404 when deleting an unknown order', async () => {
            const res = await request(app).delete('/api/orders/999999');
            expect(res.status).toBe(404);
        });
    });
});
