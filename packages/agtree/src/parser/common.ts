import { type AdblockSyntax } from '../utils/adblockers';
import { type COMMA_DOMAIN_LIST_SEPARATOR, type PIPE_MODIFIER_SEPARATOR } from '../utils/constants';

/**
 * Represents possible logical expression operators.
 */
export type AnyOperator = '&&' | '||' | '!';

/**
 * Represents possible new line types.
 */
export type NewLine = 'crlf' | 'lf' | 'cr';

/**
 * Represents any kind of logical expression node.
 */
export type AnyExpressionNode =
    | ExpressionVariableNode
    | ExpressionOperatorNode
    | ExpressionParenthesisNode;

/**
 * Represents any kind of adblock rule.
 */
export type AnyRule =
    | EmptyRule
    | AnyCommentRule
    | AnyCosmeticRule
    | NetworkRule
    | InvalidRule;

/**
 * Represents any comment-like adblock rule.
 */
export type AnyCommentRule =
    | AgentCommentRule
    | CommentRule
    | ConfigCommentRule
    | HintCommentRule
    | MetadataCommentRule
    | PreProcessorCommentRule;

/**
 * Represents any cosmetic adblock rule.
 */
export type AnyCosmeticRule =
    | CssInjectionRule
    | ElementHidingRule
    | ScriptletInjectionRule
    | HtmlFilteringRule
    | JsInjectionRule;

/**
 * Represents the different comment markers that can be used in an adblock rule.
 *
 * @example
 * - If the rule is `! This is just a comment`, then the marker will be `!`.
 * - If the rule is `# This is just a comment`, then the marker will be `#`.
 */
export const enum CommentMarker {
    /**
     * Regular comment marker. It is supported by all ad blockers.
     */
    Regular = '!',

    /**
     * Hashmark comment marker. It is supported by uBlock Origin and AdGuard,
     * and also used in hosts files.
     */
    Hashmark = '#',
}

/**
 * Represents the main categories that an adblock rule can belong to.
 * Of course, these include additional subcategories.
 */
export const enum RuleCategory {
    /**
     * Empty "rules" that are only containing whitespaces. These rules are handled just for convenience.
     */
    Empty = 'Empty',

    /**
     * Syntactically invalid rules (tolerant mode only).
     */
    Invalid = 'Invalid',

    /**
     * Comment rules, such as comment rules, metadata rules, preprocessor rules, etc.
     */
    Comment = 'Comment',

    /**
     * Cosmetic rules, such as element hiding rules, CSS rules, scriptlet rules, HTML rules, and JS rules.
     */
    Cosmetic = 'Cosmetic',

    /**
     * Network rules, such as basic network rules, header remover network rules, redirect network rules,
     * response header filtering rules, etc.
     */
    Network = 'Network',
}

/**
 * Represents similar types of modifiers values
 * which may be separated by a comma `,` (only for DomainList) or a pipe `|`.
 */
export const enum ListNodeType {
    AppList = 'AppList',
    DomainList = 'DomainList',
    MethodList = 'MethodList',
    StealthOptionList = 'StealthOptionList',
}

/**
 * Represents child items for {@link ListNodeType}.
 */
export const enum ListItemNodeType {
    App = 'App',
    Domain = 'Domain',
    Method = 'Method',
    StealthOption = 'StealthOption',
}

/**
 * Represents possible comment types.
 */
export const enum CommentRuleType {
    AgentCommentRule = 'AgentCommentRule',
    CommentRule = 'CommentRule',
    ConfigCommentRule = 'ConfigCommentRule',
    HintCommentRule = 'HintCommentRule',
    MetadataCommentRule = 'MetadataCommentRule',
    PreProcessorCommentRule = 'PreProcessorCommentRule',
}

/**
 * Represents possible cosmetic rule types.
 */
export const enum CosmeticRuleType {
    ElementHidingRule = 'ElementHidingRule',
    CssInjectionRule = 'CssInjectionRule',
    ScriptletInjectionRule = 'ScriptletInjectionRule',
    HtmlFilteringRule = 'HtmlFilteringRule',
    JsInjectionRule = 'JsInjectionRule',
}

