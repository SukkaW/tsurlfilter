/**
 * @file
 * This file is part of Adguard API library (https://github.com/AdguardTeam/tsurlfilter/packages/adguard-api-mv3).
 *
 * Adguard API is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Adguard API is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Adguard API. If not, see <http://www.gnu.org/licenses/>.
 */

import fs from 'fs';
import path from 'path';

import { convertFilters } from '@adguard/tsurlfilter/cli';
import { getFilterName } from '@adguard/tswebextension/mv3/utils';
import axios from 'axios';
import { ensureDir } from 'fs-extra';
import { WEB_RESOURCES_PATH } from 'src/background/main';
import { ADGUARD_FILTERS_IDS } from 'src/background/schemas';

const FILTERS_DIR = './src/filters';
const DEST_RULE_SETS_DIR = `${FILTERS_DIR}/declarative`;

const EXTENSION_FILTERS_SERVER_URL_FORMAT = 'https://filters.adtidy.org/extension/chromium';
const FILTER_DOWNLOAD_URL_FORMAT = `${EXTENSION_FILTERS_SERVER_URL_FORMAT}/filters/%filter.txt`;

type UrlType = {
    id: number;
    url: string;
    file: string;
};

const getUrlsOfFiltersResources = (): UrlType[] => ADGUARD_FILTERS_IDS.map((filterId) => ({
    id: filterId,
    url: FILTER_DOWNLOAD_URL_FORMAT.replace('%filter', `${filterId}`),
    file: getFilterName(filterId),
}));

const downloadFilter = async (url: UrlType, filtersDir: string): Promise<void> => {
    console.info(`Download ${url.url}...`);

    const response = await axios.get(url.url, { responseType: 'arraybuffer' });

    await fs.promises.writeFile(path.join(filtersDir, url.file), response.data);

    console.info(`Download ${url.url} done`);
};

const startDownload = async (): Promise<void> => {
    await ensureDir(FILTERS_DIR);

    const urls = getUrlsOfFiltersResources();
    await Promise.all(urls.map((url) => downloadFilter(url, FILTERS_DIR)));
};

/**
 * Downloads and converts filters.
 */
const downloadAndConvertFilters = async (): Promise<void> => {
    await startDownload();

    await convertFilters(FILTERS_DIR, WEB_RESOURCES_PATH, DEST_RULE_SETS_DIR, true);
};

downloadAndConvertFilters();
