import { LRUMap } from 'lru_map';
// eslint-disable-next-line import/no-named-default
// import { default as lruMap } from 'lru_map'; // or maybe import * as lru_map? i can never remember which
import { CosmeticEngine } from './cosmetic-engine/cosmetic-engine';
import { NetworkEngine } from './network-engine';
import { Request } from '../request';
import { MatchingResult } from './matching-result';
import { NetworkRule } from '../rules/network-rule';
import { RuleStorage } from '../filterlist/rule-storage';
import { CosmeticResult } from './cosmetic-engine/cosmetic-result';
import { CosmeticOption } from './cosmetic-option';
import { ScannerType } from '../filterlist/scanner/scanner-type';
import { IndexedStorageRule } from '../rules/rule';
import { CosmeticRule } from '../rules/cosmetic-rule';
import { RequestType } from '../request-type';

// const { LRUMap } = lruMap;

/**
 * Engine represents the filtering engine with all the loaded rules
 */
export class Engine {
    /**
     * Request's cache size
     * Used for both source rules and others
     */
    private static REQUEST_CACHE_SIZE = 100000;

    /**
     * Basic filtering rules engine
     */
    private readonly networkEngine: NetworkEngine;

    /**
     * Cosmetic rules engine
     */
    private readonly cosmeticEngine: CosmeticEngine;

    /**
     * Rules storage
     */
    private readonly ruleStorage: RuleStorage;

    /**
     * Source results cache
     */
    private readonly sourceResultCache: LRUMap<string, NetworkRule[]>;

    /**
     * Request results cache
     */
    private readonly resultCache: LRUMap<string, MatchingResult>;

    /**
     * Creates an instance of an Engine
     * Parses the filtering rules and creates a filtering engine of them
     *
     * @param ruleStorage storage
     * @param skipStorageScan create an instance without storage scanning
     * @throws
     */
    constructor(ruleStorage: RuleStorage, skipStorageScan = false) {
        this.ruleStorage = ruleStorage;
        this.networkEngine = new NetworkEngine(ruleStorage, skipStorageScan);
        this.cosmeticEngine = new CosmeticEngine(ruleStorage, skipStorageScan);
        this.sourceResultCache = new LRUMap<string, NetworkRule[]>(Engine.REQUEST_CACHE_SIZE);
        this.resultCache = new LRUMap<string, MatchingResult>(Engine.REQUEST_CACHE_SIZE);
    }

    /**
     * Loads rules to engine
     */
    loadRules(): void {
        const scanner = this.ruleStorage.createRuleStorageScanner(ScannerType.NetworkRules | ScannerType.CosmeticRules);

        while (scanner.scan()) {
            this.addRule(scanner.getRule());
        }
    }

    /**
     * Async loads rules to engine
     *
     * @param chunkSize size of rules chunk to load at a time
     */
    async loadRulesAsync(chunkSize: number): Promise<void> {
        const scanner = this.ruleStorage.createRuleStorageScanner(ScannerType.NetworkRules | ScannerType.CosmeticRules);

        let counter = 0;
        while (scanner.scan()) {
            counter += 1;

            if (counter >= chunkSize) {
                counter = 0;

                /**
                 * In some cases UI thread becomes blocked while adding rules to engine,
                 * that't why we create filter rules using chunks of the specified length
                 * Rules creation is rather slow operation so we should
                 * use setTimeout calls to give UI thread some time.
                 */
                // eslint-disable-next-line no-await-in-loop
                await new Promise((resolve) => setTimeout(resolve, 1));
            }

            this.addRule(scanner.getRule());
        }
    }

    /**
     * Matches the specified request against the filtering engine and returns the matching result.
     *
     * @param request - request to check
     * @return matching result
     */
    matchRequest(request: Request): MatchingResult {
        const cacheKey = `${request.url}#${request.sourceHostname}#${request.requestType}`;
        const res = this.resultCache.get(cacheKey);
        if (res) {
            return res;
        }

        const networkRules = this.networkEngine.matchAll(request);
        let sourceRules: NetworkRule[] = [];

        if (request.sourceUrl) {
            let rules = this.sourceResultCache.get(request.sourceUrl);
            if (!rules) {
                const sourceRequest = new Request(request.sourceUrl, '', RequestType.Document);
                rules = this.networkEngine.matchAll(sourceRequest);
                this.sourceResultCache.set(request.sourceUrl, rules);
            }
            sourceRules = rules;
        }

        const result = new MatchingResult(networkRules, sourceRules);
        this.resultCache.set(cacheKey, result);
        return result;
    }

    /**
     * Gets cosmetic result for the specified hostname and cosmetic options
     *
     * @param request host to check
     * @param option mask of enabled cosmetic types
     * @return cosmetic result
     */
    getCosmeticResult(request: Request, option: CosmeticOption): CosmeticResult {
        return this.cosmeticEngine.match(request, option);
    }

    /**
     * Gets rules count
     */
    getRulesCount(): number {
        return this.networkEngine.rulesCount + this.cosmeticEngine.rulesCount;
    }

    /**
     * Adds rules to engines
     *
     * @param indexedRule
     */
    private addRule(indexedRule: IndexedStorageRule | null): void {
        if (indexedRule) {
            if (indexedRule.rule instanceof NetworkRule) {
                this.networkEngine.addRule(indexedRule.rule, indexedRule.index);
            } else if (indexedRule.rule instanceof CosmeticRule) {
                this.cosmeticEngine.addRule(indexedRule.rule);
            }
        }
    }
}
