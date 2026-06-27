# Automated testing system

This document describes the automated testing system built for the restaurant
management application, the foundation of the dissertation *"Integration of
automated testing in CI/CD pipelines and its impact on software quality."*

Every number in this document comes from an **actual local run** (see the dates in
git history); reproduce them with the commands below.

## 1. Strategy — the test pyramid + container isolation

```
                 ▲  fewer, slower, higher-fidelity
   E2E (3)       │   Playwright vs the full Dockerised stack (real browser, real DB,
                 │   real Socket.IO) — the showcase real-time customer↔kitchen flow
   WebSocket (1) │   real Socket.IO server + socket.io-client over a real DB
   Integration   │   Supertest -> Express -> services -> models -> real Postgres
     (5 modules) │   (HTTP status + body + resulting DB state)
   Frontend (7)  │   Vitest + React Testing Library (jsdom), socket.io & fetch mocked
   Unit (5)      │   Jest, models mocked — pure service logic, fast & deterministic
                 ▼  more, faster, isolated
        + Mutation testing (Stryker) measuring how *effective* the unit tests are.
```

Two design choices anchor the system:

- **Docker-based test isolation (Testcontainers).** The DB-backed backend tests run
  against **one ephemeral PostgreSQL container** that Jest starts, migrates and tears
  down automatically. There is no shared/hand-maintained test database: **Docker is
  the only prerequisite**, which makes the suite reproducible on any machine and on CI.
- **Effectiveness over coverage.** Line coverage only proves a line *ran*. Stryker
  mutation testing proves the lines are actually *asserted* — and it found 8 real gaps
  that 93% line coverage hid (see [mutation-testing.md](mutation-testing.md)).

## 2. Architecture of the test setup

### Backend (ESM, Jest 30, native `--experimental-vm-modules`)

- [`tests/globalSetup.js`](../../backend/tests/globalSetup.js) starts one
  `postgres:16-alpine` container (`@testcontainers/postgresql`), runs the
  `node-pg-migrate` migrations against it, sanity-checks the schema, and persists the
  connection URI to a file. [`tests/globalTeardown.js`](../../backend/tests/globalTeardown.js)
  stops the container.
- **The Jest-ESM gotcha:** `process.env` set in `globalSetup` does not reliably reach
  worker processes under ESM. Solved robustly by writing the URI to disk in
  `globalSetup` and re-loading it as `DATABASE_URL` in
  [`tests/setupEnv.js`](../../backend/tests/setupEnv.js) (a `setupFiles` entry that runs
  inside every worker).
- **Config split** (shared base in [`jest.config.js`](../../backend/jest.config.js)):
  - `jest.unit.config.js` — `tests/unit/**`, no container, fast (for Stryker + the CI unit stage).
  - `jest.integration.config.js` — `tests/integration/**` + `tests/websocket/**`, with the container.
  - the default `jest.config.js` — everything, with coverage (V8 provider) and enforced
    thresholds (lines/statements ≥ 80, branches ≥ 70, functions ≥ 80); `server.js` excluded.
- Helpers: [`tests/helpers/db.js`](../../backend/tests/helpers/db.js) (pool + `truncateAll`),
  [`tests/helpers/fixtures.js`](../../backend/tests/helpers/fixtures.js) (per-test fixtures).
  Production Express + Socket.IO wiring lives in
  [`createServer.js`](../../backend/createServer.js), shared by `server.js` and the
  websocket tests so both exercise identical wiring.

### Frontend (Vitest + React Testing Library)

- [`vitest.config.ts`](../../frontend/vitest.config.ts): jsdom env, V8 coverage.
  `socket.io-client` and `fetch` are mocked; a controllable fake socket
  ([`src/test/mockSocket.ts`](../../frontend/src/test/mockSocket.ts)) lets a test push
  server-style events into a component and assert the live UI update.

### End-to-end (Playwright + Docker Compose)

- [`docker-compose.e2e.yml`](../../docker-compose.e2e.yml): a self-contained stack
  (DB healthcheck → migrate + seed → API healthcheck → frontend) on non-conflicting
  host ports (frontend `5174`, API `3001`), brought up with `--wait`.