/**
 * Represents possible cosmetic rule separators.
 */
export const enum CosmeticRuleSeparator {
    /**
     * @see {@link https://help.eyeo.com/adblockplus/how-to-write-filters#elemhide_basic}
     */
    ElementHiding = '##',

    /**
     * @see {@link https://help.eyeo.com/adblockplus/how-to-write-filters#elemhide_basic}
     */
    ElementHidingException = '#@#',

    /**
     * @see {@link https://help.eyeo.com/adblockplus/how-to-write-filters#elemhide_basic}
     */
    ExtendedElementHiding = '#?#',

    /**
     * @see {@link https://help.eyeo.com/adblockplus/how-to-write-filters#elemhide_basic}
     */
    ExtendedElementHidingException = '#@?#',

    /**
     * @see {@link https://help.eyeo.com/adblockplus/how-to-write-filters#elemhide_basic}
     */
    AbpSnippet = '#$#',

    /**
     * @see {@link https://help.eyeo.com/adblockplus/how-to-write-filters#elemhide_basic}
     */
    AbpSnippetException = '#@$#',

    /**
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#cosmetic-css-rules}
     */
    AdgCssInjection = '#$#',

    /**
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#cosmetic-css-rules}
     */
    AdgCssInjectionException = '#@$#',

    /**
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#cosmetic-css-rules}
     */
    AdgExtendedCssInjection = '#$?#',

    /**
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#cosmetic-css-rules}
     */
    AdgExtendedCssInjectionException = '#@$?#',

    /**
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#scriptlets}
     */
    AdgJsInjection = '#%#',

    /**
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#scriptlets}
     */
    AdgJsInjectionException = '#@%#',

    /**
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#html-filtering-rules}
     */
    AdgHtmlFiltering = '$$',

    /**
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#html-filtering-rules}
     */
    AdgHtmlFilteringException = '$@$',
}

/**
 * Represents a basic node in the AST.
 */
export interface Node {
    /**
     * The type of the node. Every node should have a type.
     */
    type: string;

    /**
     * Every node should support a loc property, which refers to the location of the node in the source code.
     */
    loc?: LocationRange;

    /**
     * Optionally the raw representation of the node in the source code.
     */
    raw?: string;
}

/**
 * Represents a location in the source code.
 */
export interface Location {
    /**
     * Zero-based index of the first character of the parsed source region.
     */
    offset: number;

    /**
     * One-based line index of the first character of the parsed source region.
     */
    line: number;

    /**
     * One-based column index of the first character of the parsed source region.
     */
    column: number;
}

/**
 * Represents a location range in the source code.
 */
export interface LocationRange {
    /**
     * The start location of the node.
     */
    start: Location;

    /**
     * The end location of the node.
     */
    end: Location;
}

/**
 * Default location for AST nodes.
 */
export const defaultLocation: Location = {
    offset: 0,
    line: 1,
    column: 1,
};

/**
 * Represents a basic value node in the AST.
 */
export interface Value<T = string> extends Node {
    type: 'Value';

    /**
     * Value of the node.
     */
    value: T;
}

/**
 * Represents a raw value node.
 */
export interface Raw extends Node {
    type: 'Raw';

    /**
     * Value of the node.
     */
    value: string;
}

/**
 * Represents a basic parameter node in the AST.
 */
export interface Parameter extends Node {
    type: 'Parameter';

    /**
     * Value of the node.
     */
    value: string;
}

/**
 * Represents a list of parameters.
 */
export interface ParameterList extends Node {
    type: 'ParameterList';

    /**
     * List of values
     */
    children: Parameter[];
}

/**
 * Represents a logical expression variable node in the AST.
 */
export interface ExpressionVariableNode extends Node {
    type: 'Variable';
    name: string;
}

/**
 * Represents a logical expression operator node in the AST.
 */
export interface ExpressionOperatorNode extends Node {
    type: 'Operator';
    operator: AnyOperator;
    left: AnyExpressionNode;
    right?: AnyExpressionNode;
}

