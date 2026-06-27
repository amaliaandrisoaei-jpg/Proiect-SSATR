import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Path of the file used to hand the ephemeral Testcontainers connection URI
 * from Jest's `globalSetup` (parent process) to the test workers.
 *
 * Why a file? Under Jest's experimental ESM mode `process.env` mutated in
 * `globalSetup` is NOT reliably propagated to worker processes. Persisting the
 * URI to disk and re-loading it in `setupFiles` (see `setupEnv.js`) is the
 * robust, documented work-around.
 */
export const DB_URI_FILE = path.join(__dirname, '..', '.testcontainer-db-uri');

/** The migrations directory (node-pg-migrate). */
export const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'migrations');

/** Returns the active DATABASE_URL or throws a helpful error. */
export function getDatabaseUrl() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error(
            'DATABASE_URL is not set. Did the Testcontainers globalSetup run? ' +
            'Run integration tests via `npm test` / `npm run test:integration`.'
        );
    }
    return url;
}

/** Creates a fresh pg Pool pointed at the test database. */
export function newTestPool() {
    return new Pool({ connectionString: getDatabaseUrl() });
}

/** Wipes every table and resets identity sequences (isolation between tests). */
export async function truncateAll(executor) {
    await executor.query(
        'TRUNCATE TABLE order_items, orders, tables, menu_items RESTART IDENTITY CASCADE'
    );
}
