import typescript from '@rollup/plugin-typescript';
import cleanup from 'rollup-plugin-cleanup';
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";

const DEFAULT_OUTPUT_PATH = 'dist';

const OUTPUT_PATH = process.env.PACKAGE_OUTPUT_PATH ? `${process.env.PACKAGE_OUTPUT_PATH}/dist` : DEFAULT_OUTPUT_PATH;

const contentScriptLibraryName = 'TSWebExtensionContentScript';

const contentScriptConfig = {
    input: 'src/content-script/index.ts',
    output: [
        {
            file: `${OUTPUT_PATH}/${contentScriptLibraryName}.js`,
            format: 'esm',
            sourcemap: false,
        },
        {
            file: `${OUTPUT_PATH}/${contentScriptLibraryName}.umd.js`,
            name: contentScriptLibraryName,
            format: 'umd',
            sourcemap: false,
        },
    ],
    watch: {
        include: 'src/**',
    },
    plugins: [
        typescript(),
        commonjs({
            sourceMap: false,
        }),
        resolve(),
        cleanup({
            comments: ['srcmaps'],
        }),
    ],
};

export default {
    contentScriptConfig,
    input: [
        'src/index.ts',
    ],
    output: [
        {
            dir: OUTPUT_PATH,
            format: 'esm',
            sourcemap: false,
        },
    ],
    watch: {
        include: 'src/**',
    },
    plugins: [
        typescript(),
        cleanup({
            comments: ['srcmaps'],
        }),
    ],
};
