import { SourceRuleIdxAndFilterId } from './source-map';

// This type is using only to better description of code.
type RuleHash = number;

/**
 * Hash of source rule to fast check applicable of $badfilter rule.
 * Because hash can be not unique, we store list of values for each key
 * to prevent collisions.
 */
type RuleHashToRuleIdx = Map<RuleHash, SourceRuleIdxAndFilterId[]>;

type RuleWithHash = {
    hash: RuleHash,
    source: SourceRuleIdxAndFilterId,
};

export interface IRulesHashMap {
    /**
     * Checks if provided $badfilter rule can match some rule.
     *
     * @param badFilterRule Rule with $badfilter.
     *
     * @returns List of matched rules line id's.
     */
    findRules(badFilterRuleHash: number): SourceRuleIdxAndFilterId[];

    serialize(): string;
}

/**
 * Contains a dictionary where the key is the hash of the rule and the value is
 * a list of sources for the rule. Storing this dictionary is necessary for fast
 * rule matching, which can be negated by $badfilter.
 *
 * FIXME: Create serializable class to remove keys and reduce usage of disk space.
 */
export class RulesHashMap implements IRulesHashMap {
    private map: RuleHashToRuleIdx = new Map();

    /**
     * Creates new {@link RulesHashMap}.
     *
     * @param listOfRulesWithHash List of rules hashes and rules sources:
     * filter id with rule index.
     */
    constructor(listOfRulesWithHash: RuleWithHash[]) {
        listOfRulesWithHash.forEach(({ hash, source }) => {
            const existingValue = this.map.get(hash);
            if (existingValue) {
                this.map.set(hash, existingValue.concat(source));
            } else {
                this.map.set(hash, [source]);
            }
        });
    }

    /**
     * Tries to find rules with same hash and if found - returns theirs sources:
     * filter id and rule id.
     *
     * @param badFilterRuleHash Number hash of $badfilter rule to search rules
     * with same hash.
     *
     * @returns List of sources (filter id and rule id) of rules with same hash as
     * provided in parameter or empty array.
     */
    findRules(badFilterRuleHash: number): SourceRuleIdxAndFilterId[] {
        return this.map.get(badFilterRuleHash) || [];
    }

    /**
     * Deserializes dictionary from raw string.
     *
     * @param rawString The original dictionary that was serialized into a string.
     *
     * @returns Deserialized dictionary.
     */
    static deserializeSources(rawString: string): RuleHashToRuleIdx {
        return JSON.parse(rawString) as RuleHashToRuleIdx;
    }

    /**
     * Serializes source map to JSON string.
     *
     * @todo (TODO:) Can use protocol VLQ.
     *
     * @returns JSON string.
     */
    serialize(): string {
        return JSON.stringify(this.map);
    }
}
