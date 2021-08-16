import { Request } from '../request';
import { NetworkRule } from '../rules/network-rule';
import { MatchingResult } from './matching-result';
import { fastHash } from '../utils/utils';
import { RuleStorage } from '../filterlist/rule-storage';
import { DomainModifier } from '../modifiers/domain-modifier';
import { ScannerType } from '../filterlist/scanner/scanner-type';
import { ShortcutsLookupTable } from './shortcuts-lookup-table';

/**
 * NetworkEngine is the engine that supports quick search over network rules
 */
export class NetworkEngine {
    /**
     * Rule shortcut max length
     */
    private static SHORTCUT_LENGTH = 5;

    /**
     * Count of rules added to the engine
     */
    public rulesCount: number;

    /**
     * Storage for the network filtering rules
     */
    private ruleStorage: RuleStorage;

    /**
     * Domain lookup table. Key is the domain name hash.
     */
    private readonly domainsLookupTable: Map<number, number[]>;

    /**
     * Lookup table that relies on the rule shortcuts to speed up the search.
     */
    private readonly shortcutsLookupTable: ShortcutsLookupTable;

    /**
     * Rules for which we could not find a shortcut and could not place it to the shortcuts lookup table.
     */
    private otherRules: NetworkRule[];

    /**
     * Builds an instance of the network engine
     *
     * @param storage an object for a rules storage.
     * @param skipStorageScan create an instance without storage scanning.
     */
    constructor(storage: RuleStorage, skipStorageScan = false) {
        this.ruleStorage = storage;
        this.rulesCount = 0;
        this.domainsLookupTable = new Map<number, number[]>();
        this.shortcutsLookupTable = new ShortcutsLookupTable(storage, NetworkEngine.SHORTCUT_LENGTH);

        this.otherRules = [];

        if (skipStorageScan) {
            return;
        }

        const scanner = this.ruleStorage.createRuleStorageScanner(ScannerType.NetworkRules);

        while (scanner.scan()) {
            const indexedRule = scanner.getRule();
            if (indexedRule
                && indexedRule.rule instanceof NetworkRule) {
                this.addRule(indexedRule.rule, indexedRule.index);
            }
        }
    }

    /**
     * Match searches over all filtering rules loaded to the engine
     * It returns rule if a match was found alongside the matching rule
     *
     * @param request to check
     * @return rule matching request or null
     */
    match(request: Request): NetworkRule | null {
        const networkRules = this.matchAll(request);

        if (networkRules.length === 0) {
            return null;
        }

        const result = new MatchingResult(networkRules, null);
        return result.getBasicResult();
    }

    /**
     * Finds all rules matching the specified request regardless of the rule types
     * It will find both whitelist and blacklist rules
     *
     * @param request to check
     * @return array of matching rules
     */
    matchAll(request: Request): NetworkRule[] {
        // First check by shortcuts
        const result = this.matchShortcutsLookupTable(request);
        result.push(...this.matchDomainsLookupTable(request));

        // Now check other rules
        for (let i = 0; i < this.otherRules.length; i += 1) {
            const r = this.otherRules[i];
            if (r.match(request)) {
                result.push(r);
            }
        }

        return result;
    }

    /**
     * Adds rule to the network engine
     *
     * @param rule
     * @param storageIdx
     */
    public addRule(rule: NetworkRule, storageIdx: number): void {
        if (!this.addRuleToShortcutsTable(rule, storageIdx)) {
            if (!this.addRuleToDomainsTable(rule, storageIdx)) {
                if (!this.otherRules.includes(rule)) {
                    this.otherRules.push(rule);
                }
            }
        }

        this.rulesCount += 1;
    }

    /**
     * Finds all matching rules from the shortcuts lookup table
     *
     * @param request to check
     * @return array of matching rules
     */
    private matchShortcutsLookupTable(request: Request): NetworkRule[] {
        return this.shortcutsLookupTable.matchAll(request);
    }

    /**
     * Finds all matching rules from the domains lookup table
     *
     * @param request to check
     * @return array of matching rules
     */
    private matchDomainsLookupTable(request: Request): NetworkRule[] {
        const result: NetworkRule[] = [];

        if (!request.sourceHostname) {
            return result;
        }

        const domains = request.subdomains;
        if (request.hostname !== request.sourceHostname) {
            domains.push(...request.sourceSubdomains);
        }

        for (let i = 0; i < domains.length; i += 1) {
            const hash = fastHash(domains[i]);
            const rulesIndexes = this.domainsLookupTable.get(hash);
            if (rulesIndexes) {
                for (let j = 0; j < rulesIndexes.length; j += 1) {
                    const rule = this.ruleStorage.retrieveNetworkRule(rulesIndexes[j]);
                    if (rule && rule.match(request)) {
                        result.push(rule);
                    }
                }
            }
        }

        return result;
    }

    /**
     * Tries to add the rule to the domains lookup table.
     * returns true if it was added
     *
     * @param rule to add
     * @param storageIdx index
     * @return {boolean} true if the rule been added
     */
    private addRuleToShortcutsTable(rule: NetworkRule, storageIdx: number): boolean {
        if (this.shortcutsLookupTable.addRule(rule, storageIdx)) {
            return true;
        }

        return false;
    }

    /**
     * Tries to add the rule to the domains table.
     * returns true if it was added or false if it is not possible
     *
     * @param rule to add
     * @param storageIdx index
     * @return {boolean} true if the rule been added
     */
    private addRuleToDomainsTable(rule: NetworkRule, storageIdx: number): boolean {
        const permittedDomains = rule.getPermittedDomains();
        if (!permittedDomains || permittedDomains.length === 0) {
            return false;
        }

        const hasWildcardDomain = permittedDomains.some((d) => DomainModifier.isWildcardDomain(d));
        if (hasWildcardDomain) {
            return false;
        }

        permittedDomains.forEach((domain) => {
            const hash = fastHash(domain);

            // Add the rule to the lookup table
            let rulesIndexes = this.domainsLookupTable.get(hash);
            if (!rulesIndexes) {
                rulesIndexes = [];
            }
            rulesIndexes.push(storageIdx);
            this.domainsLookupTable.set(hash, rulesIndexes);
        });

        return true;
    }
}
