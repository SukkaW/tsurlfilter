/**
 * @file Describes the conversion from a filter list {@link IFilter}
 * to rule sets {@link IRuleSet} with declarative rules {@link DeclarativeRule}.
 */

import {
    IRuleSet,
    RuleSetContentProvider,
    RuleSet,
    UpdateStaticRulesOptions,
} from './rule-set';
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
import { RulesHashMap } from './rules-hash-map';
import { IndexedNetworkRuleWithHash } from './network-indexed-rule-with-hash';
import { type ConvertedRules } from './converted-result';
import { NetworkRulesScanner, ScannedFilter } from './network-rules-scanner';

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
    convertStaticRuleSet(
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
    convertDynamicRuleSets(
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

    // eslint-disable-next-line max-len
    // eslint-disable-next-line jsdoc/require-param, class-methods-use-this, jsdoc/require-description, jsdoc/require-jsdoc
    public async convertStaticRuleSet(
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

        const scanned = await NetworkRulesScanner.scanRules([filter]);

        converted.errors = scanned.errors;

        scanned.filters.forEach((filterIdWithRules: ScannedFilter) => {
            const convertedRules = DeclarativeRulesConverter.convert(
                [filterIdWithRules],
                options,
            );

            const conversionResult = DeclarativeFilterConverter.collectConvertedResult(
                [filter],
                [filterIdWithRules],
                convertedRules,
                filterIdWithRules.badFilterRules,
            );

            converted.ruleSets = converted.ruleSets.concat(conversionResult.ruleSets);
            converted.errors = converted.errors.concat(conversionResult.errors);
            if (conversionResult.limitations.length > 0) {
                converted.limitations = converted.limitations.concat(conversionResult.limitations);
            }
        });

        return converted;
    }

    // eslint-disable-next-line max-len
    // eslint-disable-next-line jsdoc/require-param, class-methods-use-this, jsdoc/require-description, jsdoc/require-jsdoc
    public async convertDynamicRuleSets(
        filterList: IFilter[],
        staticRuleSets: IRuleSet[],
        options?: DeclarativeConverterOptions,
    ): Promise<ConversionResult> {
        if (options) {
            DeclarativeFilterConverter.checkConverterOptions(options);
        }

        const allStaticBadFilterRules = DeclarativeFilterConverter.createBadFilterRulesHashMap(staticRuleSets);

        const skipNegatedRulesFn = (r: IndexedNetworkRuleWithHash): boolean => {
            const fastMatchedBadFilterRules = allStaticBadFilterRules.get(r.hash);

            if (!fastMatchedBadFilterRules) {
                return true;
            }

            for (let i = 0; i < fastMatchedBadFilterRules.length; i += 1) {
                const rule = fastMatchedBadFilterRules[i];

                const badFilterRule = rule.rule;
                const ruleToCheck = r.rule;

                if (badFilterRule.negatesBadfilter(ruleToCheck)) {
                    return false;
                }
            }

            return true;
        };

        // Note: if we drop some rules because of applying $badfilter - we
        // cannot show info about it to user.
        const scanned = await NetworkRulesScanner.scanRules(filterList, skipNegatedRulesFn);

        const convertedRules = DeclarativeRulesConverter.convert(
            scanned.filters,
            options,
        );

        const dynamicBadFilterRules = scanned.filters
            .map(({ badFilterRules }) => badFilterRules)
            .flat();

        const conversionResult = DeclarativeFilterConverter.collectConvertedResult(
            filterList,
            scanned.filters,
            convertedRules,
            dynamicBadFilterRules,
        );

        conversionResult.errors = conversionResult.errors.concat(scanned.errors);

        const declarativeRulesToCancel = await DeclarativeFilterConverter.collectDeclarativeRulesToCancel(
            staticRuleSets,
            dynamicBadFilterRules,
        );

        conversionResult.declarativeRulesToCancel = declarativeRulesToCancel;

        return conversionResult;
    }

    /**
     * Collects {@link ConversionResult} from provided list of raw filters,
     * scanned filters, converted rules and bad filter rules.
     * Creates new {@link RuleSet} and wrap all data for {@link RuleSetContentProvider}.
     *
     * @param filterList List of raw filters.
     * @param scannedFilters Already scanned filters.
     * @param convertedRules Converted rules.
     * @param badFilterRules List of rules with $badfilter modifier.
     *
     * @returns Item of {@link ConversionResult}.
     */
    private static collectConvertedResult(
        filterList: IFilter[],
        scannedFilters: ScannedFilter[],
        convertedRules: ConvertedRules,
        badFilterRules: IndexedNetworkRuleWithHash[],
    ): ConversionResult {
        const {
            sourceMapValues,
            declarativeRules,
            errors,
            limitations = [],
        } = convertedRules;

        const ruleSetContent: RuleSetContentProvider = {
            loadSourceMap: async () => new SourceMap(sourceMapValues),
            loadFilterList: async () => filterList,
            loadDeclarativeRules: async () => declarativeRules,
        };

        const listOfRulesWithHash = scannedFilters
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

        const rulesHashMap = new RulesHashMap(listOfRulesWithHash);

        const ruleSet = new RuleSet(
            DeclarativeFilterConverter.COMBINED_RULESET_ID,
            declarativeRules.length,
            declarativeRules.filter((d) => d.condition.regexFilter).length,
            ruleSetContent,
            badFilterRules,
            rulesHashMap,
        );

        return {
            ruleSets: [ruleSet],
            errors,
            limitations,
        };
    }

    /**
     * Creates dictionary where key is hash of indexed rule and value is array
     * of rules with this hash.
     *
     * @param ruleSets A list of IRuleSets for each of which a list of
     * $badfilter rules.
     *
     * @returns Dictionary with all $badfilter rules which are extracted from
     * rulesets.
     */
    private static createBadFilterRulesHashMap(
        ruleSets: IRuleSet[],
    ): Map<number, IndexedNetworkRuleWithHash[]> {
        const allStaticBadFilterRules: Map<number, IndexedNetworkRuleWithHash[]> = new Map();

        ruleSets.forEach((ruleSet) => {
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
        dynamicBadFilterRules: IndexedNetworkRuleWithHash[],
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
                const hashMap = staticRuleSet.getRulesHashMap();
                const fastMatchedRulesByHash = hashMap.findRules(badFilterRule.hash);

                if (fastMatchedRulesByHash.length === 0) {
                    continue;
                }

                // FIXME: Error catch
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

                    // FIXME: Error catch
                    // eslint-disable-next-line no-await-in-loop
                    const indexedNetworkRulesWithHash = await Promise.all(
                        matchedSourceRules.map((source) => {
                            return RuleSet.getNetworkRuleBySourceRule(source);
                        }),
                    );

                    // NOTE: Here we use .some but not .every to simplify first version
                    // of applying $badfilter rules.
                    const someRulesMatched = indexedNetworkRulesWithHash
                        .flat()
                        .some((rule) => badFilterRule.rule.negatesBadfilter(rule));

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
