import { fastHash } from '../utils/string-utils';
import { NetworkRule } from './network-rule';
import { IndexedRule, type IRule } from './rule';

/**
 * Rule with index and hash
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

    /** TODO: Description. */
    public static createRuleHash(indexedRule: IRule): number {
        if (indexedRule instanceof NetworkRule) {
            const networkRule = indexedRule;

            // FIXME: Improve this part (maybe use trie-lookup-table and .getShortcut()?)
            const significantPart = networkRule.getPattern();

            const hash = fastHash(significantPart);

            return hash;
        }

        // FIXME: Maybe return source text of rule?
        return fastHash(indexedRule.getText());
    }
}
