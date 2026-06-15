import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { io as Client } from 'socket.io-client';
import request from 'supertest';
import { createServer } from '../../createServer.js';
import { newTestPool, truncateAll } from '../helpers/db.js';
import { insertTable, insertMenuItem, insertOrder } from '../helpers/fixtures.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Connects a fresh client (websocket transport by default) and resolves once connected. */
function connectClient(url, transports = ['websocket']) {
    return new Promise((resolve, reject) => {
        const socket = new Client(url, { transports, forceNew: true });
        const timer = setTimeout(() => reject(new Error('client connect timeout')), 4000);
        socket.once('connect', () => {
            clearTimeout(timer);
            resolve(socket);
        });
        socket.once('connect_error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

/** Records every occurrence of the given events, in arrival order. */
function collectEvents(socket, events) {
    const received = [];
    const handlers = {};
    for (const event of events) {
        handlers[event] = (payload) => received.push({ event, payload });
        socket.on(event, handlers[event]);
    }
    return {
        received,
        stop() {
            for (const event of events) socket.off(event, handlers[event]);
        },
        waitForCount(n, timeoutMs = 4000) {
            return new Promise((resolve, reject) => {
                const start = Date.now();
                const iv = setInterval(() => {
                    if (received.length >= n) {
                        clearInterval(iv);
                        resolve(received);
                    } else if (Date.now() - start > timeoutMs) {
                        clearInterval(iv);
                        reject(new Error(`Timed out: got ${received.length}/${n} of [${events}]`));
                    }
                }, 10);
            });
        },
    };
}

/**
 * WebSocket integration tests — a real Socket.IO server wired to a real app over
 * the ephemeral Testcontainers database, with real socket.io-client consumers.
 */
describe('Order WebSocket events (integration)', () => {
    let pool;
    let io;
    let server;
    let app;
    let url;
    const clients = [];

    beforeAll(async () => {
        pool = newTestPool();
        // Use the SAME wiring as production (server.js) so this suite also guards
        // the Express + Socket.IO request-handling order (DEF-005).
        ({ server, io, app } = createServer(pool));

        await new Promise((resolve) => {
            server.listen(0, () => {
                url = `http://localhost:${server.address().port}`;
                resolve();
            });
        });
    });

    afterAll(async () => {
        io.close();
        await new Promise((resolve) => server.close(resolve));
        await pool.end();
    });

    beforeEach(async () => {
        await truncateAll(pool);
    });

    afterEach(() => {
        while (clients.length) {
            const c = clients.pop();
            c.disconnect();
        }
    });

    async function newClient() {
        const c = await connectClient(url);
        clients.push(c);
        return c;
    }

    test('order creation emits newOrder then tableStatusUpdate with correct payloads', async () => {
        const table = await insertTable(pool, { qr_code: 'ws-create', status: 'available' });
        const menuItem = await insertMenuItem(pool, { name: 'WS Pizza', price: 15.0 });

        const client = await newClient();
        const collector = collectEvents(client, ['newOrder', 'tableStatusUpdate']);

        await request(app)
            .post('/api/orders')
            .send({ table_id: table.id, items: [{ menu_item_id: menuItem.id, quantity: 1 }] })
            .expect(201);

        await collector.waitForCount(2);
        collector.stop();

        // Ordering: newOrder is emitted before tableStatusUpdate.
        expect(collector.received.map((e) => e.event)).toEqual(['newOrder', 'tableStatusUpdate']);

        const order = collector.received[0].payload;
        expect(order).toMatchObject({ table_id: table.id, status: 'pending' });
        expect(typeof order.id).toBe('number');
        expect(order.total_amount).toBe(15.0);

        const tableUpdate = collector.received[1].payload;
        expect(tableUpdate).toMatchObject({ id: table.id, status: 'occupied' });
    }, 10000);

    test('a non-terminal status change emits orderStatusUpdate but not tableStatusUpdate', async () => {
        const table = await insertTable(pool, { qr_code: 'ws-prep', status: 'occupied' });
        const order = await insertOrder(pool, { table_id: table.id, status: 'pending', total_amount: 10.0 });

        const client = await newClient();
        const collector = collectEvents(client, ['orderStatusUpdate', 'tableStatusUpdate']);

        await request(app).put(`/api/orders/${order.id}/status`).send({ status: 'preparing' }).expect(200);

        await collector.waitForCount(1);
        await delay(150); // allow any (unwanted) extra events to arrive
        collector.stop();

        const orderEvents = collector.received.filter((e) => e.event === 'orderStatusUpdate');
        const tableEvents = collector.received.filter((e) => e.event === 'tableStatusUpdate');
        expect(orderEvents).toHaveLength(1);
        expect(orderEvents[0].payload).toMatchObject({ id: order.id, status: 'preparing' });
        expect(Array.isArray(orderEvents[0].payload.items)).toBe(true);
        expect(tableEvents).toHaveLength(0);
    }, 10000);

    test.each(['served', 'completed', 'cancelled'])(
        'terminal status "%s" emits orderStatusUpdate and frees the table',
        async (status) => {
            const table = await insertTable(pool, { qr_code: `ws-${status}`, status: 'occupied' });
            const order = await insertOrder(pool, { table_id: table.id, status: 'ready', total_amount: 22.0 });

            const client = await newClient();
            const collector = collectEvents(client, ['orderStatusUpdate', 'tableStatusUpdate']);

            await request(app).put(`/api/orders/${order.id}/status`).send({ status }).expect(200);

            await collector.waitForCount(2);
            collector.stop();

            const orderEvent = collector.received.find((e) => e.event === 'orderStatusUpdate');
            const tableEvent = collector.received.find((e) => e.event === 'tableStatusUpdate');
            expect(orderEvent.payload).toMatchObject({ id: order.id, status });
            expect(tableEvent.payload).toMatchObject({ id: table.id, status: 'available' });
        },
        10000
    );

    test('newOrder is broadcast to every connected client', async () => {
        const table = await insertTable(pool, { qr_code: 'ws-multi', status: 'available' });
        const menuItem = await insertMenuItem(pool, { name: 'Shared', price: 5.0 });

        const clientA = await newClient();
        const clientB = await newClient();
        const a = collectEvents(clientA, ['newOrder']);
        const b = collectEvents(clientB, ['newOrder']);

        await request(app)
            .post('/api/orders')
            .send({ table_id: table.id, items: [{ menu_item_id: menuItem.id, quantity: 2 }] })
            .expect(201);

        await Promise.all([a.waitForCount(1), b.waitForCount(1)]);
        a.stop();
        b.stop();

        expect(a.received[0].payload.id).toBe(b.received[0].payload.id);
        expect(a.received[0].payload.total_amount).toBe(10.0);
    }, 10000);

    // DEF-005 regression guard: the browser default transport is HTTP long-polling.
    // With the previous wiring this request path double-responded and crashed the
    // server with ERR_HTTP_HEADERS_SENT.
    test('a polling-transport client connects and receives newOrder without crashing the server', async () => {
        const table = await insertTable(pool, { qr_code: 'ws-polling', status: 'available' });
        const menuItem = await insertMenuItem(pool, { name: 'Poll Pie', price: 9.0 });

        const pollingClient = await connectClient(url, ['polling']);
        clients.push(pollingClient);
        const collector = collectEvents(pollingClient, ['newOrder']);

        await request(app)
            .post('/api/orders')
            .send({ table_id: table.id, items: [{ menu_item_id: menuItem.id, quantity: 1 }] })
            .expect(201);

        await collector.waitForCount(1);
        collector.stop();

        expect(pollingClient.io.engine.transport.name).toBe('polling');
        expect(collector.received[0].payload.total_amount).toBe(9.0);
    }, 10000);
});