/**
 * Represents a logical expression parenthesis node in the AST.
 */
export interface ExpressionParenthesisNode extends Node {
    type: 'Parenthesis';
    expression: AnyExpressionNode;
}

/**
 * Represents a filter list (list of rules).
 */
export interface FilterList extends Node {
    type: 'FilterList';

    /**
     * List of rules
     */
    children: AnyRule[];
}

/**
 * Represents a basic adblock rule. Every adblock rule should extend this interface.
 * We don't use this interface directly, so we don't specify the `type` property.
 */
export interface RuleBase extends Node {
    /**
     * Syntax of the adblock rule. If we are not able to determine the syntax of the rule,
     * we should use `AdblockSyntax.Common` as the value.
     */
    syntax: AdblockSyntax;

    /**
     * Category of the adblock rule
     */
    category: RuleCategory;

    /**
     * Raw data of the rule
     */
    raws?: {
        /**
         * Original rule text
         */
        text?: string;

        /**
         * Newline character used in the rule (if any)
         */
        nl?: NewLine;
    }
}

/**
 * Represents an invalid rule (used by tolerant mode).
 */
export interface InvalidRule extends RuleBase {
    type: 'InvalidRule';

    /**
     * Category of the adblock rule
     */
    category: RuleCategory.Invalid;

    /**
     * Raw rule text
     */
    raw: string;

    /**
     * Error details
     */
    error: {
        /**
         * Error name
         */
        name: string;

        /**
         * Error message
         */
        message: string;

        /**
         * Error location (if any)
         */
        loc?: LocationRange;
    }
}

/**
 * Represents an "empty rule" (practically an empty line)
 */
export interface EmptyRule extends RuleBase {
    /**
     * Type of the adblock rule (should be always present)
     */
    type: 'EmptyRule';

    /**
     * Category of the adblock rule
     */
    category: RuleCategory.Empty;
}

/**
 * Represents the basic comment rule interface.
 */
export interface CommentBase extends RuleBase {
    category: RuleCategory.Comment;
    type: CommentRuleType;
}

/**
 * Represents a simple comment.
 *
 * @example
 * Example rules:
 *   - ```adblock
 *     ! This is just a comment
 *     ```
 *   - ```adblock
 *     # This is just a comment
 *     ```
 */
export interface CommentRule extends CommentBase {
    type: CommentRuleType.CommentRule;

    /**
     * Comment marker.
     *
     * @example
     * - If the rule is `! This is just a comment`, then the marker will be `!`.
     * - If the rule is `# This is just a comment`, then the marker will be `#`.
     */
    marker: Value<CommentMarker>;

    /**
     * Comment text.
     *
     * @example
     * If the rule is `! This is just a comment`, then the text will be `This is just a comment`.
     */
    text: Value;
}

/**
 * Represents a metadata comment rule. This is a special comment that specifies
 * the name and value of the metadata header.
 *
 * @example
 * For example, in the case of
 * ```adblock
 * ! Title: My List
 * ```
 * the name of the header is `Title`, and the value is `My List`.
 */
export interface MetadataCommentRule extends CommentBase {
    type: CommentRuleType.MetadataCommentRule;

    /**
     * Comment marker.
     */
    marker: Value<CommentMarker>;

    /**
     * Metadata header name.
     */
    header: Value;

    /**
     * Metadata header value (always should present).
     */
    value: Value;
}

/**
 * Represents an inline linter configuration comment.
 *
 * @example
 * For example, if the comment is
 * ```adblock
 * ! aglint-disable some-rule another-rule
 * ```
 * then the command is `aglint-disable` and its params is `["some-rule", "another-rule"]`.
 */
export interface ConfigCommentRule extends CommentBase {
    category: RuleCategory.Comment;
    type: CommentRuleType.ConfigCommentRule;

    /**
     * The marker for the comment. It can be `!` or `#`. It is always the first non-whitespace character in the comment.
     */
    marker: Value<CommentMarker>;

