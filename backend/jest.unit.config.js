import base from './jest.config.js';

/**
 * UNIT config — fast, fully mocked, NO database / NO container.
 *
 * Used by the CI "backend unit" stage and as the test runner for Stryker
 * mutation testing (which must be quick and dependency-free).
 */
export default {
    ...base,
    // No container for unit tests.
    globalSetup: undefined,
    globalTeardown: undefined,
    setupFiles: [],
    testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
    // Unit tests measure the services in isolation.
    collectCoverageFrom: ['services/**/*.js'],
    coverageThreshold: undefined,
};
