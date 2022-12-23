import { IndexedRule, IRule } from '../../rules/rule';
import { RuleFactory } from '../../rules/rule-factory';
import { ILineReader } from '../reader/line-reader';
import { CosmeticRule, CosmeticRuleType } from '../../rules/cosmetic-rule';
import { ScannerType } from './scanner-type';
import { NetworkRule } from '../../rules/network-rule';
import { RemoveHeaderModifier } from '../../modifiers/remove-header-modifier';

/**
 * Scanner configuration
 *
 * @param scannerType type of scanner
 * @param ignoreCosmetic if true, cosmetic rules will be ignored
 * @param ignoreJS if true, javascript cosmetic rules will be ignored
 * @param ignoreUnsafe if true, some `unsafe` rules will be ignored, $removeheader rules as an example
 */
export interface RuleScannerConfiguration {
    /**
     * Scanner type
     */
    scannerType: ScannerType;

    /**
     * if true, cosmetic rules will be ignored
     */
    ignoreCosmetic?: boolean;

    /**
     * if true, javascript cosmetic rules will be ignored
     */
    ignoreJS?: boolean;

    /**
     * if true, some `unsafe` rules will be ignored, $removeheader rules as an example
     */
    ignoreUnsafe?: boolean;
}

/**
 * Rule scanner implements an interface for reading filtering rules.
 */
export class RuleScanner {
    /**
     * Filter list ID
     */
    private readonly listId: number;

    /**
     * True if we should ignore cosmetic rules
     */
    private readonly ignoreCosmetic: boolean;

    /**
     * True if we should ignore javascript cosmetic rules
     */
    private readonly ignoreJS: boolean;

    /**
     * True if we should ignore unsafe rules, like $removeheader
     */
    private readonly ignoreUnsafe: boolean;

    /**
     * True if we should ignore network rules
     */
    private ignoreNetwork: boolean;

    /**
     * True if we should ignore host rules
     */
    private ignoreHost: boolean;

    /**
     * Reader object
     */
    private readonly reader: ILineReader;

    /**
     *  Current rule
     */
    private currentRule: IRule | null = null;

    /**
     * Index of the beginning of the current rule
     */
    private currentRuleIndex = 0;

    /**
     * Current position in the reader
     */
    private currentPos = 0;

    /**
     * NewRuleScanner returns a new RuleScanner to read from r.
     *
     * @param reader source of the filtering rules
     * @param listId filter list ID
     * @param configuration config object
     */

    constructor(reader: ILineReader, listId: number, configuration: RuleScannerConfiguration) {
        this.reader = reader;
        this.listId = listId;

        this.ignoreCosmetic = !!configuration.ignoreCosmetic
            || ((configuration.scannerType & ScannerType.CosmeticRules) !== ScannerType.CosmeticRules);
        this.ignoreNetwork = (configuration.scannerType & ScannerType.NetworkRules) !== ScannerType.NetworkRules;
        this.ignoreHost = (configuration.scannerType & ScannerType.HostRules) !== ScannerType.HostRules;

        this.ignoreJS = !!configuration.ignoreJS;
        this.ignoreUnsafe = !!configuration.ignoreUnsafe;
    }

    /**
     * Scan advances the RuleScanner to the next rule, which will then be available
     * through the Rule method.
     *
     * @return false when the scan stops, either by
     * reaching the end of the input or an error.
    */
    public scan(): boolean {
        while (true) {
            const lineIndex = this.currentPos;
            const line = this.readNextLine();
            if (line === null) {
                return false;
            }

            if (line) {
                const rule = RuleFactory.createRule(
                    line,
                    this.listId,
                    this.ignoreNetwork,
                    this.ignoreCosmetic,
                    this.ignoreHost,
                );

                if (rule && !this.isIgnored(rule)) {
                    this.currentRule = rule;
                    this.currentRuleIndex = lineIndex;
                    return true;
                }
            }
        }
    }

    /**
     * @return the most recent rule generated by a call to Scan, and the index of this rule's text.
     */
    public getRule(): IndexedRule | null {
        if (this.currentRule) {
            return new IndexedRule(this.currentRule, this.currentRuleIndex);
        }

        return null;
    }

    /**
     * Reads the next line and returns it
     *
     * @return next line string or null
     */
    private readNextLine(): string | null {
        const line = this.reader.readLine();

        if (line != null) {
            this.currentPos += line.length + 1;
            return line.trim();
        }

        return null;
    }

    /**
     * Checks if the rule should be ignored by this scanner
     *
     * @param rule to check
     * @return is rule ignored
     */
    private isIgnored(rule: IRule): boolean {
        if (!this.ignoreCosmetic && !this.ignoreJS && !this.ignoreUnsafe) {
            return false;
        }

        if (rule instanceof CosmeticRule) {
            if (this.ignoreCosmetic) {
                return true;
            }
            // Ignore JS type rules
            // TODO: in the future we may allow CSS rules and Scriptlets (except for "trusted" scriptlets)
            return (this.ignoreJS && rule.getType() === CosmeticRuleType.Js);
        }

        if (this.ignoreUnsafe) {
            if (rule instanceof NetworkRule) {
                if (rule.getAdvancedModifier() && (rule.getAdvancedModifier() instanceof RemoveHeaderModifier)) {
                    return true;
                }
            }
        }

        return false;
    }
}