    /**
     * The command for the comment. It is always begins with the `aglint` prefix.
     *
     * @example
     * ```adblock
     * ! aglint-disable-next-line
     * ```
     */
    command: Value;

    /**
     * Params for the command. Can be a rule configuration object or a list of rule names.
     *
     * @example
     * For the following comment:
     * ```adblock
     * ! aglint-disable some-rule another-rule
     * ```
     * the params would be `["some-rule", "another-rule"]`.
     */
    params?: Value<object> | ParameterList;

    /**
     * Config comment text. The idea is generally the same as in ESLint.
     *
     * @example
     * You can use the following syntax to specify a comment for a config comment:
     * `! aglint-enable -- this is the comment`
     */
    comment?: Value;
}

/**
 * Represents a preprocessor comment.
 *
 * @example
 * For example, if the comment is
 * ```adblock
 * !#if (adguard)
 * ```
 * then the directive's name is `if` and its value is `(adguard)`.
 *
 * In such a case, the parameters must be submitted for further parsing and validation, as this parser only handles
 * the general syntax.
 */
export interface PreProcessorCommentRule extends CommentBase {
    category: RuleCategory.Comment;
    type: CommentRuleType.PreProcessorCommentRule;

    /**
     * Name of the directive
     */
    name: Value;

    /**
     * Params (optional)
     */
    params?: Value | ParameterList | AnyExpressionNode;
}

/**
 * Represents an adblock agent.
 */
export interface Agent extends Node {
    // TODO: use enum
    type: 'Agent';

    /**
     * Adblock name.
     */
    adblock: Value;

    /**
     * Adblock version (if specified).
     */
    version: Value | null;

    /**
     * Needed for network rules modifier validation.
     */
    syntax: AdblockSyntax;
}

/**
 * Represents an agent comment rule.
 *
 * @example
 * - ```adblock
 *   [Adblock Plus 2.0]
 *   ```
 * - ```adblock
 *   [uBlock Origin 1.16.4; AdGuard 1.0]
 *   ```
 */
export interface AgentCommentRule extends RuleBase {
    category: RuleCategory.Comment;

    type: CommentRuleType.AgentCommentRule;

    /**
     * Agent list.
     */
    children: Agent[];
}

/**
 * Represents a hint.
 *
 * @example
 * ```adblock
 * !+ PLATFORM(windows, mac)
 * ```
 * the name would be `PLATFORM` and the params would be `["windows", "mac"]`.
 */
export interface Hint extends Node {
    type: 'Hint';

    /**
     * Hint name.
     *
     * @example
     * For `PLATFORM(windows, mac)` the name would be `PLATFORM`.
     */
    name: Value;

    /**
     * Hint parameters.
     *
     * @example
     * For `PLATFORM(windows, mac)` the params would be `["windows", "mac"]`.
     */
    params?: ParameterList;
}

/**
 * Represents a hint comment rule.
 *
 * There can be several hints in a hint rule.
 *
 * @example
 * If the rule is
 * ```adblock
 * !+ NOT_OPTIMIZED PLATFORM(windows)
 * ```
 * then there are two hint members: `NOT_OPTIMIZED` and `PLATFORM`.
 */
export interface HintCommentRule extends RuleBase {
    category: RuleCategory.Comment;

    type: CommentRuleType.HintCommentRule;

    /**
     * Currently only AdGuard supports hints.
     */
    syntax: AdblockSyntax.Adg;

    /**
     * List of hints.
     */
    children: Hint[];
}

/**
 * Represents a modifier list.
 *
 * @example
 * If the rule is
 * ```adblock
 * some-rule$script,domain=example.com
 * ```
 * then the list of modifiers will be `script,domain=example.com`.
 */
export interface ModifierList extends Node {
    type: 'ModifierList';

    /**
     * List of modifiers.
     */
    children: Modifier[];
}

/**
 * Represents a modifier.
 *
 * @example
 * If the modifier is `third-party`, the value of the modifier property
 * will be `third-party`, but the value will remain undefined.
 *
 * But if the modifier is `domain=example.com`, then the modifier property will be
 * `domain` and the value property will be `example.com`.
 */
