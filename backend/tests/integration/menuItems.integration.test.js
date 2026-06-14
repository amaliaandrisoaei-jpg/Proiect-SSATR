import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../app.js';
import { newTestPool, truncateAll } from '../helpers/db.js';
import { insertMenuItem } from '../helpers/fixtures.js';

describe('Menu Items API (integration)', () => {
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

    describe('GET /api/menu_items', () => {
        test('returns [] when empty', async () => {
            const res = await request(app).get('/api/menu_items');
            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });

        test('returns items with numeric prices', async () => {
            await insertMenuItem(pool, { name: 'Pizza', price: 12.5 });
            await insertMenuItem(pool, { name: 'Cola', price: 3.0, category: 'Beverage' });

            const res = await request(app).get('/api/menu_items');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
            expect(res.body[0].price).toBe(12.5);
            expect(typeof res.body[0].price).toBe('number');
        });
    });

    describe('GET /api/menu_items/:id', () => {
        test('returns a single item when found', async () => {
            const item = await insertMenuItem(pool, { name: 'Tart', price: 5.25 });
            const res = await request(app).get(`/api/menu_items/${item.id}`);
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Tart');
            expect(res.body.price).toBe(5.25);
        });

        test('returns 404 for an unknown item', async () => {
            const res = await request(app).get('/api/menu_items/999999');
            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Menu item not found');
        });
    });

    describe('POST /api/menu_items', () => {
        test('creates an item and persists it', async () => {
            const payload = {
                name: 'Burger',
                description: 'Beef burger',
                price: 9.99,
                category: 'Main Course',
                image_url: null,
                is_available: true,
            };

            const res = await request(app).post('/api/menu_items').send(payload);

            expect(res.status).toBe(201);
            expect(res.body.name).toBe('Burger');
            expect(res.body.price).toBe(9.99);

            const dbRows = await pool.query('SELECT * FROM menu_items WHERE id = $1', [res.body.id]);
            expect(dbRows.rows).toHaveLength(1);
            expect(parseFloat(dbRows.rows[0].price)).toBe(9.99);
        });
    });

    describe('PUT /api/menu_items/:id', () => {
        test('updates an existing item', async () => {
            const item = await insertMenuItem(pool, { name: 'Old', price: 1.0 });

            const res = await request(app).put(`/api/menu_items/${item.id}`).send({
                name: 'New',
                description: 'updated',
                price: 2.5,
                category: 'Dessert',
                image_url: null,
                is_available: false,
            });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('New');
            expect(res.body.is_available).toBe(false);

            const dbRows = await pool.query('SELECT name, is_available FROM menu_items WHERE id = $1', [item.id]);
            expect(dbRows.rows[0].name).toBe('New');
            expect(dbRows.rows[0].is_available).toBe(false);
        });

        test('returns 404 for an unknown item', async () => {
            const res = await request(app).put('/api/menu_items/999999').send({
                name: 'x', description: null, price: 1, category: 'c', image_url: null, is_available: true,
            });
            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/menu_items/:id', () => {
        test('deletes an item and returns 204', async () => {
            const item = await insertMenuItem(pool, { name: 'Doomed', price: 1.0 });
            const res = await request(app).delete(`/api/menu_items/${item.id}`);
            expect(res.status).toBe(204);
            const dbRows = await pool.query('SELECT * FROM menu_items WHERE id = $1', [item.id]);
            expect(dbRows.rows).toHaveLength(0);
        });

        test('returns 404 for an unknown item', async () => {
            const res = await request(app).delete('/api/menu_items/999999');
            expect(res.status).toBe(404);
        });
    });
});
