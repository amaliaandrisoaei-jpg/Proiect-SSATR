import js from '@eslint/js';
import globals from 'globals';

// Light ESLint flat config for the ESM Node backend.
export default [
    {
        ignores: ['node_modules', 'coverage', 'reports', '.stryker-tmp'],
    },
    js.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: { ...globals.node },
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        },
    },
    {
        // Test files also get the Jest globals (in addition to @jest/globals imports).
        files: ['tests/**/*.js'],
        languageOptions: {
            globals: { ...globals.node, ...globals.jest },
        },
    },
];
