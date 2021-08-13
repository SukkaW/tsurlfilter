import { RuleStorage } from '../filterlist/rule-storage';
import { Request } from '../request';
import { NetworkRule } from '../rules/network-rule';
import { TrieNode } from '../utils/trie';
import { ILookupTable } from './lookup-table';

export class TrieLookupTable implements ILookupTable {
    /**
     * Count of rules added to this lookup table.
     */
    private rulesCount = 0;

    /**
     * Storage for the network filtering rules
     */
    private readonly ruleStorage: RuleStorage;

    /**
     * Trie that stores rules' shortcuts.
     */
    private readonly trie: TrieNode;

    constructor(storage: RuleStorage) {
        this.ruleStorage = storage;
        this.trie = new TrieNode(0);
    }

    public matchAll(request: Request): NetworkRule[] {
        const rulesIndexes = this.traverse(request);
        return this.matchRules(request, rulesIndexes);
    }

    public addRule(rule: NetworkRule, storageIdx: number): boolean {
        const shortcut = rule.getShortcut();

        // TODO: why 4??
        if (!shortcut || shortcut.length < 4) {
            return false;
        }

        this.trie.add(shortcut, storageIdx);
        this.rulesCount += 1;
        return true;
    }

    public getRulesCount(): number {
        return this.rulesCount;
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

    private traverse(request: Request): number[] {
        const ruleIndexes: number[] = [];

        const url = request.urlLowercase;
        let urlLen = url.length;
        if (urlLen > NetworkRule.MAX_URL_MATCH_LENGTH) {
            urlLen = NetworkRule.MAX_URL_MATCH_LENGTH;
        }

        for (let i = 0; i <= urlLen; i += 1) {
            const result = this.trie.traverse(url, i);
            if (result) {
                ruleIndexes.push(...result);
            }
        }

        return ruleIndexes;
    }
}
