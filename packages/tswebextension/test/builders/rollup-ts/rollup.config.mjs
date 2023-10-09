import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

const cssHitsCounterConfig = {
    input: 'src/css-hits-counter.ts',
    output: {
        dir: 'dist',
        format: 'cjs',
    },
    plugins: [
        typescript(),
        resolve(),
    ],
};

export default [
    cssHitsCounterConfig,
];
