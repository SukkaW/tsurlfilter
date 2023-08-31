import { IndexedRuleWithHash } from '../indexed-rule-with-hash';

import { DeclarativeRule } from './declarative-rule';
import { IFilter } from './filter';
import { UnavailableRuleSetSourceError } from './errors/unavailable-sources-errors/unavailable-rule-set-source-error';
import { ISourceMap, SourceRuleIdxAndFilterId } from './source-map';
import { IRulesHashMap } from './rule-hash-map';

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
     */
    getRulesById(declarativeRuleId: number): Promise<SourceRuleAndFilterId[]>;

    getBadFilterRules(): IndexedRuleWithHash[];

    getRulesHashMap(): Promise<IRulesHashMap>;

    getDeclarativeRulesIdsBySourceRuleIndex(
        source: SourceRuleIdxAndFilterId,
    ): Promise<number[]>;

    /**
     * Serializes a rule set into primitive values.
     */
    serialize(): Promise<SerializedRuleSet>;
}

/**
 * Rule set content's provider.
 */
export type IRuleSetContentProvider = {
    getSourceMap: () => Promise<ISourceMap>,
    getFilterList: () => Promise<IFilter[]>,
    getDeclarativeRules: () => Promise<DeclarativeRule[]>,
    getRulesHashMap: () => Promise<IRulesHashMap>,
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
    badFiltersRules: IndexedRuleWithHash[],
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
     * TODO: Description.
     */
    private rulesHashMap: IRulesHashMap | undefined;

    /**
     * TODO: Description.
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
    private readonly ruleSetContentProvider: IRuleSetContentProvider;

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
     */
    constructor(
        id: string,
        rulesCount: number,
        regexpRulesCount: number,
        ruleSetContentProvider: IRuleSetContentProvider,
        badFilterRules: IndexedRuleWithHash[],
    ) {
        this.id = id;
        this.rulesCount = rulesCount;
        this.regexpRulesCount = regexpRulesCount;
        this.ruleSetContentProvider = ruleSetContentProvider;
        this.badFilterRules = badFilterRules;
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
     *
     * FIXME: Maybe we should load badFilterIds with hashes separately from other
     * part for better perfomance?
     */
    private async loadContent(): Promise<void> {
        if (this.initialized) {
            return;
        }

        const {
            getSourceMap,
            getFilterList,
            getDeclarativeRules,
            getRulesHashMap,
        } = this.ruleSetContentProvider;

        this.sourceMap = await getSourceMap();
        this.declarativeRules = await getDeclarativeRules();
        const filtersList = await getFilterList();
        filtersList.forEach((filter) => {
            this.filterList.set(filter.getId(), filter);
        });
        this.rulesHashMap = await getRulesHashMap();

        this.initialized = true;
    }

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
    public async getRulesById(declarativeRuleId: number): Promise<SourceRuleAndFilterId[]> {
        try {
            if (!this.initialized) {
                await this.loadContent();
            }

            const originalRules = await this.findSourceRules(declarativeRuleId);
            return originalRules;
        } catch (e) {
            const id = this.getId();
            const msg = 'Cannot extract source rule for given '
            + `declarativeRuleId ${declarativeRuleId} in rule set '${id}'`;
            throw new UnavailableRuleSetSourceError(msg, id, e as Error);
        }
    }

    /**
     * TODO: Description.
     */
    public getBadFilterRules(): IndexedRuleWithHash[] {
        return this.badFilterRules;
    }

    /**
     * TODO: Description.
     * TODO: Error catch.
     */
    public async getRulesHashMap(): Promise<IRulesHashMap> {
        if (!this.initialized) {
            await this.loadContent();
        }

        if (!this.rulesHashMap) {
            throw Error();
        }

        return this.rulesHashMap;
    }

    /**
     * TODO: Description.
     *
     * @param sourceRuleIndex
     * @param filterId
     * @param source
     */
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
     * Serializes rule set to primitives values with lazy load.
     *
     * @returns Serialized rule set.
     *
     * @throws Error {@link UnavailableRuleSetSourceError} if rule set source
     * is not available.
     */
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
            ruleSetHashMapRaw: this.rulesHashMap?.serialize() || '',
            badFiltersRules: this.badFilterRules || [],
        };

        return serialized;
    }
}