- [`e2e/`](../../e2e): Playwright config + a `global-setup` readiness gate. Tests run
  serially against the live stack and create their own fixtures via the API so they are
  idempotent across runs.

## 3. How to run each layer

> Prerequisite: Docker running. Node 22+.

```bash
# ---- Backend (cd backend) ----
npm ci
npm run test:unit          # fast unit tests, no DB
npm run test:integration   # integration + websocket vs an ephemeral Postgres container
npm test                   # full suite (Docker is the ONLY prerequisite — no DB needed)
npm run test:coverage      # full suite + coverage (enforces thresholds) -> backend/coverage
npm run test:mutation      # Stryker mutation testing -> backend/reports/mutation

# ---- Frontend (cd frontend) ----
npm ci
npm test                   # Vitest run
npm run test:coverage      # + coverage -> frontend/coverage

# ---- End-to-end (cd e2e) ----
npm ci
npx playwright install --with-deps chromium
npm run stack:up           # docker compose up -d --build --wait
npm test                   # Playwright vs the live stack
npm run stack:down
# or, all-in-one: npm run e2e
```

## 4. Results summary (real numbers)

Measured locally (Docker 29, Node 24; CI uses Node 22).

| Layer | Tooling | Scope | Coverage / score | Approx. time |
|------|---------|-------|------------------|--------------|
| Backend **unit** | Jest (models mocked) | 55 tests, 5 suites | — | ~0.9 s |
| Backend **integration** (HTTP) | Jest + Supertest + Testcontainers | 5 modules, all endpoints | status + body + DB state | *(part of full)* |
| Backend **websocket** | Jest + socket.io-client + Testcontainers | 1 suite, incl. polling transport | events, ordering, multi-client | *(part of full)* |
| Backend **full** (coverage gate) | Jest, V8 coverage | **108 tests, 11 suites** | **93.6% stmt · 88.2% branch · 100% func** | ~10 s |
| **Mutation** | Stryker (command runner) | 154 mutants, `services/**` | **100% mutation score** | ~24 s |
| **Frontend** unit/component | Vitest + RTL (jsdom) | **32 tests, 7 files** | 78.6% stmt · 79.9% line (components under test ≈ 76–86%) | ~2 s |
| **E2E** | Playwright + Docker stack | **3 scenarios** (real-time + menu + manager) | real-time customer↔kitchen verified | ~4 s run (+ image build) |

**Totals: 143 automated tests** (108 backend + 32 frontend + 3 E2E) across the pyramid,
plus 154 mutants and a CI pipeline of 6 staged jobs.

### Defects caught by the suite

Five real defects were found and fixed while building the tests — full write-ups in
[findings.md](findings.md):

| ID | Layer that caught it | Defect | Fix |
|----|----------------------|--------|-----|
| DEF-001 | WebSocket integration | fire-and-forget `emitStatistics()` → unhandled rejection | guard with `.catch` |
| DEF-002 | Unit + integration | `createOrder` accepted an empty cart (corrupt occupied-table state) | reject empty carts |
| DEF-003 | Integration | `POST /api/order_items` always 500 (model needed a tx client) | default to pool |
| DEF-004 | Unit | `tableStatusUpdate` emitted before COMMIT (notifies rolled-back state) | emit after commit |
| DEF-005 | **E2E (real browser)** | Socket.IO polling double-response crashed the server on every browser connect | wire Express first, then attach Socket.IO |

DEF-005 is the headline result for the thesis: a process-crashing defect invisible to
unit, integration *and* mutation testing, surfaced only by a browser-level E2E test
exercising the real (polling) transport.

## 5. CI/CD (GitHub Actions)

[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) runs on every push and PR:

```
lint ─┬─ backend-unit ──────────────┐
      ├─ backend-integration+cov ────┼─ build-images ─ e2e
      └─ frontend-unit+cov ──────────┘
```

- Coverage thresholds and any failing test fail the build.
- Backend/frontend coverage and the Playwright report are uploaded as artifacts.
- Testcontainers works out of the box on `ubuntu-latest` (Docker is present).

[`.github/workflows/mutation.yml`](../../.github/workflows/mutation.yml) runs Stryker as
a **separate** job (manual `workflow_dispatch` + weekly schedule) since it is slower;
the mutation report is uploaded and Stryker's `break` threshold gates it.
