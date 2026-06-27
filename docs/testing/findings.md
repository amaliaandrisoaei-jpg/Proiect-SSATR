# Findings — defects caught by the automated test suite

This log records **real defects** discovered while building the automated testing
system (see `TESTING.md`). Each entry follows: *symptom → root cause → fix → the
test that now guards it*. These are concrete "defects caught by automated testing"
data points for the dissertation.

> Convention: a test was **never weakened to make it pass**. When a test exposed a
> real bug, the production code was fixed and the fix is described here.

---

## DEF-001 — Unhandled promise rejection from fire-and-forget `emitStatistics()`

- **Layer that caught it:** WebSocket integration test (`tests/websocket/orders.socket.test.js`), surfaced while migrating to the Testcontainers DB.
- **File:** `backend/services/OrderService.js` (`createOrder` and `updateOrderStatus`).
- **Symptom:** The order-creation test passed its assertions, yet the whole suite was reported as **failed** with `Cannot use a pool after calling end on the pool`, thrown from `StatisticsModel.getRevenueStats`.
- **Root cause:** Both `createOrder` and `updateOrderStatus` called `this.statisticsService.emitStatistics()` **without awaiting it and without a `.catch`**. The broadcast keeps querying the DB after the HTTP response is returned. Any rejection from that detached promise becomes an **unhandled rejection**. In the test, `afterAll` closes the pool while the query is in flight; in production the same pattern means *any* transient DB error during the statistics broadcast is silent and can terminate the Node process (unhandled rejections).
- **Fix:** Attach a `.catch` that logs and swallows the broadcast failure, so the best-effort statistics update can never crash the request path or the process:
  ```js
  this.statisticsService.emitStatistics().catch((err) => {
      console.error('Failed to emit statistics update:', err);
  });
  ```
- **Guarded by:** the WebSocket suite now runs clean; a dedicated unit test (`OrderService` › *"emitStatistics rejection does not reject createOrder"*) asserts the rejection is swallowed.

## DEF-002 — `createOrder` accepts an empty cart and corrupts table state

- **Layer that caught it:** unit + integration tests for `OrderService.createOrder`.
- **File:** `backend/services/OrderService.js` (`createOrder`).
- **Symptom:** Calling `createOrder(tableId, [])` (empty `items`) committed an order with `total_amount = 0` *and* flipped the table to `occupied`, broadcasting `newOrder`/`tableStatusUpdate` for a non-order.
- **Root cause:** The item loop simply iterated zero times; there was no guard against an empty cart. The React frontend (`OrderCart`) blocks this client-side, so the backend invariant was never enforced — any direct API call or frontend regression produced corrupt state (a table marked occupied by an empty order).
- **Fix:** Reject empty carts at the top of `createOrder` before opening a transaction:
  ```js
  if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Cannot create an order with no items.');
  }
  ```
- **Guarded by:** `OrderService` unit test *"createOrder rejects an empty cart"* and integration test *"POST /api/orders with empty items returns an error and does not occupy the table"*.

## DEF-003 — `POST /api/order_items` always returns 500 (model requires a tx client the service never passes)

- **Layer that caught it:** integration test (`tests/integration/orderItems.integration.test.js` › *"creates an order item and persists it"*).
- **File:** `backend/models/OrderItemModel.js` (`create`).
- **Symptom:** Every `POST /api/order_items` request returned **500** with `TypeError: Cannot read properties of undefined (reading 'query')`. The endpoint was completely non-functional.
- **Root cause:** `OrderItemModel.create(data, client)` used `client.query(...)` unconditionally. That is fine for the transactional path (`OrderService.createOrder` passes a `client`), but `OrderItemService.createOrderItem(data)` calls `this.orderItemModel.create(data)` with **no client**, so `client` was `undefined`.
- **Fix:** Default to the pool when no client is supplied — the exact `client || this.pool` pattern already used by `findById`, `findByOrderId` and `TableModel.updateStatus`:
  ```js
  async create(data, client = null) {
      const executor = client || this.pool;
      ...
  }
  ```
