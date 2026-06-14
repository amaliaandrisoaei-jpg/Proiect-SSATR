import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../app.js';
import { newTestPool, truncateAll } from '../helpers/db.js';
import { insertTable } from '../helpers/fixtures.js';

describe('Tables API (integration)', () => {
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

    describe('GET /api/tables', () => {
        test('returns [] when empty', async () => {
            const res = await request(app).get('/api/tables');
            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });

        test('lists tables ordered by id', async () => {
            await insertTable(pool, { qr_code: 't-a', status: 'available' });
            await insertTable(pool, { qr_code: 't-b', status: 'occupied' });

            const res = await request(app).get('/api/tables');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
            expect(res.body[0].qr_code).toBe('t-a');
            expect(res.body[1].status).toBe('occupied');
        });
    });

    describe('GET /api/tables/:id', () => {
        test('returns a single table when found', async () => {
            const table = await insertTable(pool, { qr_code: 't-1' });
            const res = await request(app).get(`/api/tables/${table.id}`);
            expect(res.status).toBe(200);
            expect(res.body.qr_code).toBe('t-1');
        });

        test('returns 404 for an unknown table', async () => {
            const res = await request(app).get('/api/tables/999999');
            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Table not found');
        });
    });

    describe('POST /api/tables', () => {
        test('creates a table and persists it', async () => {
            const res = await request(app).post('/api/tables').send({ qr_code: 'new-qr', status: 'available' });

            expect(res.status).toBe(201);
            expect(res.body.qr_code).toBe('new-qr');
            expect(res.body.status).toBe('available');

            const dbRows = await pool.query('SELECT * FROM tables WHERE id = $1', [res.body.id]);
            expect(dbRows.rows).toHaveLength(1);
        });
    });

    describe('PUT /api/tables/:id', () => {
        test('updates an existing table', async () => {
            const table = await insertTable(pool, { qr_code: 'before', status: 'available' });

            const res = await request(app)
                .put(`/api/tables/${table.id}`)
                .send({ qr_code: 'after', status: 'occupied' });

            expect(res.status).toBe(200);
            expect(res.body.qr_code).toBe('after');
            expect(res.body.status).toBe('occupied');

            const dbRows = await pool.query('SELECT qr_code, status FROM tables WHERE id = $1', [table.id]);
            expect(dbRows.rows[0]).toMatchObject({ qr_code: 'after', status: 'occupied' });
        });

        test('returns 404 for an unknown table', async () => {
            const res = await request(app).put('/api/tables/999999').send({ qr_code: 'x', status: 'available' });
            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/tables/:id', () => {
        test('deletes a table and returns 204', async () => {
            const table = await insertTable(pool, { qr_code: 'gone' });
            const res = await request(app).delete(`/api/tables/${table.id}`);
            expect(res.status).toBe(204);
            const dbRows = await pool.query('SELECT * FROM tables WHERE id = $1', [table.id]);
            expect(dbRows.rows).toHaveLength(0);
        });

        test('returns 404 for an unknown table', async () => {
            const res = await request(app).delete('/api/tables/999999');
            expect(res.status).toBe(404);
        });
    });
});