export interface Modifier extends Node {
    /**
     * Modifier name
     */
    name: Value;

    /**
     * Is this modifier an exception? For example, `~third-party` is an exception
     */
    exception?: boolean;

    /**
     * Modifier value (optional)
     */
    value?: Value;
}

/**
 * Represents the separator used for various modifier values.
 *
 * @example
 * `||example.com^$app=com.test1.app|TestApp.exe`
 */
export type PipeSeparator = typeof PIPE_MODIFIER_SEPARATOR;

/**
 * Represents the separator used for basic rules domain list.
 *
 * @example
 * `example.com,example.org###banner`
 */
export type CommaSeparator = typeof COMMA_DOMAIN_LIST_SEPARATOR;

/**
 * Represents the separator used in a domain list.
 *
 * @example
 * - `,` — for the classic domain list,
 * - `|` — for the $domain modifier value
 */
export type DomainListSeparator = CommaSeparator | PipeSeparator;

/**
 * Common interface for a list item of $app, $denyallow, $domain, $method
 * which have similar syntax.
 */
export interface ListItem extends Node {
    type: ListItemNodeType;

    /**
     * Value of the node.
     */
    value: string;

    /**
     * If the value is an negated.
     *
     * @example
     * `~example.com` is negated, but `example.com` is not. `~` is the exception marker here.
     */
    exception: boolean;
}

/**
 * Represents a {@link ListItem} without the `type` property.
 * Needed for parsing similar-syntax modifier values with a common parse function.
 */
export type ListItemNoType = Omit<ListItem, 'type'>;

/**
 * Represents an element of the app list — $app.
 */
export interface App extends ListItem {
    type: ListItemNodeType.App;
}

/**
 * Represents an element of the domain list — $domain, $denyallow.
 */
export interface Domain extends ListItem {
    type: ListItemNodeType.Domain;
}

/**
 * Represents an element of the method list — $method.
 */
export interface Method extends ListItem {
    type: ListItemNodeType.Method;
}

/**
 * Represents an element of the stealth option list — $stealth.
 */
export interface StealthOption extends ListItem {
    type: ListItemNodeType.StealthOption;
}

/**
 * Represents a list of domains.
 * Needed for $domain and $denyallow.
 *
 * @example
 * `example.com,~example.net` or `example.com|~example.net`
 */
export interface DomainList extends Node {
    /**
     * Type of the node. Basically, the idea is that each main AST part should have a type
     */
    type: ListNodeType.DomainList;

    /**
     * Separator used in the domain list.
     */
    separator: DomainListSeparator;

    /**
     * List of domains
     */
    children: Domain[];
}

/**
 * Represents a list of apps.
 * Needed for $app.
 *
 * @example
 * `Example.exe|com.example.osx`.
 */
export interface AppList extends Node {
    /**
     * Type of the node. Basically, the idea is that each main AST part should have a type
     */
    type: ListNodeType.AppList;

    /**
     * Separator used in the app list.
     */
    separator: PipeSeparator;

    /**
     * List of apps
     */
    children: App[];
}

/**
 * Represents a list of methods.
 * Needed for $method.
 *
 * @example
 * `get|post|put`.
 */
export interface MethodList extends Node {
    /**
     * Type of the node. Basically, the idea is that each main AST part should have a type
     */
    type: ListNodeType.MethodList;

    /**
     * Separator used in the method list.
     */
    separator: PipeSeparator;

    /**
     * List of methods
     */
    children: Method[];
}

/**
 * Represents a list of stealth options.
 * Needed for $stealth.
 *
 * @example
 * `referrer|ip`.
 */
export interface StealthOptionList extends Node {
    /**
     * Type of the node. Basically, the idea is that each main AST part should have a type
     */
    type: ListNodeType.StealthOptionList;

    /**
     * Separator used in the stealth option list.
     */
    separator: PipeSeparator;

