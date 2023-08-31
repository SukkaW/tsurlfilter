import { IndexedRuleWithHash } from '../indexed-rule-with-hash';
import { NetworkRule, NetworkRuleOption } from '../network-rule';
import { RuleConverter } from '../rule-converter';
import { RuleFactory } from '../rule-factory';

import { IFilter } from './filter';

/**
 * IFilterScanner describes a method that should return indexed rules.
 */
interface IFilterScanner {
    getIndexedRules(): ScannedRulesWithErrors;
}

export type ScannedRulesWithErrors = {
    errors: Error[],
    rules: IndexedRuleWithHash[],
    badFilterRules: IndexedRuleWithHash[],
};

/**
 * FilterScanner returns indexed, only network rules from IFilter's content.
 */
export class FilterScanner implements IFilterScanner {
    // Filter's content
    private readonly filterContent: string[];

    // Filter's id
    private readonly filterId: number;

    /**
     * Constructor of FilterScanner.
     *
     * @param filterContent Filter rules.
     * @param filterId Filter id.
     */
    constructor(filterContent: string[], filterId: number) {
        this.filterContent = filterContent;
        this.filterId = filterId;
    }

    /**
     * Creates new filter scanner.
     *
     * @param filter From which filter the rules should be scanned.
     *
     * @returns New FilterScanner.
     */
    static async createNew(filter: IFilter): Promise<FilterScanner> {
        const content = await filter.getContent();

        return new FilterScanner(content, filter.getId());
    }

    /**
     * Converts a raw string rule to AG syntax (apply aliases, etc.). If an error
     * was detected during the conversion - return it.
     *
     * @param rawStringRule Raw string rule.
     *
     * @returns Rule converted to AG syntax or Error.
     */
    private static convertRuleToAGSyntax(rawStringRule: string): string[] | Error {
        // Try to convert to AG syntax.
        try {
            return RuleConverter.convertRule(rawStringRule);
        } catch (e: unknown) {
            if (e instanceof Error) {
                return e;
            }
            return new Error('Unknown error during conversion rule to AG syntax', { cause: e });
        }
    }

    /**
     * Create {@link IndexedRuleWithHash} from rule. If an error
     * was detected during the conversion - return it.
     *
     * @param filterId Filter id.
     * @param lineIndex Rule's line index in that filter.
     * @param ruleConvertedToAGSyntax Rule which was converted to AG syntax.
     *
     * @returns Item of {@link IndexedRuleWithHash} or Error.
     */
    private static createIndexedRuleWithHash(
        filterId: number,
        lineIndex: number,
        ruleConvertedToAGSyntax: string,
    ): IndexedRuleWithHash | Error {
        try {
            // Create IndexedRule from AG rule
            const rule = RuleFactory.createRule(
                ruleConvertedToAGSyntax,
                filterId,
                false,
                true, // ignore cosmetic rules
                true, // ignore host rules
                false, // throw exception on creating rule error.
            );

            if (!rule) {
                return new Error(`Cannot create IRule from filter "${filterId}" and line "${lineIndex}"`);
            }

            const hash = IndexedRuleWithHash.createRuleHash(rule);

            // If rule is not empty - pack to IndexedRule
            // and add it to the result array.
            const indexedRuleWithHash = new IndexedRuleWithHash(rule, lineIndex, hash);

            if (!indexedRuleWithHash) {
                // eslint-disable-next-line max-len
                return new Error(`Cannot create indexed rule with hash from filter "${filterId}" and line "${lineIndex}"`);
            }

            return indexedRuleWithHash;
        } catch (e: unknown) {
            if (e instanceof Error) {
                return e;
            }
            // eslint-disable-next-line max-len
            return new Error(`Unknown error during creating indexed with hash from filter "${filterId}" and line "${lineIndex}"`, { cause: e });
        }
    }

    /**
     * Gets the entire contents of the filter,
     * extracts only the network rules (ignore cosmetic and host rules)
     * and tries to convert each line into an indexed rule.
     *
     * @param filterFn If this function is specified, it will be applied to each
     * rule after it has been parsed and transformed. This function is needed
     * for example to apply $badfilter: to exclude negated rules from the array
     * of rules that will be returned.
     *
     * @returns List of indexed rules with filtered values,
     * if filterFn was specified.
     */
    public getIndexedRules(
        filterFn?: (r: IndexedRuleWithHash) => boolean,
    ): ScannedRulesWithErrors {
        const { filterContent, filterId } = this;

        const result: ScannedRulesWithErrors = {
            errors: [],
            rules: [],
            badFilterRules: [],
        };

        for (let lineIndex = 0; lineIndex < filterContent.length; lineIndex += 1) {
            const line = filterContent[lineIndex];
            if (!line) {
                continue;
            }

            // Try to convert to AG syntax.
            const rulesConvertedToAGSyntaxOrError = FilterScanner.convertRuleToAGSyntax(line);
            if (rulesConvertedToAGSyntaxOrError instanceof Error) {
                result.errors.push(rulesConvertedToAGSyntaxOrError);

                // Skip this line because it does not convert to AG syntax.
                continue;
            }

            const convertedAGRules = rulesConvertedToAGSyntaxOrError;
            // Now convert to IRule and then IndexedRule.
            for (let rulesIndex = 0; rulesIndex < convertedAGRules.length; rulesIndex += 1) {
                const ruleConvertedToAGSyntax = convertedAGRules[rulesIndex];

                const indexedRuleWithHashOrError = FilterScanner.createIndexedRuleWithHash(
                    filterId,
                    lineIndex,
                    ruleConvertedToAGSyntax,
                );

                if (indexedRuleWithHashOrError instanceof Error) {
                    result.errors.push(indexedRuleWithHashOrError);
                    continue;
                }

                if (filterFn && filterFn(indexedRuleWithHashOrError)) {
                    continue;
                }

                result.rules.push(indexedRuleWithHashOrError);

                const { rule } = indexedRuleWithHashOrError;
                if (rule instanceof NetworkRule && rule.isOptionEnabled(NetworkRuleOption.Badfilter)) {
                    result.badFilterRules.push(indexedRuleWithHashOrError);
                }
            }
        }

        return result;
    }
}
