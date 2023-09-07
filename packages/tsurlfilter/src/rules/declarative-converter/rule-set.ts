import { NetworkRule } from '../network-rule';

import { IndexedRuleWithHash } from './indexed-rule-with-hash';
import { DeclarativeRule } from './declarative-rule';
import { IFilter } from './filter';
import { UnavailableRuleSetSourceError } from './errors/unavailable-sources-errors/unavailable-rule-set-source-error';
import { ISourceMap, SourceRuleIdxAndFilterId } from './source-map';
import { IRulesHashMap } from './rules-hash-map';

/**
 * The OriginalSource contains the text of the original rule and the filter
 * identifier of that rule.
 */
export type SourceRuleAndFilterId = {
    sourceRule: string,
    filterId: number,
};

/**
 * Describes object of ruleset id with list of ids of declarative rules. Needs
 * to disable declarative rules from static ruleset by applying $badfilter rules
 * from dynamic rulesets.
 */
export type UpdateStaticRulesOptions = {
    rulesetId: string,
    disableRuleIds: number[],
};

/**
 * Keeps converted declarative rules and source map for it.
 */
export interface IRuleSet {
    /**
     * Number of converted declarative rules.
     */
    getRulesCount(): number;

    /**
     * Number of converted declarative regexp rules.
     */
    getRegexpRulesCount(): number;

    /**
     * Returns rule set id.
     */
    getId(): string;

    /**
     * Returns a list of pairs of source text rules and their filter identifiers
     * for a given declarative rule identifier.
     *
     * @param declarativeRuleId {@link DeclarativeRule|declarative rule} Id.
     *
     * @returns Promise with list of source rules.
     *
     * @throws Error {@link UnavailableRuleSetSourceError} if rule set source
     * is not available.
     */
    getRulesById(declarativeRuleId: number): Promise<SourceRuleAndFilterId[]>;

    /**
     * Returns list of network rules with $badfilter option.
     */
    getBadFilterRules(): IndexedRuleWithHash[];

    /**
     * Returns dictionary with hashes of all ruleset's source rules.
     */
    getRulesHashMap(): IRulesHashMap;

    /**
     * For provided source return list of ids of converted declarative rule.
     *
     * @param source Source rule index and filter id.
     */
    getDeclarativeRulesIdsBySourceRuleIndex(
        source: SourceRuleIdxAndFilterId,
    ): Promise<number[]>;

    /**
     * Serializes rule set to primitives values with lazy load.
     *
     * @returns Serialized rule set.
     *
     * @throws Error {@link UnavailableRuleSetSourceError} if rule set source
     * is not available.
     */
    serialize(): Promise<SerializedRuleSet>;
}

/**
 * Rule set content's provider.
 */
export type RuleSetContentProvider = {
    getSourceMap: () => Promise<ISourceMap>,
    getFilterList: () => Promise<IFilter[]>,
    getDeclarativeRules: () => Promise<DeclarativeRule[]>,
};

/**
 * A serialized rule set with primitive values.
 */
export type SerializedRuleSet = {
    id: string,
    declarativeRules: DeclarativeRule[],
    regexpRulesCount: number,
    rulesCount: number,
    sourceMapRaw: string,
    ruleSetHashMapRaw: string,
    filterListsIds: number[],
    badFilterRules: string[],
};

/**
 * Keeps converted declarative rules, counters of rules and source map for them.
 */
export class RuleSet implements IRuleSet {
    /**
     * Id of rule set.
     */
    private readonly id: string;

    /**
     * Array of converted declarative rules.
     */
    private declarativeRules: DeclarativeRule[] = [];

    /**
     * Number of converted declarative rules.
     * This is needed for the lazy version of the rule set,
     * when content not loaded.
     */
    private readonly rulesCount: number = 0;

    /**
     * Converted declarative regexp rules.
     */
    private readonly regexpRulesCount: number = 0;

    /**
     * Source map for declarative rules.
     */
    private sourceMap: ISourceMap | undefined;

    /**
     * Dictionary which helps to fast find rule by it's hash.
     */
    private rulesHashMap: IRulesHashMap;

    /**
     * List of network rules with $badfilter option.
     */
    private badFilterRules: IndexedRuleWithHash[];

    /**
     * Keeps array of source filter lists
     * TODO: ? May it leads to memory leaks,
     * because one FilterList with its content
     * can be in the several RuleSet's at the same time ?
     */
    private filterList: Map<number, IFilter> = new Map();

    /**
     * The content provider of a rule set, is needed for lazy initialization.
     * If request the source rules from rule set, the content provider will be
     * called to load the source map, filter list and declarative rules list.
     */
    private readonly ruleSetContentProvider: RuleSetContentProvider;

    /**
     * Whether the content is loaded or not.
     */
    private initialized: boolean = false;

    /**
     * Constructor of RuleSet.
     *
     * @param id Id of rule set.
     * @param rulesCount Number of rules.
     * @param regexpRulesCount Number of regexp rules.
     * @param ruleSetContentProvider Rule set content provider.
     * @param badFilterRules List of rules with $badfilter modifier.
     * @param rulesHashMap Dictionary with hashes for all source rules.
     */
    constructor(
        id: string,
        rulesCount: number,
        regexpRulesCount: number,
        ruleSetContentProvider: RuleSetContentProvider,
        badFilterRules: IndexedRuleWithHash[],
        rulesHashMap: IRulesHashMap,
    ) {
        this.id = id;
        this.rulesCount = rulesCount;
        this.regexpRulesCount = regexpRulesCount;
        this.ruleSetContentProvider = ruleSetContentProvider;
        this.badFilterRules = badFilterRules;
        this.rulesHashMap = rulesHashMap;
    }

