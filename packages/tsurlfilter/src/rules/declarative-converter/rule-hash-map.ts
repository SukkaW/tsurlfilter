import { SourceRuleIdxAndFilterId } from './source-map';

// This type is using only to better description of code.
// FIXME: Check that hash always will be unique.
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
 * TODO: Description.
 * TODO: Maybe just extend Map?
 * FIXME: Create serializable class to remove keys and reduce usage of disk space.
 */
export class RulesHashMap implements IRulesHashMap {
    private map: RuleHashToRuleIdx = new Map();

    /**
     * TODO: Description.
     *
     * @param sources List of sources.
     * @param map
     * @param listOfValues
     */
    constructor(listOfValues: RuleWithHash[]) {
        listOfValues.forEach(({ hash, source }) => {
            const existingValue = this.map.get(hash);
            if (existingValue) {
                this.map.set(hash, existingValue.concat(source));
            } else {
                this.map.set(hash, [source]);
            }
        });
    }

    /**
     * TODO: Description.
     *
     * @param badFilterRule
     * @param filterId
     * @param badFilterRuleHash
     */
    findRules(badFilterRuleHash: number): SourceRuleIdxAndFilterId[] {
        return this.map.get(badFilterRuleHash) || [];
    }

    /**
     * Deserializes array of sources from string.
     *
     * @param sourceString The original map that was serialized into a string.
     *
     * @param mapString
     * @returns List of sources.
     */
    static deserializeSources(mapString: string): RuleHashToRuleIdx {
        return JSON.parse(mapString) as RuleHashToRuleIdx;
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
