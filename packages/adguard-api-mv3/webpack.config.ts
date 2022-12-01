const path = require('path');

const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const MODE = process.env.MODE || 'production';

module.exports = {
    mode: MODE,
    entry: {
        'adguard-api': './src/background/index.ts',
        'adguard-content': './src/content-script/index.ts',
    },
    module: {
        rules: [
            {
                test: /\.ts/,
                exclude: /node_modules/,
                use: [{
                    loader: 'babel-loader',
                }],
            },
        ],
    },
    plugins: [
        new CleanWebpackPlugin(),
        new ESLintPlugin(),
        new CopyWebpackPlugin({
            patterns: [
                {
                    context: 'src',
                    from: 'filters',
                    to: 'filters',
                },
            ],
        }),
    ],
    resolve: {
        extensions: ['.ts', '.js'],
    },
    optimization: {
        minimize: true,
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        library: { type: 'umd' },
    },
};
