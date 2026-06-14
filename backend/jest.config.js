export default {
    testEnvironment: 'node',
    transform: {},
    extensionsToTreatAsEsm: [],
    moduleFileExtensions: ['js', 'json', 'node'],
    testPathIgnorePatterns: ['/node_modules/'],
    verbose: true,
    setupFiles: ['dotenv/config'],
    setupFilesAfterEnv: ['./tests/setup.js'],
};
