import { Request } from '../request';
import { NetworkRule } from '../rules/network-rule';
import { RuleStorage } from '../filterlist/rule-storage';
// import { fastHash, fastHashBetween } from '../utils/utils';
// import * as rabinKarp from '../utils/rabin-karp';
import * as utils from '../utils/utils';
import { HashMap } from './hashmap';
import { ILookupTable } from './lookup-table';

/**
 * This class implements a very simple algorithm for speeding up the rules lookup.
 * In order to do this it does the following:
 *
 * 1. Builds a table hash(shortcut) <-> rule indexes array.
 * 2. For every request URL it takes all substrings of the same length as the shortcut.
 * 3. For every substring it retrieves rules that have the same shortcut.
 */
export class ShortcutsLookupTable implements ILookupTable {
    /**
     * Length of shotcuts that are used to build this table.
     */
    private readonly shortcutsLength: number;

    /**
     * Shortcuts lookup table. Key is the shortcut hash.
     */
    private readonly shortcutsLookupTable: HashMap;

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
        // this.shortcutsLookupTable = new Map<number, number[]>();
        this.shortcutsLookupTable = new HashMap(100000);
        this.shortcutsHistogram = new Map<number, number>();
    }

    /**
     * Finds all matching rules from the shortcuts lookup table
     *
     * @param request to check
     * @return array of matching rules
     */
    public matchAll(request: Request): NetworkRule[] {
        const hashes = ShortcutsLookupTable.hashes(request, this.shortcutsLength);
        const rulesIndexes = this.shortcutsLookupTable.getAll(hashes);
        return this.matchRules(request, rulesIndexes);
    }

    /**
     * Tries to add the rule to the domains lookup table.
     * returns true if it was added
     *
     * @param rule to add
     * @param storageIdx index
     * @return {boolean} true if the rule been added
     */
    public addRule(rule: NetworkRule, storageIdx: number): boolean {
        const shortcuts = this.getRuleShortcuts(rule);
        if (!shortcuts || shortcuts.length === 0) {
            return false;
        }

        // Find the applicable shortcut (the least used)
        let shortcutHash = -1;
        // Max int32
        let minCount = 2147483647;

        for (let i = 0; i < shortcuts.length; i += 1) {
            const hash = utils.fastHash(shortcuts[i]);
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

    private static hashes(request: Request, len: number): number[] {
        const hashes: number[] = [];

        let urlLen = request.urlLowercase.length;
        if (urlLen > NetworkRule.MAX_URL_MATCH_LENGTH) {
            urlLen = NetworkRule.MAX_URL_MATCH_LENGTH;
        }

        // const primeToPower = rabinKarp.PRIME_BASE ** len;

        // let hash = rabinKarp.calculateHashBetween(request.urlLowercase, 0, len);
        for (let i = 0; i <= urlLen - len; i += 1) {
            const hash = utils.fastHashBetween(request.urlLowercase, i, i + len);
            hashes.push(hash);

            // hash = hash * rabinKarp.PRIME_BASE
            //     - primeToPower * request.urlLowercase.charCodeAt(i)
            //     + request.urlLowercase.charCodeAt(i + len);
        }

        return hashes;
    }

    private matchRules(request: Request, rulesIndexes: number[] | undefined): NetworkRule[] {
        if (!rulesIndexes) {
            return [];
        }

        const result: NetworkRule[] = [];

        for (let j = 0; j < rulesIndexes.length; j += 1) {
            const idx = rulesIndexes[j];
            const rule = this.ruleStorage.retrieveNetworkRule(idx);
            if (rule && rule.match(request)) {
                result.push(rule);
            }
        }

        return result;
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
