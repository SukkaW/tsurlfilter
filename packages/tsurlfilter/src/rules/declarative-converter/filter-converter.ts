/**
 * @file Describes the conversion from a filter list {@link IFilter}
 * to rule sets {@link IRuleSet} with declarative rules {@link DeclarativeRule}.
 */

import { NetworkRule } from '../network-rule';
import { IndexedRuleWithHash } from '../indexed-rule-with-hash';

import { IRuleSet, IRuleSetContentProvider, RuleSet } from './rule-set';
import { FilterScanner } from './filter-scanner';
import { SourceMap } from './source-map';
import type { IFilter } from './filter';
import { DeclarativeRulesConverter } from './rules-converter';
import {
    ResourcesPathError,
    EmptyOrNegativeNumberOfRulesError,
    NegativeNumberOfRegexpRulesError,
} from './errors/converter-options-errors';
import type { ConversionResult } from './conversion-result';
import type { DeclarativeConverterOptions } from './declarative-converter-options';
import type { ScannedFilter, ScannedFilters } from './rules-converter';
import { RulesHashMap } from './rule-hash-map';

type ScannedFiltersWithErrors = {
    errors: Error[],
    filters: ScannedFilters,
};

/**
 * The interface for the declarative filter converter describes what the filter
 * converter expects on the input and what should be returned on the output.
 *
 * TODO: Description for method's parameters.
 */
interface IFilterConverter {
    /**
     * Extracts content from the provided static filter and converts to a set
     * of declarative rules with error-catching non-convertible rules and
     * checks that converted ruleset matches the constraints (reduce if not).
     *
     * @throws Error {@link UnavailableFilterSourceError} if filter content
     * is not available OR some of {@link ResourcesPathError},
     * {@link EmptyOrNegativeNumberOfRulesError},
     * {@link NegativeNumberOfRegexpRulesError}.
     * @see {@link DeclarativeFilterConverter#checkConverterOptions}
     * for details.
     *
     * @returns Item of {@link ConversionResult}.
     */
    convertStaticRuleset(
        filterList: IFilter,
        options?: DeclarativeConverterOptions,
    ): Promise<ConversionResult>;

    /**
     * Extracts content from the provided list of dynamic filters and converts
     * all together into one set of rules with declarative rules.
     * During the conversion, it catches unconvertible rules and checks if
     * the converted ruleset matches the constraints (reduce if not).
     *
     * TODO: This method should be changed: it should return list of badfilter rules.
     *
     * @throws Error {@link UnavailableFilterSourceError} if filter content
     * is not available OR some of {@link ResourcesPathError},
     * {@link EmptyOrNegativeNumberOfRulesError},
     * {@link NegativeNumberOfRegexpRulesError}.
     * @see {@link DeclarativeFilterConverter#checkConverterOptions}
     * for details.
     *
     * @returns Item of {@link ConversionResult}.
     */
    convertDynamicRulesets(
        filterList: IFilter[],
        staticRuleSets: IRuleSet[],
        options?: DeclarativeConverterOptions,
    ): Promise<ConversionResult>;
}

/**
 * Converts a list of IFilters to a single rule set or to a list of rule sets.
 */
export class DeclarativeFilterConverter implements IFilterConverter {
    /**
     * Same as chrome.declarativeNetRequest.DYNAMIC_RULESET_ID.
     */
    public static readonly COMBINED_RULESET_ID = '_dynamic';

    /**
     * Asynchronous scans the list of filters for rules.
     *
     * @param filterList List of {@link IFilter}.
     * @param filterFn
     *
     * @returns Map, where the key is the filter identifier and the value is the
     * indexed filter rules {@link IndexedRule}.
     */
    // eslint-disable-next-line class-methods-use-this
    private async scanRules(
        filterList: IFilter[],
        filterFn?: (r: IndexedRuleWithHash) => boolean,
    ): Promise<ScannedFiltersWithErrors> {
        const res: ScannedFiltersWithErrors = {
            errors: [],
            filters: [],
        };

        const promises = filterList.map(async (filter): Promise<ScannedFilter> => {
            const scanner = await FilterScanner.createNew(filter);
            const {
                errors,
                rules,
                badFilterRules,
            } = scanner.getIndexedRules(filterFn);

            res.errors = res.errors.concat(errors);

            return {
                id: filter.getId(),
                rules,
                badFilterRules,
            };
        });

        // FIXME: Add error catching
        res.filters = await Promise.all(promises);

        return res;
    }

    /**
     * Checks that provided converter options are correct.
     *
     * @param options Contains path to web accessible resources,
     * maximum number of converter rules and regexp rules. @see
     * {@link DeclarativeConverterOptions} for details.
     *
     * @throws An {@link ResourcesPathError} if the resources path does not
     * start with a slash or it ends with a slash
     * OR an {@link EmptyOrNegativeNumberOfRulesError} if maximum number of
     * rules is equal or less than 0.
     * OR an {@link NegativeNumberOfRegexpRulesError} if maximum number of
     * regexp rules is less than 0.
     */
    private static checkConverterOptions(options: DeclarativeConverterOptions): void {
        const {
            resourcesPath,
            maxNumberOfRules,
            maxNumberOfRegexpRules,
        } = options;

        if (resourcesPath !== undefined) {
            const firstChar = 0;
            const lastChar = resourcesPath.length > 0
                ? resourcesPath.length - 1
                : 0;

            if (resourcesPath[firstChar] !== '/') {
                const msg = 'Path to web accessible resources should '
                    + `be started with leading slash: ${resourcesPath}`;
                throw new ResourcesPathError(msg);
            }

            if (resourcesPath[lastChar] === '/') {
                const msg = 'Path to web accessible resources should '
                    + `not be ended with slash: ${resourcesPath}`;
                throw new ResourcesPathError(msg);
            }
        }

        if (maxNumberOfRules !== undefined && maxNumberOfRules <= 0) {
            const msg = 'Maximum number of rules cannot be equal or less than 0';
            throw new EmptyOrNegativeNumberOfRulesError(msg);
        }

        if (maxNumberOfRegexpRules && maxNumberOfRegexpRules < 0) {
            const msg = 'Maximum number of regexp rules cannot be less than 0';
            throw new NegativeNumberOfRegexpRulesError(msg);
        }
    }

