import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../app.js';
import { newTestPool, truncateAll } from '../helpers/db.js';
import { insertTable, insertMenuItem, insertOrder, insertOrderItem } from '../helpers/fixtures.js';

describe('Order Items API (integration)', () => {
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

    /** Seed the parent rows an order_item needs (table -> order, menu_item). */
    async function seedParents() {
        const table = await insertTable(pool, { qr_code: `oi-${Math.random()}` });
        const order = await insertOrder(pool, { table_id: table.id, total_amount: 0 });
        const menuItem = await insertMenuItem(pool, { name: 'Item', price: 4.0 });
        return { order, menuItem };
    }

    describe('GET /api/order_items', () => {
        test('returns [] when empty', async () => {
            const res = await request(app).get('/api/order_items');
            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });

        test('lists order items', async () => {
            const { order, menuItem } = await seedParents();
            await insertOrderItem(pool, { order_id: order.id, menu_item_id: menuItem.id, quantity: 2, price: 4.0 });

            const res = await request(app).get('/api/order_items');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].quantity).toBe(2);
        });
    });

    describe('GET /api/order_items/:id', () => {
        test('returns a single order item when found', async () => {
            const { order, menuItem } = await seedParents();
            const item = await insertOrderItem(pool, { order_id: order.id, menu_item_id: menuItem.id, quantity: 1, price: 4.0 });

            const res = await request(app).get(`/api/order_items/${item.id}`);

            expect(res.status).toBe(200);
            expect(res.body.id).toBe(item.id);
        });

        test('returns 404 for an unknown order item', async () => {
            const res = await request(app).get('/api/order_items/999999');
            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Order item not found');
        });
    });

    describe('POST /api/order_items', () => {
        test('creates an order item and persists it', async () => {
            const { order, menuItem } = await seedParents();

            const res = await request(app).post('/api/order_items').send({
                order_id: order.id,
                menu_item_id: menuItem.id,
                quantity: 3,
                price: 4.0,
            });

            expect(res.status).toBe(201);
            expect(res.body.quantity).toBe(3);

            const dbRows = await pool.query('SELECT * FROM order_items WHERE id = $1', [res.body.id]);
            expect(dbRows.rows).toHaveLength(1);
            expect(dbRows.rows[0].quantity).toBe(3);
        });
    });

    describe('PUT /api/order_items/:id', () => {
        test('updates an existing order item', async () => {
            const { order, menuItem } = await seedParents();
            const item = await insertOrderItem(pool, { order_id: order.id, menu_item_id: menuItem.id, quantity: 1, price: 4.0 });

            const res = await request(app).put(`/api/order_items/${item.id}`).send({
                order_id: order.id,
                menu_item_id: menuItem.id,
                quantity: 5,
                price: 4.0,
                notes: 'extra cheese',
            });

            expect(res.status).toBe(200);
            expect(res.body.quantity).toBe(5);
            expect(res.body.notes).toBe('extra cheese');
        });

        test('returns 404 for an unknown order item', async () => {
            const res = await request(app).put('/api/order_items/999999').send({
                order_id: 1, menu_item_id: 1, quantity: 1, price: 1, notes: null,
            });
            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/order_items/:id', () => {
        test('deletes an order item and returns 204', async () => {
            const { order, menuItem } = await seedParents();
            const item = await insertOrderItem(pool, { order_id: order.id, menu_item_id: menuItem.id, quantity: 1, price: 4.0 });

            const res = await request(app).delete(`/api/order_items/${item.id}`);

            expect(res.status).toBe(204);
            const dbRows = await pool.query('SELECT * FROM order_items WHERE id = $1', [item.id]);
            expect(dbRows.rows).toHaveLength(0);
        });

        test('returns 404 for an unknown order item', async () => {
            const res = await request(app).delete('/api/order_items/999999');
            expect(res.status).toBe(404);
        });
    });
});
