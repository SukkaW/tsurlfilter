import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import globals from 'rollup-plugin-node-globals';
import camelCase from 'lodash/camelCase';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import cleanup from 'rollup-plugin-cleanup';
import { terser } from 'rollup-plugin-terser';
import { preserveShebangs } from 'rollup-plugin-preserve-shebangs';

const DEFAULT_OUTPUT_PATH = 'dist';

const OUTPUT_PATH = process.env.PACKAGE_OUTPUT_PATH ? `${process.env.PACKAGE_OUTPUT_PATH}/dist` : DEFAULT_OUTPUT_PATH;

const libraryName = 'TSUrlFilter';

const commonConfig = {
    cache: false,
    watch: {
        include: 'src/**',
    },
    plugins: [
        // Allow json resolution
        json(),

        // Compile TypeScript files
        typescript(),

        // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
        commonjs({
            sourceMap: false,
        }),
        globals(),
        nodePolyfills(),

        // Allow node_modules resolution, so you can use 'external' to control
        // which external modules to include in the bundle
        // https://github.com/rollup/rollup-plugin-node-resolve#usage
        resolve({ preferBuiltins: false }),

        cleanup({
            comments: ['srcmaps'],
        }),
    ],
};

const esmConfig = {
    input: [
        'src/index.ts',
        'src/request-type.ts',
        'src/rules/simple-regex.ts',
        'src/rules/cosmetic-rule-marker.ts',
        'src/rules/network-rule-options.ts',
    ],
    output: [
        {
            dir: `${OUTPUT_PATH}/es`,
            format: 'esm',
            sourcemap: false,
        },
    ],
    ...commonConfig,
};

/**
 * UMD build is needed for the FiltersCompiler and DNS dashboard.
 *
 * TODO: should be removed. AG-21466
 */
const umdConfig = {
    input: 'src/index.ts',
    output: [
        {
            file: `${OUTPUT_PATH}/tsurlfilter.umd.js`,
            name: camelCase(libraryName),
            format: 'umd',
            sourcemap: false,
        },
        {
            file: `${OUTPUT_PATH}/tsurlfilter.umd.min.js`,
            name: camelCase(libraryName),
            format: 'umd',
            sourcemap: false,
            plugins: [terser()],
        },
    ],
    ...commonConfig,
};

const cliConfig = {
    input: 'cli/index.ts',
    output: [
        {
            file: `${OUTPUT_PATH}/cli.js`,
            format: 'cjs',
            sourcemap: false,
        },
    ],
    external: [
        '@adguard/scriptlets',
        'is-ip',
        'punycode/',
        'tldts',
        'is-cidr',
        'netmask',
        'ip6addr',
        'zod',
        'path',
        'commander',
        'fs',
    ],

    plugins: [
        // Allow json resolution
        json(),

        // Compile TypeScript files
        typescript(),

        cleanup({
            comments: ['srcmaps'],
        }),

        preserveShebangs(),
    ],

    watch: {
        include: 'cli/**',
    },
};

export default [
    esmConfig,
    umdConfig,
    cliConfig,
];
