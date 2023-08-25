import scriptlets, { IConfiguration } from '@adguard/scriptlets';
import {
    AnyCosmeticRule,
    CosmeticRuleParser,
    CosmeticRuleSeparator,
    CosmeticRuleSeparatorUtils,
    CosmeticRuleType,
    CssTree,
    DomainList,
    DomainListParser,
    DomainUtils,
    QuoteUtils,
} from '@adguard/agtree';
import * as rule from './rule';
import { DomainModifier, PIPE_SEPARATOR } from '../modifiers/domain-modifier';
import { isString } from '../utils/string-utils';
import { getRelativeUrl } from '../utils/url';
import { SimpleRegex } from './simple-regex';
import { Request } from '../request';
import { Pattern } from './pattern';
import { config } from '../configuration';
import { EMPTY_STRING, WILDCARD } from '../common/constants';
import { hasValueWithBackslash, validateSelectorList } from './css/selector-tools';
import { getErrorMessage } from '../common/error';

const DOMAIN_MODIFIER = 'domain';
const PATH_MODIFIER = 'path';
const URL_MODIFIER = 'url';

/**
 * Init script params
 */
interface InitScriptParams {
    debug?: boolean,
    request?: Request,
}

/**
 * Get scriptlet data response type
 */
export type ScriptletData = {
    params: IConfiguration,
    func: (source: scriptlets.IConfiguration, args: string[]) => void
};

/**
 * Script data type
 */
type ScriptData = {
    code: string | null,
    debug?: boolean,
    domain?: string
};

/**
 * Represents the rule raws
 */
interface Raws {
    ruleText: string;
    bodyText: string;
}

/**
 * Represents the rule with raws (helper function return type)
 */
interface RuleWithRaws {
    ruleNode: AnyCosmeticRule;
    ruleRaws: Raws;
}

/**
 * Processed domain list
 */
interface ProcessedDomainList {
    restrictedDomains: string[];
    permittedDomains: string[];
}

/**
 * Processed cosmetic rule modifiers
 */
interface ProcessedModifiers {
    domainModifier?: ProcessedDomainList;
    pathModifier?: Pattern;
    urlModifier?: Pattern;
}

/**
 * Cosmetic rule validation result
 */
interface ValidationResult {
    isValid: boolean;
    isExtendedCss: boolean;
    errorMessage?: string;
}

/**
 * Implements a basic cosmetic rule.
 *
 * Cosmetic rules syntax are almost similar and looks like this:
 * ```
 * rule = [domains] "marker" content
 * domains = [domain0, domain1[, ...[, domainN]]]
 * ```
 *
 * The rule type is defined by the `marker` value, you can find the list of them
 * in the {@see CosmeticRuleMarker} enumeration.
 *
 * What matters, though, is what's in the `content` part of it.
 *
 * Examples:
 * * `example.org##.banner` -- element hiding rule
 * * `example.org#$#.banner { display: block; }` -- CSS rule
 * * `example.org#%#window.x=1;` -- JS rule
 * * `example.org#%#//scriptlet('scriptlet-name')` -- Scriptlet rule
 * * `example.org$$div[id="test"]` -- HTML filtering rule
 */
export class CosmeticRule implements rule.IRule {
    private readonly ruleText: string;

    private readonly filterListId: number;

    private readonly type: CosmeticRuleType;

    private readonly content: string;

    private allowlist = false;

    private extendedCss = false;

    private readonly permittedDomains: string[] | undefined = undefined;

    private readonly restrictedDomains: string[] | undefined = undefined;

    /**
     * $path modifier pattern. It is only set if $path modifier is specified for this rule.
     */
    public pathModifier: Pattern | undefined;

    /**
     * $url modifier pattern. It is only set if $url modifier is specified for this rule,
     * but $path and $domain modifiers are not.
     *
     * TODO add this to test cases
     */
    public urlModifier: Pattern | undefined;

    /**
     * Js script to execute
     */
    public script: string | undefined = undefined;

    /**
     * Object with script code ready to execute and debug, domain values
     * @private
     */
    private scriptData: ScriptData | null = null;

    /**
     * Object with scriptlet function and params
     * @private
     */
    private scriptletData: ScriptletData | null = null;