    /**
     * List of stealth options
     */
    children: StealthOption[];
}

/**
 * Represents a CSS injection body.
 */
export interface CssInjectionRuleBody extends Node {
    type: 'CssInjectionRuleBody';

    /**
     * Media query, if any.
     *
     * @example
     *
     * ```text
     * @media (max-width: 768px) { ... }
     *         ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
     * ```
     */
    mediaQueryList?: Value;

    /**
     * CSS selector list.
     *
     * @example
     * section:has(> .ad) { display: none; }
     * ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
     * section:has(> .ad), article > p[advert] { display: none; }
     * ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
     */
    selectorList: Value;

    /**
     * Declaration list.
     *
     * @example
     * section:has(> .ad) { display: none; }
     *                      ↑↑↑↑↑↑↑↑↑↑↑↑↑↑
     * section:has(> .ad), article > p[advert] { display: none; }
     *                                           ↑↑↑↑↑↑↑↑↑↑↑↑↑↑
     * div[ad] { padding-top: 10px; padding-bottom: 10px; }
     *           ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
     */
    declarationList?: Value;

    /**
     * Remove flag
     */
    remove?: boolean;
}

/**
 * Represents an element hiding rule body. There can even be several selectors in a rule,
 * but the best practice is to place the selectors in separate rules.
 */
export interface ElementHidingRuleBody extends Node {
    type: 'ElementHidingRuleBody';

    /**
     * Element hiding rule selector(s).
     */
    selectorList: Value;
}

/**
 * Represents a scriptlet injection rule body.
 */
export interface ScriptletInjectionRuleBody extends Node {
    type: 'ScriptletInjectionRuleBody';

    /**
     * List of scriptlets (list of parameter lists).
     */
    children: ParameterList[];
}

/**
 * Represents an HTML filtering rule body.
 */
export interface HtmlFilteringRuleBody extends Node {
    type: 'HtmlFilteringRuleBody';

    /**
     * HTML rule selector(s).
     */
    body: Value;
}

/**
 * A generic representation of a cosmetic rule.
 *
 * Regarding the categories, there is only a difference in the body,
 * all other properties can be defined at this level.
 */
export interface CosmeticRule extends RuleBase {
    category: RuleCategory.Cosmetic;
    type: CosmeticRuleType;

    /**
     * List of modifiers (optional)
     */
    modifiers?: ModifierList;

    /**
     * List of domains.
     */
    domains: DomainList;

    /**
     * Separator between pattern and body. For example, in the following rule:
     * ```adblock
     * example.com##.ads
     * ```
     * then the separator is `##`.
     */
    separator: Value;

    /**
     * If the rule is an exception. For example, in the following rule:
     * ```adblock
     * example.com#@#.ads
     * ```
     * then the rule is an exception and @ is the exception marker.
     */
    exception: boolean;

    /**
     * Body of the rule. It can be a CSS rule, an element hiding rule, a scriptlet rule, etc.
     */
    body: unknown;
}

/**
 * Representation of an element hiding rule.
 *
 * Example rules:
 * - ```adblock
 *   example.com##.ads
 *   ```
 * - ```adblock
 *   example.com#@#.ads
 *   ```
 * - ```adblock
 *   example.com#?#.ads:has(> .something)
 *   ```
 * - ```adblock
 *   example.com#@?#.ads:has(> .something)
 *   ```
 */
export interface ElementHidingRule extends CosmeticRule {
    type: CosmeticRuleType.ElementHidingRule;
    body: ElementHidingRuleBody;
}

/**
 * Representation of a CSS injection rule.
 *
 * Example rules (AdGuard):
 *  - ```adblock
 *    example.com#$#body { padding-top: 0 !important; }
 *    ```
 *  - ```adblock
 *    example.com#$#@media (min-width: 1024px) { body { padding-top: 0 !important; } }
 *    ```
 *  - ```adblock
 *    example.com#$?#@media (min-width: 1024px) { .something:has(.ads) { padding-top: 0 !important; } }
 *    ```
 *  - ```adblock
 *    example.com#$#.ads { remove: true; }
 *    ```
 *
 * Example rules (uBlock Origin):
 *  - ```adblock
 *    example.com##body:style(padding-top: 0 !important;)
 *    ```
 *  - ```adblock
 *    example.com##.ads:remove()
 *    ```
 */
