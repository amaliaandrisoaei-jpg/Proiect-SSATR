import fs from 'fs';
import { DB_URI_FILE } from './helpers/db.js';

/**
 * Jest globalTeardown — stops the ephemeral PostgreSQL container started in
 * globalSetup and removes the URI hand-off file.
 */
export default async function globalTeardown() {
    const container = globalThis.__POSTGRES_CONTAINER__;
    if (container) {
        // eslint-disable-next-line no-console
        console.log('\n[testcontainers] Stopping PostgreSQL container…');
        await container.stop();
    }
    if (fs.existsSync(DB_URI_FILE)) {
        fs.rmSync(DB_URI_FILE);
    }
}
