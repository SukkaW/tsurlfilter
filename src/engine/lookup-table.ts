import { Request } from '../request';
import { NetworkRule } from '../rules/network-rule';

export interface ILookupTable {
    matchAll(request: Request): NetworkRule[];

    addRule(rule: NetworkRule, storageIdx: number): boolean;

    getRulesCount(): number;
}