export interface CssInjectionRule extends CosmeticRule {
    type: CosmeticRuleType.CssInjectionRule;
    body: CssInjectionRuleBody;
}

/**
 * Representation of a scriptlet injection rule.
 *
 * Example rules (AdGuard):
 *  - ```adblock
 *    example.com#%#//scriptlet('scriptlet-name', 'arg0', 'arg1')
 *    ```
 *  - ```adblock
 *    example.com#@%#//scriptlet('scriptlet-name', 'arg0', 'arg1')
 *    ```
 *
 * Example rules (uBlock Origin):
 *  - ```adblock
 *    example.com##+js(scriptlet-name, arg0, arg1)
 *    ```
 *  - ```adblock
 *    example.com#@#+js(scriptlet-name, arg0, arg1)
 *    ```
 *
 * Example rules (Adblock Plus):
 *  - ```adblock
 *    example.com#$#scriptlet-name arg0 arg1
 *    ```
 *  - ```adblock
 *    example.com#@$#scriptlet-name arg0 arg1
 *    ```
 *  - ```adblock
 *    example.com#$#scriptlet0 arg00 arg01; scriptlet1 arg10 arg11
 *    ```
 */
export interface ScriptletInjectionRule extends CosmeticRule {
    type: CosmeticRuleType.ScriptletInjectionRule;
    body: ScriptletInjectionRuleBody;
}

/**
 * Representation of a HTML filtering rule.
 *
 * Example rules (AdGuard):
 *  - ```adblock
 *    example.com$$script[tag-content="detect"]
 *    ```
 *  - ```adblock
 *    example.com$@$script[tag-content="detect"]
 *    ```
 *
 * Example rules (uBlock Origin):
 *  - ```adblock
 *    example.com##^script:has-text(detect)
 *    ```
 *  - ```adblock
 *    example.com#@#^script:has-text(detect)
 *    ```
 */
export interface HtmlFilteringRule extends CosmeticRule {
    type: CosmeticRuleType.HtmlFilteringRule;
    body: Value;
}

/**
 * Representation of a JS injection rule.
 *
 * Example rules (AdGuard):
 *  - ```adblock
 *    example.com#%#let a = 2;
 *    ```
 *  - ```adblock
 *    example.com#@%#let a = 2;
 *    ```
 */
export interface JsInjectionRule extends CosmeticRule {
    type: CosmeticRuleType.JsInjectionRule;
    body: Value;
}

/**
 * Represents the common properties of network rules
 */
export interface NetworkRule extends RuleBase {
    category: RuleCategory.Network;
    type: 'NetworkRule';
    syntax: AdblockSyntax;

    /**
     * If the rule is an exception rule. If the rule begins with `@@`, it means that it is an exception rule.
     *
     * @example
     * The following rule is an exception rule:
     * ```adblock
     * @@||example.org^
     * ```
     * since it begins with `@@`, which is the exception marker.
     *
     * But the following rule is not an exception rule:
     * ```adblock
     * ||example.org^
     * ```
     * since it does not begins with `@@`.
     */
    exception: boolean;

    /**
     * The rule pattern.
     *
     * @example
     * - Let's say we have the following rule:
     *   ```adblock
     *   ||example.org^
     *   ```
     *   then the pattern of this rule is `||example.org^`.
     * - But let's say we have the following rule:
     *   ```adblock
     *   ||example.org^$third-party,script
     *   ```
     *   then the pattern of this rule is also `||example.org^`.
     */
    pattern: Value;

    /**
     * The rule modifiers.
     *
     * @example
     * - Let's say we have the following rule:
     *   ```adblock
     *   ||example.org^$third-party
     *   ```
     *   then the modifiers of this rule are `["third-party"]`.
     */
    modifiers?: ModifierList;
}
