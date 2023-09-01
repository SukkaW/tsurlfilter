import { fastHash } from '../utils/string-utils';
import { NetworkRule } from './network-rule';
import { IndexedRule, type IRule } from './rule';

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
}