    /**
     * Scriptlet parameters
     */
    private scriptletParams: string[] | null = null;

    /**
     * If the rule contains scriptlet content
     */
    public isScriptlet = false;

    getText(): string {
        return this.ruleText;
    }

    getFilterListId(): number {
        return this.filterListId;
    }

    /**
     * Cosmetic rule type (always present)
     */
    getType(): CosmeticRuleType {
        return this.type;
    }

    /**
     * Allowlist means that this rule is meant to disable other rules.
     * For instance, https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#elemhide-exceptions
     */
    isAllowlist(): boolean {
        return this.allowlist;
    }

    /**
     * Gets the rule content. The meaning of this field depends on the rule type.
     * For instance, for an element hiding rule, this is just a CSS selector.
     * While, for a CSS rule, this is a CSS selector + style.
     */
    getContent(): string {
        return this.content;
    }

    /**
     * Returns script ready to execute or null
     * Rebuilds scriptlet script if debug or domain params change
     * @param options
     */
    getScript(options: InitScriptParams = {}): string | null {
        const { debug = false, request = null } = options;
        const { scriptData } = this;

        if (scriptData && !this.isScriptlet) {
            return scriptData.code;
        }

        if (scriptData && scriptData.debug === debug) {
            if (request) {
                if (request.domain === scriptData.domain) {
                    return scriptData.code;
                }
            } else {
                return scriptData.code;
            }
        }

        this.initScript(options);

        return this.scriptData?.code ?? null;
    }

    /**
     * Gets list of permitted domains.
     */
    getPermittedDomains(): string[] | undefined {
        return this.permittedDomains;
    }

    /**
     * Returns true if the rule is considered "generic"
     * "generic" means that the rule is not restricted to a limited set of domains
     * Please note that it might be forbidden on some domains, though.
     *
     * @return {boolean}
     */
    isGeneric(): boolean {
        return !this.permittedDomains || this.permittedDomains.length === 0;
    }

    /**
     * Gets list of restricted domains.
     */
    getRestrictedDomains(): string[] | undefined {
        return this.restrictedDomains;
    }

    isExtendedCss(): boolean {
        return this.extendedCss;
    }

    /**
     * Helper method to get the rule's raws. If the rule has its own raws, then
     * they are returned without any computation. Otherwise, the raws are generated
     * from the rule node, because we need the whole rule text & body text.
     *
     * @param ruleNode Cosmetic rule node
     * @returns Raw parts of the rule (rule text & body text) ({@see Raws})
     */
    private static getRuleRaws(ruleNode: AnyCosmeticRule): Raws {
        // Check if the rule has its own raws. If so, then we can just return them.
        if ((ruleNode.raws && ruleNode.raws.text) && (ruleNode.body.raw)) {
            return ({
                ruleText: ruleNode.raws.text,
                bodyText: ruleNode.body.raw,
            });
        }

        // If not, then we should generate them from the rule node.
        // Note: since we need the whole rule text & body text, we
        // need to generate rule parts separately in order to avoid
        // double generation of the body text.
        let ruleText = EMPTY_STRING;

        ruleText += CosmeticRuleParser.generatePattern(ruleNode);
        ruleText += ruleNode.separator.value;
        const bodyText = CosmeticRuleParser.generateBody(ruleNode);
        ruleText += bodyText;

        return ({
            ruleText,
            bodyText,
        });
    }

    /**
     * Helper method to get the rule's AST node and the corresponding raws.
     *
     * @param inputRule Input rule text or AST
     * @returns Rule AST node and raws ({@link RuleWithRaws})
     * @throws Error if the rule is not a valid cosmetic rule
     */
    private static getRuleAstAndRaws(inputRule: string | AnyCosmeticRule): RuleWithRaws {
        let ruleNode: AnyCosmeticRule;

        if (isString(inputRule)) {
            // Parse the rule - this will throw an error if the rule is syntactically invalid
            const parserResult = CosmeticRuleParser.parse(inputRule);

            // Parser might return null which means that the given rule isn't a
            // known cosmetic rule. In this case, we should throw an error.
            if (!parserResult) {
                throw new SyntaxError('Not a cosmetic rule');
            }

            ruleNode = parserResult;
        } else {
            // Clone the received rule node to avoid any side effects
            ruleNode = { ...inputRule };
        }

        // Get the rule raws
        const ruleRaws = CosmeticRule.getRuleRaws(ruleNode);

        return ({
            ruleNode,
            ruleRaws,
        });
    }

