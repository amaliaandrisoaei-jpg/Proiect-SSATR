import { jest, describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import pg from 'pg';
import { createApp } from '../app.js';

const { Pool } = pg;

describe('Order Integration Tests', () => {
    let pool;
    let app;

    beforeAll(async () => {
        // Safety check
        if (!process.env.DATABASE_URL.includes('restaurant_test')) {
            throw new Error('Integration tests must run against the restaurant_test database!');
        }

        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });
        
        app = createApp(pool);
    });

    afterAll(async () => {
        await pool.end();
    });

    beforeEach(async () => {
        await pool.query('TRUNCATE TABLE order_items, orders, tables, menu_items RESTART IDENTITY CASCADE');
    });

    test('POST /api/orders should create a new order and update table status', async () => {
        // 1. Seed necessary data
        await pool.query("INSERT INTO tables (qr_code, status) VALUES ('table-1', 'available')");
        const tableResult = await pool.query("SELECT id FROM tables WHERE qr_code = 'table-1'");
        const tableId = tableResult.rows[0].id;

        await pool.query("INSERT INTO menu_items (name, price, category) VALUES ('Pizza', 12.50, 'Food')");
        const menuResult = await pool.query("SELECT id FROM menu_items WHERE name = 'Pizza'");
        const menuItemId = menuResult.rows[0].id;

        // 2. Perform Request
        const response = await request(app)
            .post('/api/orders')
            .send({
                table_id: tableId,
                items: [
                    { menu_item_id: menuItemId, quantity: 2 }
                ]
            });

        // 3. Assert Response
        expect(response.status).toBe(201);
        expect(response.body.total_amount).toBe(25.00);
        expect(response.body.status).toBe('pending');

        // 4. Verify Database state
        const updatedTable = await pool.query('SELECT status FROM tables WHERE id = $1', [tableId]);
        expect(updatedTable.rows[0].status).toBe('occupied');

        const orderItems = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [response.body.id]);
        expect(orderItems.rows.length).toBe(1);
        expect(parseFloat(orderItems.rows[0].price)).toBe(12.50);
    });

    test('POST /api/orders should fail for non-existent table', async () => {
        const response = await request(app)
            .post('/api/orders')
            .send({
                table_id: 9999,
                items: []
            });

        // Depending on your error handling, it might be 500 or 404
        expect(response.status).toBe(500);
    });
});