    // eslint-disable-next-line jsdoc/require-param, jsdoc/require-description
    /**
     * @see {@link IFilterConverter#convertStaticRuleset}
     */
    public async convertStaticRuleset(
        filter: IFilter,
        options?: DeclarativeConverterOptions,
    ): Promise<ConversionResult> {
        if (options) {
            DeclarativeFilterConverter.checkConverterOptions(options);
        }

        const converted: ConversionResult = {
            ruleSets: [],
            errors: [],
            limitations: [],
        };

        const scanned = await this.scanRules([filter]);

        converted.errors = converted.errors.concat(scanned.errors);

        scanned.filters.forEach((filterIdWithRules: ScannedFilter) => {
            const {
                id: filterId,
                rules,
                badFilterRules,
            } = filterIdWithRules;
            const {
                sourceMapValues,
                declarativeRules,
                errors,
                limitations,
            } = DeclarativeRulesConverter.convert(
                [filterIdWithRules],
                options,
            );

            const ruleSetContent: IRuleSetContentProvider = {
                getSourceMap: () => {
                    return Promise.resolve(new SourceMap(sourceMapValues));
                },
                getFilterList: () => {
                    return Promise.resolve([filter]);
                },
                getDeclarativeRules: () => {
                    return Promise.resolve(declarativeRules);
                },
                getRulesHashMap: () => {
                    const values = rules.map((r) => ({
                        hash: r.hash,
                        source: {
                            sourceRuleIndex: r.index,
                            filterId,
                        },
                    }));

                    const rulesHashMap = new RulesHashMap(values);

                    return Promise.resolve(rulesHashMap);
                },
            };

            const ruleSet = new RuleSet(
                `ruleset_${filterId}`,
                declarativeRules.length,
                declarativeRules.filter((d) => d.condition.regexFilter).length,
                ruleSetContent,
                badFilterRules,
            );

            converted.ruleSets.push(ruleSet);
            converted.errors = converted.errors.concat(errors);
            if (limitations) {
                converted.limitations = converted.limitations.concat(limitations);
            }
        });

        return converted;
    }

    // eslint-disable-next-line jsdoc/require-param, jsdoc/require-description
    /**
     * @see {@link IFilterConverter#convertDynamicRulesets}
     */
    public async convertDynamicRulesets(
        filterList: IFilter[],
        staticRuleSets: IRuleSet[],
        options?: DeclarativeConverterOptions,
    ): Promise<ConversionResult> {
        if (options) {
            DeclarativeFilterConverter.checkConverterOptions(options);
        }

        let allStaticBadFilterRules: IndexedRuleWithHash[] = [];

        // FIXME: Optimize this part, instead of storing all rules as array,
        // check if there is a hash of rule in hashmap. If so - call ruleSet.getSourceRule(id)
        // and then convert it to NetworkRule.
        staticRuleSets.forEach((ruleSet) => {
            allStaticBadFilterRules = allStaticBadFilterRules.concat(ruleSet.getBadFilterRules());
        });

        const checkRule = (r: IndexedRuleWithHash): boolean => {
            for (let i = 0; i < allStaticBadFilterRules.length; i += 1) {
                const rule = allStaticBadFilterRules[i];

                if (r.hash === rule.hash
                    && rule.rule instanceof NetworkRule
                    && r.rule instanceof NetworkRule
                ) {
                    const badFilterRule = rule.rule;
                    const ruleToCheck = r.rule;

                    if (badFilterRule.negatesBadfilter(ruleToCheck)) {
                        return true;
                    }
                }
            }

            return false;
        };

        // Note: if we drop some rules because of applying $badfilter - we
        // cannot show info about it to user.
        const scanned = await this.scanRules(filterList, checkRule);

        const combinedConvertedRules = DeclarativeRulesConverter.convert(
            scanned.filters,
            options,
        );

        const {
            sourceMapValues,
            declarativeRules,
            errors,
            limitations = [],
        } = combinedConvertedRules;

        const ruleSetContent: IRuleSetContentProvider = {
            getSourceMap: () => {
                return Promise.resolve(new SourceMap(sourceMapValues));
            },
            getFilterList: () => {
                return Promise.resolve(filterList);
            },
            getDeclarativeRules: () => {
                return Promise.resolve(declarativeRules);
            },
            getRulesHashMap: () => {
                const values = scanned.filters
                    .map(({ id, rules }) => {
                        return rules.map((r) => ({
                            hash: r.hash,
                            source: {
                                sourceRuleIndex: r.index,
                                filterId: id,
                            },
                        }));
                    })
                    .flat();

                const rulesHashMap = new RulesHashMap(values);

                return Promise.resolve(rulesHashMap);
            },
        };

        const ruleSet = new RuleSet(
            DeclarativeFilterConverter.COMBINED_RULESET_ID,
            declarativeRules.length,
            declarativeRules.filter((d) => d.condition.regexFilter).length,
            ruleSetContent,
            scanned.filters.map(({ badFilterRules }) => badFilterRules).flat(),
        );

        return {
            ruleSets: [ruleSet],
            errors: errors.concat(scanned.errors),
            limitations,
        };
    }
}
