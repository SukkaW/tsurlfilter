import { fastHash } from '../../utils/string-utils';
import { NetworkRule } from '../network-rule';
import { IndexedRule, type IRule } from '../rule';
import { RuleConverter } from '../rule-converter';
import { RuleFactory } from '../rule-factory';

/**
 * Rule with index and hash.
 */
export class IndexedRuleWithHash extends IndexedRule {
    /**
     * Rule's hash.
     */
    public hash: number;

    /**
     * Constructor.
     *
     * @param rule Item of {@link IRule}.
     * @param index Rule's index.
     * @param hash Hash of the rule.
     */
    constructor(rule: IRule, index: number, hash: number) {
        super(rule, index);

        this.hash = hash;
    }

    /**
     * Creates hash for pattern part of the network rule and return it.
     *
     * @param indexedRule Item of {@link IRule}.
     *
     * @returns Hash for patter prt of the network rule.
     */
    public static createRuleHash(indexedRule: IRule): number {
        if (!(indexedRule instanceof NetworkRule)) {
            // We don't need hash value for not network rule
            return 0;
        }

        const networkRule = indexedRule;
        // TODO: Improve this part: maybe use trie-lookup-table and .getShortcut()?
        // or use agtree to collect pattern + all enabled network options without values
        const significantPart = networkRule.getPattern();
        const hash = fastHash(significantPart);

        return hash;
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
            return new Error(`Unknown error during conversion rule to AG syntax: ${e}`);
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
            // Create IndexedRule from AG rule. These rules will be used in
            // declarative rules and we ignore cosmetic and host rules.
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
            return new Error(`Unknown error during creating indexed with hash from filter "${filterId}" and line "${lineIndex}". ${e}`);
        }
    }

    /**
     * Creates {@link IndexedRuleWithHash} from text string.
     *
     * @param filterId Filter's id from which rule was extracted.
     * @param lineIndex Line index of rule in that filter.
     * @param rawString Text string.
     *
     * @throws Error when rule cannot be converted to AG syntax or when indexed
     * rule cannot be created from the rule which is already converted to AG
     * syntax.
     *
     * @returns Item of {@link IndexedRuleWithHash}.
     */
    public static createFromRawString(
        filterId: number,
        lineIndex: number,
        rawString: string,
    ): IndexedRuleWithHash[] {
        // Try to convert to AG syntax.
        const rulesConvertedToAGSyntaxOrError = IndexedRuleWithHash.convertRuleToAGSyntax(rawString);
        if (rulesConvertedToAGSyntaxOrError instanceof Error) {
            throw rulesConvertedToAGSyntaxOrError;
        }

        const rules: IndexedRuleWithHash[] = [];

        const convertedAGRules = rulesConvertedToAGSyntaxOrError;
        // Now convert to IRule and then IndexedRule.
        for (let rulesIndex = 0; rulesIndex < convertedAGRules.length; rulesIndex += 1) {
            const ruleConvertedToAGSyntax = convertedAGRules[rulesIndex];

            const indexedRuleWithHashOrError = IndexedRuleWithHash.createIndexedRuleWithHash(
                filterId,
                lineIndex,
                ruleConvertedToAGSyntax,
            );

            if (indexedRuleWithHashOrError instanceof Error) {
                throw indexedRuleWithHashOrError;
            }

            rules.push(indexedRuleWithHashOrError);
        }

        return rules;
    }
}
