import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { runner as migrate } from 'node-pg-migrate';
import fs from 'fs';
import pg from 'pg';
import { DB_URI_FILE, MIGRATIONS_DIR } from './helpers/db.js';

const { Pool } = pg;

/**
 * Jest globalSetup — runs ONCE in the Jest parent process before any test file.
 *
 *   1. Starts ONE ephemeral PostgreSQL container (Docker is the only prerequisite).
 *   2. Runs the node-pg-migrate migrations against it.
 *   3. Persists the connection URI to disk so every worker can read it
 *      (see setupEnv.js) — `process.env` set here is not reliable under ESM workers.
 *   4. Stashes the container handle on globalThis for globalTeardown.
 */
export default async function globalSetup() {
    // Ryuk (the resource reaper) needs its own container/image. We do an explicit
    // teardown instead, which is faster and avoids an extra image pull in CI.
    process.env.TESTCONTAINERS_RYUK_DISABLED = process.env.TESTCONTAINERS_RYUK_DISABLED ?? 'true';

    const t0 = Date.now();
    // eslint-disable-next-line no-console
    console.log('\n[testcontainers] Starting ephemeral PostgreSQL container…');

    const container = await new PostgreSqlContainer('postgres:16-alpine')
        .withDatabase('restaurant_test')
        .withUsername('test')
        .withPassword('test')
        .start();

    const uri = container.getConnectionUri();

    // Run migrations against the fresh container.
    await migrate({
        databaseUrl: uri,
        dir: MIGRATIONS_DIR,
        direction: 'up',
        migrationsTable: 'pgmigrations',
        count: Infinity,
        verbose: false,
        log: () => {},
    });

    // Sanity check the schema is present before workers start.
    const pool = new Pool({ connectionString: uri });
    const { rows } = await pool.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
    );
    await pool.end();
    const tableNames = rows.map((r) => r.table_name);
    for (const required of ['tables', 'menu_items', 'orders', 'order_items']) {
        if (!tableNames.includes(required)) {
            await container.stop();
            throw new Error(`Migration did not create expected table "${required}". Got: ${tableNames.join(', ')}`);
        }
    }

    // Hand the URI to the workers and remember the container for teardown.
    fs.writeFileSync(DB_URI_FILE, uri, 'utf8');
    process.env.DATABASE_URL = uri;
    globalThis.__POSTGRES_CONTAINER__ = container;

    const safeUri = uri.replace(/:\/\/([^:]+):[^@]+@/, '://$1:****@');
    // eslint-disable-next-line no-console
    console.log(`[testcontainers] Ready in ${Date.now() - t0} ms → ${safeUri}\n`);
}
