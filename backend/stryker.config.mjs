// @ts-check
/**
 * Stryker mutation testing — measures the EFFECTIVENESS of the fast service unit
 * tests beyond line coverage by introducing faults ("mutants") into the service
 * code and checking whether the tests catch them.
 *
 * Runner choice: the project is native ESM on Jest 30 (run via
 * `node --experimental-vm-modules`). Stryker's in-process jest-runner does not
 * propagate that flag cleanly, so we use the COMMAND runner pointed straight at
 * Jest with the flag. Trade-off: no per-test coverage analysis, so the whole
 * (fast, ~0.5s) unit suite runs for every mutant. With only the services under
 * mutation this stays well within a few minutes.
 *
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
    packageManager: 'npm',
    testRunner: 'command',
    commandRunner: {
        command:
            'node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.unit.config.js --silent',
    },
    // Mutate only the business logic (services), matching the unit tests' scope.
    mutate: ['services/**/*.js'],
    // The command runner runs the full suite per mutant (no per-test selection).
    coverageAnalysis: 'off',
    concurrency: 4,
    timeoutMS: 60000,
    tempDirName: '.stryker-tmp',
    reporters: ['html', 'json', 'clear-text', 'progress'],
    htmlReporter: { fileName: 'reports/mutation/mutation.html' },
    jsonReporter: { fileName: 'reports/mutation/mutation.json' },
    clearTextReporter: { maxTestsToLog: 5 },
    // Score guidance; `break` is set so CI fails below the floor (Phase 6 job).
    thresholds: { high: 85, low: 70, break: 70 },
};
