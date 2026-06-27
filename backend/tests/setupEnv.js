import fs from 'fs';
import { DB_URI_FILE } from './helpers/db.js';

/**
 * setupFiles entry — runs inside EACH Jest worker before the test framework.
 *
 * Reads the Testcontainers connection URI persisted by globalSetup and exposes
 * it as DATABASE_URL. This is the reliable way to share the container address
 * with ESM workers (env vars set in globalSetup do not propagate).
 */
if (fs.existsSync(DB_URI_FILE)) {
    process.env.DATABASE_URL = fs.readFileSync(DB_URI_FILE, 'utf8').trim();
}
