import { Filter, IFilter, IRuleSet } from '@adguard/tsurlfilter';

import { FailedEnableRuleSetsError } from '../errors/failed-enable-rule-sets-error';
import { getFilterName } from '../utils/get-filter-name';

import { ConfigurationMV3 } from './configuration';
import RuleSetsLoaderApi from './rule-sets-loader-api';

export const RULE_SET_NAME_PREFIX = 'ruleset_';

/**
 * FiltersApi knows how to enable or disable static rule sets (which were built
 * with the extension) and how to create {@link Filter} through
 * loading its contents.
 */
export default class FiltersApi {
    /**
     * Cached list of static filters.
     */
    private staticFilters: IFilter[] = [];

    /**
     * Cached list of static rule sets.
     */
    private staticRuleSets: IRuleSet[] = [];

    /**
     * Enables or disables the provided rule set identifiers.
     *
     * @param disableFiltersIds Rule sets to disable.
     * @param enableFiltersIds Rule sets to enable.
     */
    static async updateFiltering(
        disableFiltersIds: number[],
        enableFiltersIds?: number[],
    ): Promise<FailedEnableRuleSetsError[]> {
        const errors: FailedEnableRuleSetsError[] = [];

        const enableRulesetIds = enableFiltersIds?.map((filterId) => `${RULE_SET_NAME_PREFIX}${filterId}`) || [];
        const disableRulesetIds = disableFiltersIds?.map((filterId) => `${RULE_SET_NAME_PREFIX}${filterId}`) || [];

        try {
            await chrome.declarativeNetRequest.updateEnabledRulesets({
                enableRulesetIds,
                disableRulesetIds,
            });
        } catch (e) {
            const msg = 'Cannot change list of enabled rule sets';
            const currentEnabledRuleSetsIds = await chrome.declarativeNetRequest.getEnabledRulesets();
            const err = new FailedEnableRuleSetsError(
                msg,
                enableRulesetIds,
                disableRulesetIds,
                currentEnabledRuleSetsIds,
                e as Error,
            );
            errors.push(err);
        }

        return errors;
    }

    /**
     * Returns current enabled rule sets IDs.
     *
     * @returns List of extracted enabled rule sets ids.
     */
    public static async getEnabledRuleSets(): Promise<number[]> {
        const ruleSets = await chrome.declarativeNetRequest.getEnabledRulesets();
        return ruleSets.map((f) => Number.parseInt(f.slice(RULE_SET_NAME_PREFIX.length), 10));
    }

    /**
     * Loads filters content from provided filtersPath (which has been extracted
     * from field 'filtersPath' of the {@link Configuration}).
     *
     * @param id Filter id.
     * @param filtersPath Path to filters directory.
     */
    private static async loadFilterContent(id: number, filtersPath: string): Promise<string[]> {
        const filterName = getFilterName(id);
        const url = chrome.runtime.getURL(`${filtersPath}/${filterName}`);
        const file = await fetch(url);
        const content = await file.text();

        return content.split(/\r?\n/);
    }

    /**
     * Wraps provided list of static filters ID's to {@link IFilter} and save
     * them to inner cache.
     *
     * @param filtersIds List of filters ids.
     * @param filtersPath Path to filters directory.
     */
    public createAndSaveStaticFilters(
        filtersIds: number[],
        filtersPath: string,
    ): void {
        this.staticFilters = filtersIds.map((filterId) => new Filter(filterId, {
            getContent: () => FiltersApi.loadFilterContent(filterId, filtersPath),
        }));
    }

    /**
     * Returns list of {@link IFilter} with a lazy content loading feature.
     *
     * @returns List of {@link IFilter} with a lazy content loading feature.
     */
    public getStaticFilters(): IFilter[] {
        return this.staticFilters;
    }

    /**
     * Wraps custom filter into {@link IFilter}.
     *
     * @param customFilters List of custom filters.
     *
     * @returns List of {@link IFilter} with a lazy content loading feature.
     */
    static createCustomFilters(customFilters: ConfigurationMV3['customFilters']): IFilter[] {
        return customFilters.map((f) => new Filter(f.filterId, {
            getContent: () => Promise.resolve(f.content.split('\n')),
        }));
    }

    /**
     * Wraps provided list of manifest rule sets to to {@link IRuleSet} and save
     * them to inner cache.
     *
     * @param manifestRuleSets List of {@link chrome.declarativeNetRequest.Ruleset}.
     * @param staticFilters List of {@link IFilter}.
     * @param ruleSetsPath Path to directory with converted rule sets.
     */
    public async createAndSaveStaticRuleSets(
        manifestRuleSets: chrome.declarativeNetRequest.Ruleset[],
        staticFilters: IFilter[],
        ruleSetsPath: string,
    ): Promise<void> {
        // Wrap filters into rule sets
        const ruleSetsLoaderApi = new RuleSetsLoaderApi(ruleSetsPath);
        const staticRuleSetsTasks = manifestRuleSets.map(({ id }) => {
            return ruleSetsLoaderApi.createRuleSet(id, staticFilters);
        });
        this.staticRuleSets = await Promise.all(staticRuleSetsTasks);
    }

    /**
     * Returns list of {@link IRuleSet} with a lazy content loading feature.
     *
     * @returns List of {@link IRuleSet} with a lazy content loading feature.
     */
    public getStaticRuleSets(): IRuleSet[] {
        return this.staticRuleSets;
    }
}

export const filtersApi = new FiltersApi();
