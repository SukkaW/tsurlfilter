import { ILookupTable } from './lookup-table';
import { Request } from '../../request';
import { NetworkRule } from '../../rules/network-rule';

/**
 * Sequence scan lookup table of rules for which we could not find a shortcut
 * and could not place it to the shortcuts lookup table.
 * In common case of rule there is always a way to just check a rule.match().
 */
export class SeqScanLookupTable implements ILookupTable {
    /**
     * Rules for which we could not find a shortcut and could not place it to the shortcuts lookup table.
     */
    private rules: NetworkRule[] = [];

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    addRule(rule: NetworkRule, storageIdx: number): boolean {
        if (!this.rules.includes(rule)) {
            this.rules.push(rule);
            return true;
        }

        return false;
    }

    // eslint-disable-next-line class-methods-use-this
    getRulesCount(): number {
        throw new Error('Not implemented');
    }

    matchAll(request: Request): NetworkRule[] {
        const result = [];

        for (let i = 0; i < this.rules.length; i += 1) {
            const r = this.rules[i];
            if (r.match(request)) {
                result.push(r);
            }
        }

        return result;
    }
}
