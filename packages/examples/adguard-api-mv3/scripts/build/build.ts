/* eslint-disable no-console */
import { copyWar } from '@adguard/tswebextension/cli';

import { WEB_ACCESSIBLE_RESOURCES_PATH } from '../constants';

import { buildRunner } from './build-runner';
import { config } from './webpack.config';

const build = async (): Promise<void> => {
    try {
        await buildRunner(config);
        await copyWar(WEB_ACCESSIBLE_RESOURCES_PATH);
    } catch (e) {
        console.log(e);
        process.exit(1);
    }
};

export { build };
