import { ILookupTable } from './lookup-table';
import { RuleStorage } from '../../filterlist/rule-storage';
import { Request } from '../../request';
import { NetworkRule } from '../../rules/network-rule';
import { fastHash } from '../../utils/utils';

/**
 * Hostname lookup table.
 * For specific kind of rules like '||hostname^' and '||hostname/path' more simple algorithm with hashes is faster.
 */
export class HostnameLookupTable implements ILookupTable {
    /**
     * Domain lookup table. Key is the domain name hash.
     */
    private readonly hostnameLookupTable = new Map<number, number[]>();

    /**
     * Storage for the network filtering rules
     */
    private readonly ruleStorage: RuleStorage;

    /**
     * Creates a new instance
     *
     * @param storage rules storage. We store "rule indexes" in the lookup table which
     * can be used to retrieve the full rules from the storage.
     */
    constructor(storage: RuleStorage) {
        this.ruleStorage = storage;
    }

    addRule(rule: NetworkRule, storageIdx: number): boolean {
        const pattern = rule.getPattern();
        let hostname = '';
        if (pattern.startsWith('||') && pattern.endsWith('^')) {
            hostname = pattern.slice(2, pattern.length - 1);
        }

        if (pattern.startsWith('||') && pattern.indexOf('/') !== -1) {
            const end = pattern.indexOf('/');
            hostname = pattern.slice(2, end);
        }

        if (hostname.indexOf('*') !== -1) {
            return false;
        }

        if (hostname) {
            // TODO: check that this is a hostname (no symbols)
            const hash = fastHash(hostname);
            let rulesIndexes = this.hostnameLookupTable.get(hash);
            if (!rulesIndexes) {
                rulesIndexes = new Array<number>();
                this.hostnameLookupTable.set(hash, rulesIndexes);
            }
            rulesIndexes.push(storageIdx);
            return true;
        }

        return false;
    }

    // eslint-disable-next-line class-methods-use-this
    getRulesCount(): number {
        throw new Error('Not implemented');
    }

    matchAll(request: Request): NetworkRule[] {
        const result: NetworkRule[] = [];
        const domains = request.subdomains;
        for (let i = 0; i < domains.length; i += 1) {
            const hash = fastHash(domains[i]);
            const rulesIndexes = this.hostnameLookupTable.get(hash);
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
}
