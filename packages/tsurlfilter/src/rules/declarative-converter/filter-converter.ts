/**
 * @file Describes the conversion from a filter list {@link IFilter}
 * to rule sets {@link IRuleSet} with declarative rules {@link DeclarativeRule}.
 */

import { NetworkRule, NetworkRuleOption } from '../network-rule';
import { IndexedRuleWithHash } from '../indexed-rule-with-hash';

import {
    IRuleSet,
    IRuleSetContentProvider,
    RuleSet,
    UpdateStaticRulesOptions,
} from './rule-set';
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
 */
interface IFilterConverter {
    /**
     * Extracts content from the provided static filter and converts to a set
     * of declarative rules with error-catching non-convertible rules and
     * checks that converted ruleset matches the constraints (reduce if not).
     *
     * @param filterList List of {@link IFilter} to convert.
     * @param options Options from {@link DeclarativeConverterOptions}.
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
     * @param filterList List of {@link IFilter} to convert.
     * @param staticRuleSets List of already converted static rulesets. It is
     * needed to apply $badfilter rules from dynamic rules to these rules from
     * converted filters.
     * @param options Options from {@link DeclarativeConverterOptions}.
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
     * @param filterFn If this function is specified, it will be applied to each
     * rule after it has been parsed and transformed. This function is needed
     * for example to apply $badfilter: to exclude negated rules from the array
     * of rules that will be returned.
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
            const { errors, rules } = scanner.getIndexedRules(filterFn);

            res.errors = res.errors.concat(errors);

            const badFilterRules = rules.filter(({ rule }) => {
                return rule instanceof NetworkRule && rule.isOptionEnabled(NetworkRuleOption.Badfilter);
            });

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

        converted.errors = scanned.errors;

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
                getSourceMap: async () => {
                    return new SourceMap(sourceMapValues);
                },
                getFilterList: async () => {
                    return [filter];
                },
                getDeclarativeRules: async () => {
                    return declarativeRules;
                },
                getRulesHashMap: async () => {
                    const values = rules.map((r) => ({
                        hash: r.hash,
                        source: {
                            sourceRuleIndex: r.index,
                            filterId,
                        },
                    }));

                    const rulesHashMap = new RulesHashMap(values);

                    return rulesHashMap;
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

        const allStaticBadFilterRules = DeclarativeFilterConverter.createBadFilterRulesHashMap(staticRuleSets);

        const checkRule = (r: IndexedRuleWithHash): boolean => {
            const fastMatchedBadFilterRules = allStaticBadFilterRules.get(r.hash);

            if (!fastMatchedBadFilterRules) {
                return false;
            }

            for (let i = 0; i < fastMatchedBadFilterRules.length; i += 1) {
                const rule = fastMatchedBadFilterRules[i];

                if (!(rule.rule instanceof NetworkRule) || !(r.rule instanceof NetworkRule)) {
                    return false;
                }

                const badFilterRule = rule.rule;
                const ruleToCheck = r.rule;

                if (badFilterRule.negatesBadfilter(ruleToCheck)) {
                    return true;
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
            getSourceMap: async () => {
                return new SourceMap(sourceMapValues);
            },
            getFilterList: async () => {
                return filterList;
            },
            getDeclarativeRules: async () => {
                return declarativeRules;
            },
            getRulesHashMap: async () => {
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

                return rulesHashMap;
            },
        };

        const dynamicBadFilterRules = scanned.filters
            .map(({ badFilterRules }) => badFilterRules)
            .flat();

        const ruleSet = new RuleSet(
            DeclarativeFilterConverter.COMBINED_RULESET_ID,
            declarativeRules.length,
            declarativeRules.filter((d) => d.condition.regexFilter).length,
            ruleSetContent,
            dynamicBadFilterRules,
        );

        const declarativeRulesToCancel = await DeclarativeFilterConverter.collectDeclarativeRulesToCancel(
            staticRuleSets,
            dynamicBadFilterRules,
        );

        return {
            ruleSets: [ruleSet],
            errors: errors.concat(scanned.errors),
            limitations,
            declarativeRulesToCancel,
        };
    }

    /**
     * Creates dictionary where key is hash of indexed rule and value is array
     * of rules with this hash.
     *
     * @param rulesets A list of IRuleSets for each of which a list of
     * $badfilter rules.
     *
     * @returns Dictionary with all $badfilter rules which are extracted from
     * rulesets.
     */
    private static createBadFilterRulesHashMap(
        rulesets: IRuleSet[],
    ): Map<number, IndexedRuleWithHash[]> {
        const allStaticBadFilterRules: Map<number, IndexedRuleWithHash[]> = new Map();

        rulesets.forEach((ruleSet) => {
            ruleSet.getBadFilterRules().forEach((r) => {
                const existingValue = allStaticBadFilterRules.get(r.hash);
                if (existingValue) {
                    existingValue.push(r);
                } else {
                    allStaticBadFilterRules.set(r.hash, [r]);
                }
            });
        });

        return allStaticBadFilterRules;
    }

