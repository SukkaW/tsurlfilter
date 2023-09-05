/* eslint-disable no-console */
import path from 'path';
import fs from 'fs';

import {
    BAD_FILTER_RULES_FILENAME,
    DeclarativeFilterConverter,
    Filter,
    FILTER_LIST_IDS_FILENAME_JSON,
    HASH_MAP_FILENAME_JSON,
    REGEXP_RULES_COUNT_FILENAME,
    RULES_COUNT_FILENAME,
    SOURCE_MAP_FILENAME_JSON,
} from '../src/rules/declarative-converter';

const ensureDirSync = (dirPath: string) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, {
            recursive: true,
            mode: 0o2775,
        });
    }
};

/**
 * Converts filters with textual rules from the provided path to declarative
 * rule sets and saves them with counters, source map and list of source filter
 * identifiers on the specified path.
 *
 * @param filtersDir Path fo source filters.
 * @param resourcesDir Path to web accessible resources.
 * @param destRuleSetsDir Destination path for declarative rule sets.
 * @param debug Print debug information about conversion.
 */
export const convertFilters = async (
    filtersDir: string,
    resourcesDir: string,
    destRuleSetsDir: string,
    debug: boolean,
): Promise<void> => {
    const filtersPath = path.resolve(process.cwd(), filtersDir);
    const resourcesPath = path.resolve(process.cwd(), resourcesDir);
    const destRuleSetsPath = path.resolve(process.cwd(), destRuleSetsDir);

    try {
        ensureDirSync(filtersPath);
        ensureDirSync(destRuleSetsPath);

        const filtersPaths = new Map<number, string>();

        const files = fs.readdirSync(filtersPath);
        const filters = files
            .map((filePath: string) => {
                console.info(`Parsing ${filePath}...`);
                const index = filePath.match(/\d+/);

                if (!index) {
                    console.info(`${filePath} skipped`);
                    return null;
                }

                const filterId = Number(index);

                filtersPaths.set(filterId, filePath);
                const data = fs.readFileSync(`${filtersPath}/${filePath}`, { encoding: 'utf-8' });

                console.info(`Preparing filter #${filterId} to convert`);

                return new Filter(filterId, {
                    getContent: async () => data.split('\n'),
                });
            })
            .filter((filter): filter is Filter => filter !== null);

        const converter = new DeclarativeFilterConverter();

        const convertingTasks = await Promise.all(
            filters.map((filter) => converter.convertStaticRuleset(
                filter,
                { resourcesPath },
            )),
        );

        // FIXME: This part looks very ugly.
        const {
            ruleSets,
            errors,
            limitations,
        } = convertingTasks.reduce((prev, cur) => {
            return {
                ruleSets: prev.ruleSets.concat(cur.ruleSets),
                errors: prev.errors.concat(cur.errors),
                limitations: prev.limitations.concat(cur.limitations),
            };
        }, { ruleSets: [], errors: [], limitations: [] });

        console.log(`Converted with errors: ${errors.length}`);

        if (debug) {
            console.log('======================================');
            console.log('Converted with following errors: ');
            console.log('======================================');
            errors.forEach((e) => console.log(e.message));
        }

        console.log(`Skipped converting for rules: ${limitations.length}`);

        if (debug) {
            console.log('======================================');
            console.log('Converted with following limitations: ');
            console.log('======================================');
            limitations.forEach((e) => console.log(e.message));
        }

        const promises = ruleSets.map(async (ruleSet) => {
            const {
                id,
                declarativeRules,
                regexpRulesCount,
                rulesCount,
                sourceMapRaw,
                filterListsIds,
                ruleSetHashMapRaw,
                badFilterRules,
            } = await ruleSet.serialize();

            const ruleSetDir = `${destRuleSetsPath}/${id}`;
            ensureDirSync(ruleSetDir);

            await Promise.all([
                fs.promises.writeFile(`${ruleSetDir}/${id}.json`, JSON.stringify(declarativeRules, null, '\t')),

                // These two files need for every run of engine.configure to calculate $badfilter rules.
                fs.promises.writeFile(`${ruleSetDir}/${HASH_MAP_FILENAME_JSON}`, ruleSetHashMapRaw),
                fs.promises.writeFile(`${ruleSetDir}/${BAD_FILTER_RULES_FILENAME}`, badFilterRules),

                fs.promises.writeFile(`${ruleSetDir}/${SOURCE_MAP_FILENAME_JSON}`, sourceMapRaw),

                // FIXME: Combine all these files together
                fs.promises.writeFile(`${ruleSetDir}/${REGEXP_RULES_COUNT_FILENAME}`, regexpRulesCount.toString()),
                fs.promises.writeFile(`${ruleSetDir}/${RULES_COUNT_FILENAME}`, rulesCount.toString()),
                fs.promises.writeFile(`${ruleSetDir}/${FILTER_LIST_IDS_FILENAME_JSON}`, JSON.stringify(filterListsIds)),
            ]);

            console.log('======================================');
            console.info(`Rule set with id ${id} and all rule set info (counters, source map, filter list) was saved`);
            console.info(`to ${destRuleSetsDir}/${id}`);
            console.log('======================================');
        });
        await Promise.all(promises);
    } catch (e) {
        console.error(e);
    }
};
