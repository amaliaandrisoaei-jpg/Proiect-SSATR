import { jest, describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import http from 'http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import pg from 'pg';
import { createApp } from '../app.js';
import request from 'supertest';

const { Pool } = pg;

describe('Socket Integration Tests', () => {
    let pool;
    let io;
    let server;
    let clientSocket;
    let app;
    let port;

    beforeAll((done) => {
        console.log('Connecting to DB:', process.env.DATABASE_URL);
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });

        server = http.createServer();
        io = new Server(server);
        app = createApp(pool, io);
        server.on('request', app);

        server.listen(0, () => {
            port = server.address().port;
            console.log('Server listening on port:', port);
            clientSocket = new Client(`http://localhost:${port}`, {
                transports: ['websocket'],
                forceNew: true
            });
            clientSocket.on('connect', () => {
                console.log('Client connected to server');
                done();
            });
            clientSocket.on('connect_error', (err) => {
                console.error('Connection error:', err);
                done(err);
            });
        });
    }, 10000);

    afterAll(async () => {
        console.log('Cleaning up...');
        if (clientSocket) clientSocket.close();
        if (io) io.close();
        if (server) server.close();
        if (pool) await pool.end();
    });

    beforeEach(async () => {
        await pool.query('TRUNCATE TABLE order_items, orders, tables, menu_items RESTART IDENTITY CASCADE');
    });

    test('Creating an order should emit newOrder and tableStatusUpdate events', (done) => {
        console.log('Starting test...');
        // Prepare data in DB
        const setup = async () => {
            await pool.query("INSERT INTO tables (qr_code, status) VALUES ('table-S1', 'available')");
            const tableResult = await pool.query("SELECT id FROM tables WHERE qr_code = 'table-S1'");
            const tableId = tableResult.rows[0].id;

            await pool.query("INSERT INTO menu_items (name, price, category) VALUES ('Socket Pizza', 15.00, 'Food')");
            const menuResult = await pool.query("SELECT id FROM menu_items WHERE name = 'Socket Pizza'");
            const menuItemId = menuResult.rows[0].id;

            return { tableId, menuItemId };
        };

        setup().then(({ tableId, menuItemId }) => {
            console.log('Setup done, triggering order...');
            let eventsReceived = 0;
            const expectedEvents = 2;

            clientSocket.on('newOrder', (order) => {
                console.log('Received newOrder event');
                expect(order.total_amount).toBe(15.00);
                eventsReceived++;
                if (eventsReceived === expectedEvents) {
                    done();
                }
            });

            clientSocket.on('tableStatusUpdate', (table) => {
                console.log('Received tableStatusUpdate event');
                expect(table.id).toBe(tableId);
                expect(table.status).toBe('occupied');
                eventsReceived++;
                if (eventsReceived === expectedEvents) {
                    done();
                }
            });

            request(app)
                .post('/api/orders')
                .send({
                    table_id: tableId,
                    items: [{ menu_item_id: menuItemId, quantity: 1 }]
                })
                .expect(201)
                .end((err) => {
                    if (err) {
                        console.error('POST /api/orders failed:', err);
                        done(err);
                    }
                    console.log('POST /api/orders successful');
                });
        });
    }, 10000);
});
