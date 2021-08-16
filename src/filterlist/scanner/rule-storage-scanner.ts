import { RuleScanner } from './rule-scanner';
import { IndexedStorageRule } from '../../rules/rule';

/**
 * RuleStorageScanner scans multiple RuleScanner instances
 * The rule index is built from the rule index in the list + the list ID
 * In the index number we consider decimal part as listId and integer part as ruleId
*/
export class RuleStorageScanner {
    private static MAX_LIST_ID = 10000;

    /**
     * Scanners is the list of list scanners backing this combined scanner
     */
    private readonly scanners: RuleScanner[];

    /**
     * Current scanner
     */
    private currentScanner: RuleScanner | null = null;

    /**
     * Index of the current scanner
     */
    private currentScannerIdx = -1;

    /**
     * Constructor
     *
     * @param scanners
     */
    constructor(scanners: RuleScanner[]) {
        this.scanners = scanners;
    }

    /**
     * Scan advances the RuleStorageScanner to the next rule, which will then be available
     * through the Rule method. It returns false when the scan stops, either by
     * reaching the end of the input or an error.
     *
     * @return true if there is some result
    */
    public scan(): boolean {
        if (this.scanners.length === 0) {
            return false;
        }

        if (!this.currentScanner) {
            this.currentScannerIdx = 0;
            this.currentScanner = this.scanners[this.currentScannerIdx];
        }

        while (true) {
            if (this.currentScanner.scan()) {
                return true;
            }

            // Take the next scanner or just return false if there's nothing more
            if (this.currentScannerIdx === (this.scanners.length - 1)) {
                return false;
            }

            this.currentScannerIdx += 1;
            this.currentScanner = this.scanners[this.currentScannerIdx];
        }
    }

    /**
     * Rule returns the most recent rule generated by a call to Scan, and the index of this rule.
     * See ruleListIdxToStorageIdx for more information on what this index is.
    */
    public getRule(): IndexedStorageRule | null {
        if (!this.currentScanner) {
            return null;
        }

        const rule = this.currentScanner.getRule();
        if (!rule) {
            return null;
        }

        const index = RuleStorageScanner.ruleListIdxToStorageIdx(rule.rule.getFilterListId(), rule.index);
        return new IndexedStorageRule(rule.rule, index);
    }

    /**
     * ruleListIdxToStorageIdx converts pair of listID and rule list index
     * to "storage index" number
     *
     * @param listId
     * @param ruleIdx
     */
    private static ruleListIdxToStorageIdx(listId: number, ruleIdx: number): number {
        return listId / RuleStorageScanner.MAX_LIST_ID + ruleIdx;
    }

    /**
     * Converts the "storage index" to two integers:
     * listID -- rule list identifier
     * ruleIdx -- index of the rule in the list
     *
     * @param storageIdx
     * @return [listId, ruleIdx]
     */
    public static storageIdxToRuleListIdx(storageIdx: number): [number, number] {
        const listId = Math.round((storageIdx % 1) * RuleStorageScanner.MAX_LIST_ID);
        const ruleIdx = Math.trunc(storageIdx);

        return [listId, ruleIdx];
    }
}