    /**
     * Processes domain list node, which means extracting permitted and restricted
     * domains from it.
     *
     * @param domainListNode Domain list node to process
     * @returns Processed domain list (permitted and restricted domains) ({@link ProcessedDomainList})
     */
    private static processDomainList(domainListNode: DomainList): ProcessedDomainList {
        const result: ProcessedDomainList = {
            permittedDomains: [],
            restrictedDomains: [],
        };

        const { children: domains } = domainListNode;

        for (const { exception, value: domain } of domains) {
            const domainLowerCased = domain.toLowerCase();

            if (exception) {
                result.restrictedDomains.push(domainLowerCased);
            } else {
                result.permittedDomains.push(domainLowerCased);
            }
        }

        return result;
    }

    /**
     * Processes cosmetic rule modifiers, e.g. `$path`.
     *
     * @param ast Cosmetic rule AST
     * @returns Processed modifiers ({@link ProcessedModifiers})
     * @see {@link https://adguard.com/kb/general/ad-filtering/create-own-filters/#modifiers-for-non-basic-type-of-rules}
     */
    private static processModifiers(ruleNode: AnyCosmeticRule): ProcessedModifiers {
        const result: ProcessedModifiers = {};

        // Do nothing if there are no modifiers in the rule node
        if (!ruleNode.modifiers) {
            return result;
        }

        // We don't allow duplicate modifiers, so we collect them in a set
        const usedModifiers = new Set<string>();

        // Destructure the modifiers array just for convenience
        const { children: modifierNodes } = ruleNode.modifiers;

        // AGTree parser tolerates this case: [$]example.com##.foo
        // but we should throw an error here if the modifier list is empty
        // (if the modifier list isn't specified at all, then ruleNode.modifiers
        // will be undefined, so we won't get here)
        if (modifierNodes.length < 1) {
            throw new SyntaxError("Modifiers list can't be empty");
        }

        for (const modifierNode of modifierNodes) {
            const modifierName = modifierNode.modifier.value;

            // Check if the modifier is already used
            if (usedModifiers.has(modifierName)) {
                throw new Error(`'$${modifierName}' modifier is used more than once`);
            }

            // Mark the modifier as used by adding it to the set
            usedModifiers.add(modifierName);

            const modifierValue = modifierNode.value?.value || EMPTY_STRING;

            // Every modifier should have a value at the moment, so for simplicity
            // we throw an error here if the modifier value is not present.
            // TODO: Change that if we decide to add modifiers without values
            if (modifierValue.length < 1 && modifierName !== PATH_MODIFIER) {
                throw new SyntaxError(`'$${modifierName}' modifier should have a value`);
            }

            // Process the modifier based on its name
            switch (modifierName) {
                case DOMAIN_MODIFIER:
                    if (ruleNode.domains.children.length > 0) {
                        throw new SyntaxError(`'$${modifierName}' modifier is not allowed in a domain-specific rule`);
                    }

                    result.domainModifier = CosmeticRule.processDomainList(
                        DomainListParser.parse(modifierValue, PIPE_SEPARATOR),
                    );
                    break;

                case PATH_MODIFIER:
                    result.pathModifier = new Pattern(
                        SimpleRegex.isRegexPattern(modifierValue)
                            // eslint-disable-next-line max-len
                            ? SimpleRegex.unescapeRegexSpecials(modifierValue, SimpleRegex.reModifierPatternEscapedSpecialCharacters)
                            : modifierValue,
                    );
                    break;

                case URL_MODIFIER:
                    if (ruleNode.domains.children.length > 0) {
                        throw new SyntaxError(`'$${modifierName}' modifier is not allowed in a domain-specific rule`);
                    }

                    result.urlModifier = new Pattern(
                        SimpleRegex.isRegexPattern(modifierValue)
                            // eslint-disable-next-line max-len
                            ? SimpleRegex.unescapeRegexSpecials(modifierValue, SimpleRegex.reModifierPatternEscapedSpecialCharacters)
                            : modifierValue,
                    );
                    break;

                // Don't allow unknown modifiers
                default:
                    throw new SyntaxError(`'$${modifierName}' modifier is not supported`);
            }
        }

        // $url modifier can't be used with other modifiers
        // TODO: Extend / change this check if we decide to add more such modifiers
        if (result.urlModifier && usedModifiers.size > 1) {
            throw new SyntaxError(`'$${URL_MODIFIER}' modifier cannot be used with other modifiers`);
        }

        return result;
    }

