import fs from "fs";
import path from "path";
// eslint-disable-next-line import/no-extraneous-dependencies
import { convertFilters } from "@adguard/tsurlfilter/cli";
import { getFilterName } from "@adguard/tswebextension/mv3/utils";
// eslint-disable-next-line import/no-extraneous-dependencies
import axios from "axios";
// eslint-disable-next-line import/no-extraneous-dependencies
import { ensureDir } from "fs-extra";
import { FILTERS_DIR } from "./constants";

const COMMON_FILTERS_DIR = "./extension/filters";
const DEST_RULE_SETS_DIR = `${COMMON_FILTERS_DIR}/declarative`;
const RESOURCES_DIR = "/war/redirects";

const ADGUARD_FILTERS_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 224];

const EXTENSION_FILTERS_SERVER_URL_FORMAT = "https://filters.adtidy.org/extension/chromium";
const FILTER_DOWNLOAD_URL_FORMAT = `${EXTENSION_FILTERS_SERVER_URL_FORMAT}/filters/%filter.txt`;

export type UrlType = {
    id: number;
    url: string;
    file: string;
};

const getUrlsOfFiltersResources = () => {
    return ADGUARD_FILTERS_IDS.map((filterId) => ({
        id: filterId,
        url: FILTER_DOWNLOAD_URL_FORMAT.replace("%filter", `${filterId}`),
        file: getFilterName(filterId),
    }));
};

const downloadFilter = async (url: UrlType, filtersDir: string) => {
    console.info(`Download ${url.url}...`);

    const response = await axios.get(url.url, { responseType: "arraybuffer" });

    await fs.promises.writeFile(path.join(filtersDir, url.file), response.data);

    console.info(`Download ${url.url} done`);
};

const startDownload = async () => {
    await ensureDir(FILTERS_DIR);

    const urls = getUrlsOfFiltersResources();
    await Promise.all(urls.map((url) => downloadFilter(url, FILTERS_DIR)));
};

/**
 * Compiles rules to declarative json
 */
const precompileRules = async () => {
    await startDownload();

    await convertFilters(FILTERS_DIR, RESOURCES_DIR, DEST_RULE_SETS_DIR, true);
};

precompileRules();
