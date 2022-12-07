import path from 'path';
import fs from 'fs';

import { Configuration } from 'webpack';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';

import {
    BACKGROUND_PATH,
    CONTENT_SCRIPT,
    POPUP_PATH,
    BUILD_PATH,
    FILTERS_DIR,
} from '../constants';

const updateManifest = (content: Buffer): string => {
    const manifest = JSON.parse(content.toString());

    if (fs.existsSync(FILTERS_DIR)) {
        const nameList = fs.readdirSync(FILTERS_DIR);

        const rules = {
            rule_resources: nameList
                .map((name: string) => {
                    const rulesetIndex = name.match(/\d+/);
                    return rulesetIndex ? rulesetIndex[0] : null;
                })
                .filter((rulesetIndex): rulesetIndex is string => rulesetIndex !== null && rulesetIndex !== undefined)
                .map((rulesetIndex: string) => {
                    const id = `ruleset_${rulesetIndex}`;

                    return {
                        id,
                        enabled: false,
                        path: `filters/declarative/${id}/${id}.json`,
                    };
                }),
        };

        manifest.declarative_net_request = rules;
    }

    return JSON.stringify(manifest, null, 4);
};

export const config: Configuration = {
    mode: 'production',
    entry: {
        background: BACKGROUND_PATH,
        'content-script': CONTENT_SCRIPT,
        popup: POPUP_PATH,
    },
    output: {
        path: BUILD_PATH,
        filename: '[name].js',
    },
    resolve: {
        extensions: ['*', '.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.(js|ts)x?$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: { babelrc: true },
                    },
                ],
            },
        ],
    },
    optimization: {
        minimize: false,
    },
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: path.join(POPUP_PATH, 'index.html'),
            filename: 'popup.html',
            chunks: ['popup'],
            cache: false,
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    context: 'extension',
                    from: '../scripts/manifest.json',
                    to: 'manifest.json',
                    transform: updateManifest,
                },
                {
                    // TODO: Is it ok?
                    from: 'node_modules/@adguard/api/dist/filters',
                    to: 'filters',
                },
            ],
        }),
    ],
};
