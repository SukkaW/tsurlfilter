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

// TODO: Uncomment after debug.
// type SerializedSource = [
//     SourceRuleIdxAndFilterId['filterId'],
//     SourceRuleIdxAndFilterId['sourceRuleIndex'],
// ];

// type SerializedHashWithSource = [
//     RuleHash,
//     SerializedSource[],
// ];

export interface IRulesHashMap {
    /**
     * Tries to find rules with same hash and if found - returns theirs sources:
     * filter id and rule id.
     *
     * @param hash Number hash to search rules with same hash.
     *
     * @returns List of sources (filter id and rule id) of rules with same hash as
     * provided in parameter or empty array.
     */
    findRules(hash: number): SourceRuleIdxAndFilterId[];

    serialize(): string;
}

/**
 * Contains a dictionary where the key is the hash of the rule and the value is
 * a list of sources for the rule. Storing this dictionary is necessary for fast
 * rule matching, which can be negated by $badfilter.
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
                existingValue.push(source);
            } else {
                this.map.set(hash, [source]);
            }
        });
    }

    // eslint-disable-next-line jsdoc/require-param, jsdoc/require-description, jsdoc/require-jsdoc
    findRules(hash: number): SourceRuleIdxAndFilterId[] {
        return this.map.get(hash) || [];
    }

    /**
     * Deserializes dictionary from raw string.
     *
     * @param rawString The original dictionary that was serialized into a string.
     *
     * @returns Deserialized dictionary.
     */
    static deserializeSources(rawString: string): RuleWithHash[] {
        return JSON.parse(rawString);
    }

    /**
     * Serializes source map to JSON string.
     *
     * @todo (FIXME:) Create serializable class to remove keys and reduce usage of disk space.
     * @todo (TODO:) Can use protocol VLQ.
     *
     * @returns JSON string.
     */
    serialize(): string {
        const allValues = Array.from(this.map);

        const valuesAsPlainArray: RuleWithHash[] = allValues
            .map(([hash, sources]) => {
                return sources.map((source) => ({
                    hash,
                    source,
                }));
            })
            .flat();

        return JSON.stringify(valuesAsPlainArray);
    }

    // FIXME: Uncomment after debug.
    // serialize(): string {
    //     const arr = Array.from(this.map);

    //     const serializedValues: SerializedHashWithSource[] = arr.map(([hash, source]) => {
    //         const sources: SerializedSource[] = source.map((s) => {
    //             return [s.filterId, s.sourceRuleIndex];
    //         });

    //         return [hash, sources];
    //     });

    //     return JSON.stringify(serializedValues);
    // }
}
