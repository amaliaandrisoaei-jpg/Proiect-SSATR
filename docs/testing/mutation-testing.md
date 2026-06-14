# Mutation testing (Stryker)

Mutation testing measures **test effectiveness** rather than mere code coverage.
Stryker introduces small faults ("mutants") into the production code — flipping
conditionals, swapping operators, emptying blocks, changing literals — and re-runs
the tests. A mutant that makes a test fail is **killed**; one the tests still pass
on **survived**. The *mutation score* is `killed / (total non-equivalent)`.

> Why it matters for this thesis: line coverage says a line *ran*; mutation
> testing says a line's behaviour is actually *asserted*. Here line coverage was
> already 93%, yet the first mutation run found **8 surviving mutants** — real
> gaps where the tests executed code without checking its effect.

## Setup

- Tool: `@stryker-mutator/core` v9 (config: [`backend/stryker.config.mjs`](../../backend/stryker.config.mjs)).
- Scope: `services/**` (the business logic), run against the fast service **unit**
  tests (`jest.unit.config.js`) — no DB, no container.
- Runner: the **command** runner invoking Jest directly
  (`node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.unit.config.js`).
  This is the robust choice for the project's native-ESM + Jest 30 setup: Stryker's
  in-process jest-runner does not propagate the `--experimental-vm-modules` flag
  cleanly. **Trade-off:** no per-test coverage analysis, so the whole (≈0.5 s) unit
  suite runs for every mutant — acceptable because only the services are mutated.
- Run it: `npm run test:mutation` (from `backend/`). HTML + JSON reports land in
  `backend/reports/mutation/`.

## Results

| Run | Mutants | Killed | Timeout | Survived | Score |
|-----|--------:|-------:|--------:|---------:|------:|
| Initial unit suite            | 154 | 138 | 8 | 8 | **94.81 %** |
| After killing survivors       | 154 | 154 | 0 | 0 | **100.00 %** |

Wall-clock: ~24 s at `--concurrency 8`.

### The 8 survivors the first run exposed (and how they were killed)

All 8 were genuine assertion gaps, not equivalent mutants:

1. **`createMenuItem`’s `if (item)` → `if (true)`** — no test covered the model
   returning a falsy row. *Added:* a test where `create` resolves `undefined`.
2–5. **`if (client)` cleanup guards in `createOrder`/`updateOrderStatus`
   catch+finally → `if (true)`** — no test exercised the path where
   `pool.connect()` itself fails (so `client` stays undefined). *Added:* a
   "connect fails → propagates the original error" test for both methods (a
   `true` guard would throw a `TypeError` from `undefined.query`/`.release`).
6. **`updateOrderStatus` `client.query('BEGIN')` → `client.query('')`** — the
   `BEGIN` literal was only asserted in `createOrder`. *Added:* a `BEGIN`
   assertion to an `updateOrderStatus` test.
7–8. **`updateOrderStatus` statistics `.catch` block/string emptied** — only
   `createOrder`’s broadcast-failure path was tested. *Added:* the mirror
   "statistics failure does not reject `updateOrderStatus`" test.

A second pass found **2 more**, both in `updateOrderStatus`'s post-commit block:

- **`if (this.io)` → `if (true)`** — no "no io configured" test for
  `updateOrderStatus`. *Added* one.
- **`if (freedTable)` → `if (true)`** — the non-terminal test asserted
  `not.toHaveBeenCalledWith('tableStatusUpdate', expect.anything())`, but
  `expect.anything()` does **not** match `null`, so an `emit('tableStatusUpdate',
  null)` mutant slipped through. *Fixed* the assertion to check the event name
  directly (`mock.calls.filter(c => c[0] === 'tableStatusUpdate')`).

The last point is itself a nice finding: mutation testing caught a **weak
assertion** that coverage and a green suite both hid.