    /**
     * Validates cosmetic rule node.
     *
     * @param ruleNode Cosmetic rule node to validate
     * @returns Validation result ({@link ValidationResult})
     */
    private static validate(ruleNode: AnyCosmeticRule): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            isExtendedCss: false,
        };

        let scriptletName;
        let selectorListValidationResult;
        const { type: ruleType } = ruleNode;

        try {
            // Common validation: every cosmetic rule has a domain list
            if (ruleNode.domains?.children.length) {
                // Iterate over the domain list and check every domain
                for (const { value: domain } of ruleNode.domains.children) {
                    if (!DomainUtils.isValidDomainOrHostname(domain)) {
                        throw new SyntaxError(`'${domain}' is not a valid domain name`);
                    }
                }
            }

            // Type-specific validation
            switch (ruleType) {
                case CosmeticRuleType.ElementHidingRule:
                    selectorListValidationResult = validateSelectorList(ruleNode.body.selectorList);

                    if (!selectorListValidationResult.isValid) {
                        throw new SyntaxError(selectorListValidationResult.errorMessage);
                    }

                    // Detect ExtendedCss and unsupported pseudo-classes
                    result.isExtendedCss = selectorListValidationResult.isExtendedCss;
                    break;

                case CosmeticRuleType.CssInjectionRule:
                    selectorListValidationResult = validateSelectorList(ruleNode.body.selectorList);

                    if (!selectorListValidationResult.isValid) {
                        throw new SyntaxError(selectorListValidationResult.errorMessage);
                    }

                    // Detect ExtendedCss and unsupported pseudo-classes
                    result.isExtendedCss = selectorListValidationResult.isExtendedCss;

                    // Removal CSS injection rules has no declarations. Example:
                    // `#$#selector { remove: true; }`
                    // AGTree won't allow the following rule:
                    // `#$#selector { remove: true; padding: 0; }`
                    // because it mixes removal and non-removal declarations.
                    if (ruleNode.body.declarationList) {
                        // For safety reasons, we don't allow some CSS functions in CSS injection rules
                        if (CssTree.hasAnyForbiddenFunction(ruleNode.body.declarationList as any)) {
                            throw new SyntaxError(
                                'Unsafe resource loading functions are not allowed in CSS injection rules',
                            );
                        }

                        // For safety reasons, we don't allow backslashes in CSS injection rules, like
                        // this: `#$#selector { property: \75rl('http://example.com'); }`
                        if (hasValueWithBackslash(ruleNode.body.declarationList)) {
                            throw new SyntaxError(
                                'Backslashes are not allowed in declaration blocks of CSS injection rules',
                            );
                        }
                    }
                    break;

                case CosmeticRuleType.ScriptletInjectionRule:
                    // Scriptlet name is the first child of the parameter list
                    scriptletName = QuoteUtils.removeQuotes(ruleNode.body.children[0]?.children[0]?.value);

                    if (!scriptletName) {
                        throw new SyntaxError('Scriptlet name is not specified');
                    }

                    // Check if the scriptlet name is valid
                    if (!scriptlets.isValidScriptletName(scriptletName)) {
                        throw new SyntaxError(`'${scriptletName}' is not a valid scriptlet name`);
                    }
                    break;

                case CosmeticRuleType.HtmlFilteringRule:
                    // FIXME: AGTree's rule converter knows the validation rules for HTML filtering rules,
                    // so we should use it here instead of duplicating the logic.
                    break;

                case CosmeticRuleType.JsInjectionRule:
                    // Just ignore it for now, but we need this case to avoid throwing an error
                    break;

                default:
                    // Please note that the AST returned by the parser and converter cannot be invalid this way
                    /* istanbul ignore next */
                    throw new SyntaxError(`Unknown cosmetic rule type: '${ruleType}'`);
            }
        } catch (error: unknown) {
            result.isValid = false;
            result.errorMessage = getErrorMessage(error);
        }

        return result;
    }

    /**
     * Checks if the domain list contains any domains, but returns `false` if only
     * the wildcard domain is specified.
     *
     * @param domainListNode Domain list node to check
     * @returns `true` if the domain list contains any domains, `false` otherwise
     */
    private static isAnyDomainSpecified(domainListNode: DomainList): boolean {
        if (domainListNode.children.length > 0) {
            // Skip wildcard domain list (*)
            return !(domainListNode.children.length === 1 && domainListNode.children[0].value === WILDCARD);
        }

        return false;
    }

    /**
     * Creates an instance of the {@link CosmeticRule}.
     * It parses the rule and extracts the permitted/restricted domains,
     * and also the cosmetic rule's content.
     *
     * Depending on the rule type, the content might be transformed in
     * one of the helper classes, or kept as string when it's appropriate.
     *
     * Currently, the constructor can accept two types of input:
     * - Raw rule text (string)
     * - AGTree AST node of the rule
     *
     * If you pass a string, the constructor will parse it with AGTree first.
     *
     * In the long term, we plan to remove the ability to pass a string to the constructor
     * and change the type of the first argument to AST node only.
     *
     * @param inputRule - Raw rule text or AST node of the rule.
     * @param filterListId - ID of the filter list this rule belongs to.
     *
     * @throws error if it fails to parse the rule.
     *
     * @todo Remove type union and only accept AST node
     */
    constructor(inputRule: string | AnyCosmeticRule, filterListId: number) {
        // Parse the rule and get the raws
        const { ruleNode, ruleRaws } = CosmeticRule.getRuleAstAndRaws(inputRule);

        this.filterListId = filterListId;

        this.ruleText = ruleRaws.ruleText;
        this.content = ruleRaws.bodyText;

        this.allowlist = CosmeticRuleSeparatorUtils.isException(ruleNode.separator.value as CosmeticRuleSeparator);
        this.type = ruleNode.type;
        this.isScriptlet = ruleNode.type === CosmeticRuleType.ScriptletInjectionRule;

        // Store the scriptlet parameters. They will be used later, when we initialize the scriptlet,
        // but at this point we need to store them in order to avoid double parsing
        if (ruleNode.type === CosmeticRuleType.ScriptletInjectionRule) {
            // Perform some quick checks just in case
            if (ruleNode.body.children.length !== 1 || ruleNode.body.children[0].children.length < 1) {
                throw new SyntaxError('Scriptlet rule should have at least one parameter');
            }

            // Transform complex AST into a simple array of strings
            this.scriptletParams = ruleNode.body.children[0].children.map(
                ({ value }) => QuoteUtils.removeQuotes(value),
            );
        }

        const validationResult = CosmeticRule.validate(ruleNode);

        // We should throw an error if the validation failed for any reason
        if (!validationResult.isValid) {
            throw new SyntaxError(validationResult.errorMessage);
        }

        // Check if the rule is ExtendedCss
        const isExtendedCssSeparator = CosmeticRuleSeparatorUtils.isExtendedCssMarker(
            ruleNode.separator.value as CosmeticRuleSeparator,
        );

        this.extendedCss = isExtendedCssSeparator || validationResult.isExtendedCss;

        let permittedDomains: string[] = [];
        let restrictedDomains: string[] = [];

        // Process cosmetic rule modifiers
        const { domainModifier, pathModifier, urlModifier } = CosmeticRule.processModifiers(ruleNode);

        if (domainModifier) {
            permittedDomains = domainModifier.permittedDomains;
            restrictedDomains = domainModifier.restrictedDomains;
        }

        if (pathModifier) {
            this.pathModifier = pathModifier;
        }

        if (urlModifier) {
            this.urlModifier = urlModifier;
        }

        // Process domain list, if at least one domain is specified
        const { domains: domainListNode } = ruleNode;

        if (CosmeticRule.isAnyDomainSpecified(domainListNode)) {
            const processedDomainList = CosmeticRule.processDomainList(domainListNode);
            permittedDomains = processedDomainList.permittedDomains;
            restrictedDomains = processedDomainList.restrictedDomains;
        }

        // Only set the domain members if the corresponding domain list isn't empty
        if (restrictedDomains.length > 0) {
            this.restrictedDomains = restrictedDomains;
        }

        if (permittedDomains.length > 0) {
            this.permittedDomains = permittedDomains;
        }
    }

    /**
     * Match returns true if this rule can be used on the specified request.
     *
     * @param request - request to check
     */
    match(request: Request): boolean {
        if (!this.permittedDomains && !this.restrictedDomains && !this.pathModifier && !this.urlModifier) {
            return true;
        }

        if (this.urlModifier) {
            return this.urlModifier.matchPattern(request, false);
        }

        if (this.matchesRestrictedDomains(request.hostname)) {
            /**
             * Domain or host is restricted
             * i.e. ~example.org##rule
             */
            return false;
        }

        if (this.hasPermittedDomains()) {
            if (!DomainModifier.isDomainOrSubdomainOfAny(request.hostname, this.permittedDomains!)) {
                /**
                 * Domain is not among permitted
                 * i.e. example.org##rule and we're checking example.org
                 */
                return false;
            }
        }

        if (this.pathModifier) {
            const path = getRelativeUrl(request.urlLowercase);
            if (path) {
                return this.pathModifier.matchPathPattern(path);
            }

            return false;
        }

        return true;
    }

    /**
     * Checks if the rule has permitted domains
     */
    private hasPermittedDomains(): boolean {
        return this.permittedDomains != null && this.permittedDomains.length > 0;
    }

    /**
     * Checks if the rule has restricted domains
     */
    private hasRestrictedDomains(): boolean {
        return this.restrictedDomains != null && this.restrictedDomains.length > 0;
    }

    /**
     * Checks if the hostname matches permitted domains
     * @param hostname
     */
    public matchesPermittedDomains(hostname: string): boolean {
        return this.hasPermittedDomains() && DomainModifier.isDomainOrSubdomainOfAny(hostname, this.permittedDomains!);
    }

    /**
     * Checks if the hostname matches the restricted domains.
     * @param hostname
     */
    public matchesRestrictedDomains(hostname: string): boolean {
        return this.hasRestrictedDomains()
            && DomainModifier.isDomainOrSubdomainOfAny(hostname, this.restrictedDomains!);
    }

    /**
     * Returns the scriptlet's data consisting of the scriptlet function and its arguments.
     * This method is supposed to be used in the manifest V3 extension.
     */
    getScriptletData(): ScriptletData | null {
        if (this.scriptletData) {
            return this.scriptletData;
        }

        this.initScript();

        return this.scriptletData;
    }

    /**
     * Updates this.scriptData and if scriptlet this.scriptletData with js ready to execute
     *
     * @param options
     */
    initScript(options: InitScriptParams = {}) {
        const { debug = false, request = null } = options;

        const ruleContent = this.getContent();
        if (!this.isScriptlet) {
            this.scriptData = {
                code: ruleContent,
            };
            return;
        }

        // Check params before preparing just in case
        // Please note that the AST returned by the parser and converter cannot be invalid this way
        /* istanbul ignore if  */
        if (!this.scriptletParams) {
            throw new Error('Scriptlet params are not set');
        }

        /* istanbul ignore if  */
        if (this.scriptletParams.length < 1) {
            throw new Error('Scriptlet params are empty');
        }

        // Prepare scriptlet params
        const params: scriptlets.IConfiguration = {
            args: this.scriptletParams.slice(1),
            engine: config.engine || EMPTY_STRING,
            name: this.scriptletParams[0],
            ruleText: this.getText(),
            verbose: debug,
            domainName: request?.domain,
            version: config.version || EMPTY_STRING,
        };

        this.scriptData = {
            code: scriptlets.invoke(params) ?? null,
            debug,
            domain: request?.domain,
        };

        this.scriptletData = {
            func: scriptlets.getScriptletFunction(params.name),
            params,
        };
    }
}