    /**
     * Applies rules with $badfilter modifier from dynamic rulesets to all rules
     * from static rulesets and returns list of ids of declarative rules to
     * disable them.
     *
     * @param staticRuleSets List of converted static rulesets.
     * @param dynamicBadFilterRules List of rules with $badfilter.
     *
     * @returns List of ids of declarative rules to disable them.
     */
    private static async collectDeclarativeRulesToCancel(
        staticRuleSets: IRuleSet[],
        dynamicBadFilterRules: IndexedRuleWithHash[],
    ): Promise<UpdateStaticRulesOptions[]> {
        const declarativeRulesToCancel: UpdateStaticRulesOptions[] = [];

        // Check every static ruleset.
        for (let i = 0; i < staticRuleSets.length; i += 1) {
            const staticRuleSet = staticRuleSets[i];

            const disableRuleIds: number[] = [];

            // Check every rule with $badfilter from dynamic filters
            // (custom filter and user rules).
            for (let j = 0; j < dynamicBadFilterRules.length; j += 1) {
                const badFilterRule = dynamicBadFilterRules[j];
                // eslint-disable-next-line no-await-in-loop
                const hashMap = await staticRuleSet.getRulesHashMap();
                const fastMatchedRulesByHash = hashMap.findRules(badFilterRule.hash);

                if (fastMatchedRulesByHash.length === 0) {
                    continue;
                }

                // FIXME: Remove
                // eslint-disable-next-line max-len
                console.log(`rule ${badFilterRule.rule.getText()} matched ${JSON.stringify(fastMatchedRulesByHash[0])}`);

                // eslint-disable-next-line no-await-in-loop
                const ids = await Promise.all(
                    fastMatchedRulesByHash.map(async (source) => {
                        return staticRuleSet.getDeclarativeRulesIdsBySourceRuleIndex(source);
                    }),
                );
                const fastMatchedDeclarativeRulesIds = ids.flat();

                // FIXME: Should fix this ugly way.
                for (let k = 0; k < fastMatchedDeclarativeRulesIds.length; k += 1) {
                    const id = fastMatchedDeclarativeRulesIds[k];

                    // eslint-disable-next-line no-await-in-loop
                    const matchedSourceRules = await staticRuleSet.getRulesById(id);

                    // eslint-disable-next-line no-await-in-loop
                    const indexedRulesWithHash = await Promise.all(
                        matchedSourceRules.map((source) => {
                            return RuleSet.getNetworkRuleBySourceRule(source);
                        }),
                    );

                    // NOTE: Here we use .some but not .every to simplify first version
                    // of applying $badfilter rules.
                    const someRulesMatched = indexedRulesWithHash
                        .flat()
                        .some((r) => {
                            const { rule } = r;

                            if (rule instanceof NetworkRule && badFilterRule.rule instanceof NetworkRule) {
                                return badFilterRule.rule.negatesBadfilter(rule);
                            }

                            return false;
                        });

                    if (someRulesMatched) {
                        disableRuleIds.push(id);
                    }
                }
            }

            if (disableRuleIds.length > 0) {
                declarativeRulesToCancel.push({
                    rulesetId: staticRuleSet.getId(),
                    disableRuleIds,
                });
            }
        }

        return declarativeRulesToCancel;
    }
}
