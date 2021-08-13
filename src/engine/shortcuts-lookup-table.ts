import { Request } from '../request';
import { NetworkRule } from '../rules/network-rule';
import { RuleStorage } from '../filterlist/rule-storage';
import { fastHash, fastHashBetween } from '../utils/utils';

/**
 * This class implements a very simple algorithm for speeding up the rules lookup.
 * In order to do this it does the following:
 *
 * 1. Builds a table hash(shortcut) <-> rule indexes array.
 * 2. For every request URL it takes all substrings of the same length as the shortcut.
 * 3. For every substring it retrieves rules that have the same shortcut.
 */
export class ShortcutsLookupTable {
    /**
     * Length of shotcuts that are used to build this table.
     */
    private readonly shortcutsLength: number;

    /**
     * Shortcuts lookup table. Key is the shortcut hash.
     */
    private readonly shortcutsLookupTable: Map<number, string[]>;

    /**
     * Shortcuts histogram helps us choose the best shortcut for the shortcuts lookup table.
     */
    private readonly shortcutsHistogram: Map<number, number>;

    /**
     * Count of rules added to this lookup table.
     */
    private rulesCount = 0;

    /**
     * Storage for the network filtering rules
     */
    private ruleStorage: RuleStorage;

    /**
     * Creates a new instance of the ShortcutsLookupTable.
     *
     * @param storage rules storage. We store "rule indexes" in the lookup table which
     * can be used to retrieve the full rules from the storage.
     * @param shortcutsLength length of the shortcuts that will be used to build the
     * lookup table.
     */
    constructor(storage: RuleStorage, shortcutsLength: number) {
        this.shortcutsLength = shortcutsLength;
        this.ruleStorage = storage;
        this.shortcutsLookupTable = new Map<number, string[]>();
        this.shortcutsHistogram = new Map<number, number>();
    }

    /**
     * Finds all matching rules from the shortcuts lookup table
     *
     * @param request to check
     * @return array of matching rules
     */
    public matchAll(request: Request): NetworkRule[] {
        const result: NetworkRule[] = [];

        let urlLen = request.urlLowercase.length;
        if (urlLen > NetworkRule.MAX_URL_MATCH_LENGTH) {
            urlLen = NetworkRule.MAX_URL_MATCH_LENGTH;
        }

        for (let i = 0; i <= urlLen - this.shortcutsLength; i += 1) {
            const hash = fastHashBetween(request.urlLowercase, i, i + this.shortcutsLength);
            const rulesIndexes = this.shortcutsLookupTable.get(hash);
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
    public addRule(rule: NetworkRule, storageIdx: string): boolean {
        const shortcuts = this.getRuleShortcuts(rule);
        if (!shortcuts || shortcuts.length === 0) {
            return false;
        }

        // Find the applicable shortcut (the least used)
        let shortcutHash = -1;
        // Max int32
        let minCount = 2147483647;

        for (let i = 0; i < shortcuts.length; i += 1) {
            const hash = fastHash(shortcuts[i]);
            let count = this.shortcutsHistogram.get(hash);
            if (!count) {
                count = 0;
            }

            if (count < minCount) {
                minCount = count;
                shortcutHash = hash;
            }
        }

        // Increment the histogram
        this.shortcutsHistogram.set(shortcutHash, minCount + 1);

        // Add the rule to the lookup table
        let rulesIndexes = this.shortcutsLookupTable.get(shortcutHash);
        if (!rulesIndexes) {
            rulesIndexes = [];
        }
        rulesIndexes.push(storageIdx);

        this.shortcutsLookupTable.set(shortcutHash, rulesIndexes);
        this.rulesCount += 1;
        return true;
    }

    public getRulesCount(): number {
        return this.rulesCount;
    }

    /**
     * Returns a list of shortcuts that can be used for the lookup table
     *
     * @param rule
     * @return array of shortcuts or null
     */
    private getRuleShortcuts(rule: NetworkRule): string[] | null {
        const shortcut = rule.getShortcut();
        if (shortcut.length < this.shortcutsLength) {
            return null;
        }

        if (ShortcutsLookupTable.isAnyURLShortcut(rule)) {
            return null;
        }

        const result: string[] = [];
        for (let i = 0; i < shortcut.length - this.shortcutsLength; i += 1) {
            const s = shortcut.substring(i, i + this.shortcutsLength);
            result.push(s);
        }

        return result;
    }

    /**
     * Checks if the rule potentially matches too many URLs.
     * We'd better use another type of lookup table for this kind of rules.
     *
     * @param rule to check
     * @return check result
     */
    private static isAnyURLShortcut(rule: NetworkRule): boolean {
        const shortcut = rule.getShortcut();

        // The numbers are basically ("PROTO://".length + 1)
        if (shortcut.length < 6 && shortcut.indexOf('ws:') === 0) {
            return true;
        }

        if (shortcut.length < 7 && shortcut.indexOf('|ws') === 0) {
            return true;
        }

        if (shortcut.length < 9 && shortcut.indexOf('http') === 0) {
            return true;
        }

        return !!(shortcut.length < 10 && shortcut.indexOf('|http') === 0);
    }
}