    /**
     * Number of converted declarative rules.
     *
     * @returns Number of converted declarative rules.
     */
    public getRulesCount(): number {
        return this.rulesCount || this.declarativeRules.length;
    }

    /**
     * Number of converted declarative regexp rules.
     *
     * @returns Number of converted declarative regexp rules.
     */
    public getRegexpRulesCount(): number {
        return this.regexpRulesCount;
    }

    /**
     * Rule set id.
     *
     * @returns Rule set id.
     */
    public getId(): string {
        return this.id;
    }

    /**
     * Returns a list of pairs of source text rules and their filter identifiers
     * for a given declarative rule identifier.
     *
     * @param declarativeRuleId {@link DeclarativeRule|declarative rule} Id.
     *
     * @throws An error when filter is not found or filter content is unavailable.
     *
     * @returns Promise with list of source rules.
     */
    private findSourceRules(declarativeRuleId: number): Promise<SourceRuleAndFilterId[]> {
        if (!this.sourceMap) {
            return Promise.resolve([]);
        }

        const sourcePairs = this.sourceMap.getByDeclarativeRuleId(declarativeRuleId);
        const sourceRules = sourcePairs.map(async ({
            filterId,
            sourceRuleIndex,
        }) => {
            const filter = this.filterList.get(filterId);
            if (!filter) {
                throw new Error(`Not found filter list with id: ${filterId}`);
            }

            const sourceRule = await filter.getRuleByIndex(sourceRuleIndex);

            return {
                sourceRule,
                filterId,
            };
        });

        return Promise.all(sourceRules);
    }

    /**
     * Run inner deserialization from rule set content provider to load
     * the source map, filter list and declarative rules list.
     */
    private async loadContent(): Promise<void> {
        if (this.initialized) {
            return;
        }

        const {
            getSourceMap,
            getFilterList,
            getDeclarativeRules,
        } = this.ruleSetContentProvider;

        this.sourceMap = await getSourceMap();
        this.declarativeRules = await getDeclarativeRules();
        const filtersList = await getFilterList();
        filtersList.forEach((filter) => {
            this.filterList.set(filter.getId(), filter);
        });

        this.initialized = true;
    }

    // eslint-disable-next-line jsdoc/require-param, jsdoc/require-description, jsdoc/require-jsdoc
    public async getRulesById(declarativeRuleId: number): Promise<SourceRuleAndFilterId[]> {
        try {
            if (!this.initialized) {
                await this.loadContent();
            }

            const originalRules = await this.findSourceRules(declarativeRuleId);

            return originalRules;
        } catch (e) {
            const id = this.getId();
            // eslint-disable-next-line max-len
            const msg = `Cannot extract source rule for given declarativeRuleId ${declarativeRuleId} in rule set '${id}'`;
            throw new UnavailableRuleSetSourceError(msg, id, e as Error);
        }
    }

    // eslint-disable-next-line jsdoc/require-param, jsdoc/require-description, jsdoc/require-jsdoc
    public getBadFilterRules(): IndexedRuleWithHash[] {
        return this.badFilterRules;
    }

    // eslint-disable-next-line jsdoc/require-param, jsdoc/require-description, jsdoc/require-jsdoc
    public getRulesHashMap(): IRulesHashMap {
        return this.rulesHashMap;
    }

    // eslint-disable-next-line jsdoc/require-param, jsdoc/require-description, jsdoc/require-jsdoc
    public async getDeclarativeRulesIdsBySourceRuleIndex(
        source: SourceRuleIdxAndFilterId,
    ): Promise<number[]> {
        if (!this.initialized) {
            await this.loadContent();
        }

        if (!this.sourceMap) {
            throw Error();
        }

        return this.sourceMap.getBySourceRuleIndex(source) || [];
    }

    /**
     * For provided source rule and filter id return network rule.
     *
     * @param source Source rule and filter id.
     *
     * @returns List of {@link NetworkRule}.
     */
    public static getNetworkRuleBySourceRule(
        source: SourceRuleAndFilterId,
    ): NetworkRule[] {
        const { sourceRule, filterId } = source;

        let indexedRulesWithHash: IndexedRuleWithHash[] = [];

        try {
            // We don't need line index because this indexedRulesWithHash will
            // be used only for matching $badfilter rules.
            indexedRulesWithHash = IndexedRuleWithHash.createFromRawString(
                filterId,
                0,
                sourceRule,
            );
        } catch (e) {
            return [];
        }

        const networkRules = indexedRulesWithHash
            .map(({ rule }) => rule)
            .filter((rule): rule is NetworkRule => rule instanceof NetworkRule);

        return networkRules;
    }

    // eslint-disable-next-line jsdoc/require-param, jsdoc/require-description, jsdoc/require-jsdoc
    public async serialize(): Promise<SerializedRuleSet> {
        try {
            await this.loadContent();
        } catch (e) {
            const id = this.getId();
            const msg = `Cannot serialize rule set '${id}' because of not `
            + 'available source';
            throw new UnavailableRuleSetSourceError(msg, id, e as Error);
        }

        const serialized: SerializedRuleSet = {
            id: this.id,
            declarativeRules: this.declarativeRules,
            regexpRulesCount: this.regexpRulesCount,
            rulesCount: this.rulesCount,
            sourceMapRaw: this.sourceMap?.serialize() || '',
            filterListsIds: Array.from(this.filterList.keys()),
            ruleSetHashMapRaw: this.rulesHashMap.serialize(),
            badFilterRules: this.badFilterRules.map((r) => r.rule.getText()) || [],
        };

        return serialized;
    }
}
