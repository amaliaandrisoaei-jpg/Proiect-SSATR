import base from './jest.config.js';

/**
 * INTEGRATION config — HTTP (Supertest) + WebSocket layers running against the
 * ephemeral PostgreSQL container. Used by the CI "backend integration" stage.
 *
 * Run serially (`--runInBand` in the npm script) because the DB-backed tests
 * TRUNCATE the shared database between cases.
 */
export default {
    ...base,
    testMatch: [
        '<rootDir>/tests/integration/**/*.test.js',
        '<rootDir>/tests/websocket/**/*.test.js',
    ],
    coverageThreshold: undefined,
};
