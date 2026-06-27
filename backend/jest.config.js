/**
 * Default Jest configuration — runs the FULL backend suite (unit + integration +
 * websocket) against ONE ephemeral PostgreSQL container started by globalSetup.
 *
 * The project stays native ESM (`"type": "module"`): no Babel/ts transform,
 * coverage uses the V8 provider which instruments native ESM directly.
 *
 *   npm test            -> this config (all layers, serial, container)
 *   npm run test:coverage -> this config + --coverage (enforces thresholds)
 *   npm run test:unit   -> jest.unit.config.js (fast, mocked, no DB)
 *   npm run test:integration -> jest.integration.config.js (DB layers only)
 */
export default {
    testEnvironment: 'node',
    transform: {},
    moduleFileExtensions: ['js', 'json', 'node'],
    rootDir: '.',
    testMatch: ['<rootDir>/tests/**/*.test.js'],
    testPathIgnorePatterns: ['/node_modules/'],

    // Ephemeral Postgres container shared by all DB-backed tests.
    globalSetup: '<rootDir>/tests/globalSetup.js',
    globalTeardown: '<rootDir>/tests/globalTeardown.js',
    // Re-publish the container URI as DATABASE_URL inside every worker.
    setupFiles: ['<rootDir>/tests/setupEnv.js'],

    verbose: true,
    // DB-backed tests TRUNCATE between cases, so they must not run concurrently
    // against the single shared database; serial execution is enforced via the
    // `--runInBand` flag in the npm scripts.

    // --- Coverage (collected when --coverage is passed) ---
    coverageProvider: 'v8',
    collectCoverageFrom: [
        'app.js',
        'createServer.js',
        'services/**/*.js',
        'models/**/*.js',
        'routes/**/*.js',
    ],
    // server.js is the runtime entrypoint (bootstraps a real pool + http server)
    // and is intentionally excluded from coverage.
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/tests/',
        '/migrations/',
        '<rootDir>/server.js',
        '<rootDir>/seed.js',
    ],
    coverageDirectory: '<rootDir>/coverage',
    coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
    coverageThreshold: {
        global: {
            lines: 80,
            statements: 80,
            branches: 70,
            functions: 80,
        },
    },
};
