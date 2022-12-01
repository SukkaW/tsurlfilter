const path = require('path');

module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        tsconfigRootDir: path.join(__dirname),
        project: 'tsconfig.eslint.json',
    },
    env: {
        browser: true,
    },
    plugins: [
        'import',
        'import-newlines',
    ],
    extends: [
        'airbnb-base',
        'airbnb-typescript/base',
        'plugin:jsdoc/recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    rules: {
        'max-len': ['error', { code: 120 }],

        'import-newlines/enforce': ['error', 3, 120],
        'import/no-extraneous-dependencies': ['error', { 'devDependencies': true }],
        'import/prefer-default-export': 'off',
        'import/order': [
            'error',
            {
                groups: [
                    "builtin",
                    "external",
                    "internal",
                    "parent",
                    "index",
                ],
                'newlines-between': 'always',
                warnOnUnassignedImports: false,
            },
        ],

        '@typescript-eslint/indent': ['error', 4],
        '@typescript-eslint/explicit-function-return-type': 'error',

        'jsdoc/require-param-type': 'off',
        'jsdoc/require-returns-type': 'off',
        'jsdoc/require-throws': 'error',
        'jsdoc/require-file-overview': 'error',
        'jsdoc/require-description-complete-sentence': ['warn'],
        'jsdoc/require-jsdoc': [
            'warn',
            {
                contexts: [
                    'ClassDeclaration',
                    'ClassProperty',
                    'FunctionDeclaration',
                    'MethodDefinition'
                ]
            }
        ],
        'jsdoc/require-description': [
            'warn',
            {
                contexts: [
                    'ClassDeclaration',
                    'ClassProperty',
                    'FunctionDeclaration',
                    'MethodDefinition'
                ]
            }
        ],
    },
};
