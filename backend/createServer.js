import http from 'http';
import { Server } from 'socket.io';
import { createApp } from './app.js';

/**
 * Builds the HTTP server with Express as THE request handler and Socket.IO bound
 * to the same server in the correct order.
 *
 * Order matters: Socket.IO must attach to a server that already has Express as its
 * request listener, otherwise Express ends up as a *second*, parallel listener and
 * Socket.IO's polling transport produces a double HTTP response that crashes the
 * process with ERR_HTTP_HEADERS_SENT (see docs/testing/findings.md DEF-005).
 *
 * Shared by server.js (production) and the websocket tests so both exercise the
 * exact same wiring.
 *
 * @param {import('pg').Pool} pool
 * @param {import('socket.io').ServerOptions} [ioOptions]
 * @returns {{ server: import('http').Server, io: Server, app: import('express').Express }}
 */
export function createServer(pool, ioOptions = {}) {
    const io = new Server(ioOptions);
    const app = createApp(pool, io);
    const server = http.createServer(app);
    io.attach(server);
    return { server, io, app };
}
