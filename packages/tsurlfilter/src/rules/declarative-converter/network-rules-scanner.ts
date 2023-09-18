import { getErrorMessage } from '../../common/error';
import { NetworkRuleOption } from '../network-rule';

import type { IFilter } from './filter';
import type { IndexedNetworkRuleWithHash } from './network-indexed-rule-with-hash';
import { FilterScanner } from './filter-scanner';

/**
 * This is an intermediate type required for conversion from filter to ruleset.
 *
 * Contains scanned indexed rules with theirs hashes: regular rules separately,
 * rules with `$badfilter` separately.
 */
export type ScannedFilter = {
    id: number,
    rules: IndexedNetworkRuleWithHash[],
    badFilterRules: IndexedNetworkRuleWithHash[],
};

/**
 * The result of scanning a list of filters includes the scanned filters and
 * any errors that may occur during the scan.
 */
type ScannedFiltersWithErrors = {
    errors: Error[],
    filters: ScannedFilter[],
};

/**
 * Scanner for network rules from list of filters.
 */
export class NetworkRulesScanner {
    /**
     * Asynchronous scans the list of filters for rules.
     *
     * @param filterList List of {@link IFilter}.
     * @param filterFn If this function is specified, it will be applied to each
     * rule after it has been parsed and transformed. This function is needed
     * for example to apply $badfilter: to exclude negated rules from the array
     * of rules that will be returned.
     *
     * @returns List of filters includes the scanned filters and any errors that
     * may occur during the scan.
     */
    public static async scanRules(
        filterList: IFilter[],
        filterFn?: (r: IndexedNetworkRuleWithHash) => boolean,
    ): Promise<ScannedFiltersWithErrors> {
        const res: ScannedFiltersWithErrors = {
            errors: [],
            filters: [],
        };

        const promises = filterList.map(async (filter): Promise<ScannedFilter> => {
            const scanner = await FilterScanner.createNew(filter);
            const { errors, rules } = scanner.getIndexedRules(filterFn);

            res.errors = res.errors.concat(errors);

            const badFilterRules = rules.filter(({ rule }) => {
                return rule.isOptionEnabled(NetworkRuleOption.Badfilter);
            });

            return {
                id: filter.getId(),
                rules,
                badFilterRules,
            };
        });

        try {
            res.filters = await Promise.all(promises);
        } catch (e) {
            const filterListIds = filterList.map((f) => f.getId());
            const errMessage = `Cannot scan rules of filter list with ids ${filterListIds}: ${getErrorMessage(e)}`;

            res.errors.push(new Error(errMessage));
        }

        return res;
    }
}