- **Guarded by:** the order-items integration suite (POST/GET/PUT/DELETE), all now green.

## DEF-004 — `tableStatusUpdate` emitted before COMMIT (clients notified of rolled-back state)

- **Layer that caught it:** `OrderService` unit test (*"does NOT emit tableStatusUpdate when COMMIT fails on a terminal status"*).
- **File:** `backend/services/OrderService.js` (`updateOrderStatus`).
- **Symptom:** On a terminal status (`served`/`completed`/`cancelled`), `tableStatusUpdate` was emitted **inside** the transaction, *before* `COMMIT`, whereas `orderStatusUpdate` was emitted *after* `COMMIT`. If the commit failed and the transaction rolled back, connected clients had already been told the table was `available` — a broadcast of state that never durably existed (and inconsistent with the order event).
- **Root cause:** the `io.emit('tableStatusUpdate', …)` call sat in the terminal-status branch ahead of `await client.query('COMMIT')`.
- **Fix:** capture the freed table, COMMIT first, then emit both events together only on a durable commit:
  ```js
  let freedTable = null;
  if (['served','completed','cancelled'].includes(status)) {
      freedTable = await this.tableModel.updateStatus(resultOrder.table_id, 'available', client);
  }
  await client.query('COMMIT');
  if (this.io) {
      if (freedTable) this.io.emit('tableStatusUpdate', freedTable);
      this.io.emit('orderStatusUpdate', resultOrder);
      ...
  }
  ```
- **Note:** event *names* and payloads are unchanged, so the frontend contract (`tableStatusUpdate`, `orderStatusUpdate`) is preserved; only the emit timing moved after the commit.
- **Guarded by:** the unit test above plus the websocket suite asserting both events still fire on a terminal status.

## DEF-005 — server crashes on every browser Socket.IO connection (polling double-response)

- **Layer that caught it:** Playwright **E2E** (`e2e/tests/realtime-order.spec.ts`) — the first test that connects with a *real browser*. The backend container exited with `ERR_HTTP_HEADERS_SENT`.
- **File:** `backend/server.js` (server/Socket.IO wiring).
- **Symptom:** As soon as a browser opened a Socket.IO connection the API process crashed:
  `Error [ERR_HTTP_HEADERS_SENT]: Cannot write headers after they are sent to the client` thrown from `engine.io .../transports/polling.js`. In Docker the container then exited (1).
- **Root cause:** `server.js` did
  ```js
  const server = http.createServer();
  const io = new Server(server);      // engine.io captures the server's request listeners NOW (there are none)
  const app = createApp(pool, io);
  server.on('request', app);          // Express added as a SECOND, parallel 'request' listener
  ```
  Socket.IO captures the existing `request` listeners *at attach time*. Because `io` attached before Express was added, Express became an independent second listener. For a **polling** transport request (`/socket.io/?...`), engine.io wrote the response **and** Express also ran (404) and tried to write again → headers-already-sent → crash. The websocket integration tests masked this because they forced `transports: ['websocket']`; a real browser **defaults to HTTP long-polling** before upgrading, so it crashed immediately. The deployed app would have crashed on the first client.
- **Fix:** make Express *the* request handler first, then bind Socket.IO to that server. Extracted into `backend/createServer.js` so production and tests share identical wiring:
  ```js
  const io = new Server(ioOptions);     // detached
  const app = createApp(pool, io);
  const server = http.createServer(app); // Express is THE request listener
  io.attach(server);                     // engine.io now captures Express and routes correctly
  ```
- **Guarded by:** the E2E real-time scenario (real browser, polling→websocket) **and** a new integration test *"a polling-transport client connects and receives newOrder without crashing the server"* that forces `transports: ['polling']` against the shared `createServer` wiring.
- **Thesis note:** a textbook case of the test pyramid paying off — a defect invisible to unit, integration (as originally written) and even line/mutation coverage, surfaced only by a browser-level E2E exercising the real transport.

<!-- New findings are appended below as they are discovered. -->
