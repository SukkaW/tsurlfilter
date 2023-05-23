/**
 * @file ESLint configuration based on Airbnb's with some modifications.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { join } = require('path');

module.exports = {
    root: true,
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'airbnb-base',
        'airbnb-typescript/base',
        'plugin:jsdoc/recommended',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        tsconfigRootDir: join(__dirname),
        project: 'tsconfig.eslint.json',
    },
    plugins: ['import', '@typescript-eslint'],
    rules: {
        'max-len': [
            'error',
            {
                code: 120,
                comments: 120,
                tabWidth: 4,
                ignoreUrls: true,
                ignoreTrailingComments: false,
                ignoreComments: false,
            },
        ],
        '@typescript-eslint/indent': [
            'error',
            4,
            {
                SwitchCase: 1,
            },
        ],
        'import/prefer-default-export': 'off',
        'no-restricted-syntax': ['error', 'LabeledStatement', 'WithStatement'],
        'no-continue': 'off',
        'jsdoc/require-param-type': 'off',
        'jsdoc/require-returns-type': 'off',
        'jsdoc/tag-lines': [
            'warn',
            'any',
            {
                startLines: 1,
            },
        ],
        'arrow-body-style': 'off',
        'no-await-in-loop': 'off',
    },
};
