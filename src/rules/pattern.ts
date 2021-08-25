import { SimpleRegex } from './simple-regex';
import { Request } from '../request';
import { NetworkRule } from './network-rule';

/**
 * Rule pattern class
 *
 * This class parses rule pattern text to simple fields.
 */
export class Pattern {
    /**
     * Original pattern text
     */
    private readonly pattern: string;

    /**
     * Shortcut string
     */
    private readonly shortcut: string;

    /**
     * If this pattern already prepared indicator
     */
    private prepared: boolean | undefined;

    /**
     * Parsed hostname
     */
    private hostname: string | undefined;

    /**
     * Parsed regular expression
     */
    private regex: RegExp | undefined;

    /**
     * Invalid regex flag
     */
    private regexInvalid: boolean | undefined;

    /**
     * Domain specific pattern flag
     */
    private patternDomainSpecific: boolean | undefined;

    /**
     * If true, pattern and shortcut are the same.
     * In this case, we don't actually need to use `matchPattern`
     * if shortcut was already matched.
     */
    private patternShortcut: boolean | undefined;

    /**
     * Constructor
     * @param pattern
     */
    constructor(pattern: string) {
        this.pattern = pattern;
        this.shortcut = SimpleRegex.extractShortcut(this.pattern);
    }

    /**
     * Checks if this rule pattern matches the specified request.
     *
     * @param request - request to check
     * @param shortcutMatched if true, it means that the request already matches
     * this pattern's shortcut and we don't need to match it again.
     * @returns true if pattern matches
     */
    public matchPattern(request: Request, shortcutMatched: boolean): boolean {
        this.prepare();

        if (this.patternShortcut) {
            return shortcutMatched || this.matchShortcut(request);
        }

        if (this.hostname) {
            // If we have a `||example.org^` rule, it's easier to match
            // against the request's hostname only without compiling
            // a regular expression.
            return request.hostname.endsWith(this.hostname)
                || request.hostname.endsWith(`.${this.hostname}`);
        }

        // If the regular expression is invalid, just return false right away.
        if (this.regexInvalid || !this.regex) {
            return false;
        }

        // This is needed for DNS filtering only, not used in browser blocking.
        if (this.shouldMatchHostname(request)) {
            return this.regex.test(request.hostname);
        }

        return this.regex.test(request.url);
    }

    /**
     * matchShortcut simply checks if shortcut is a substring of the URL.
     * @param request - request to check.
     */
    private matchShortcut(request: Request): boolean {
        let { urlLowercase } = request;
        // TODO: consider doing it in the request constructor and not here
        if (urlLowercase.length > NetworkRule.MAX_URL_MATCH_LENGTH) {
            urlLowercase = urlLowercase.substring(0, NetworkRule.MAX_URL_MATCH_LENGTH);
        }

        return urlLowercase.indexOf(this.shortcut) >= 0;
    }

    /**
     * Prepares this pattern
     */
    private prepare(): void {
        if (this.prepared) {
            return;
        }
        this.prepared = true;

        // If shortcut and pattern are the same, we don't need to actually compile
        // a regex and can simply use matchShortcut instead.
        if (this.pattern === this.shortcut) {
            this.patternShortcut = true;
            return;
        }

        // Rules like `/example/*` are rather often in the real-life filters,
        // we might want to process them.
        if (this.pattern.startsWith(this.shortcut)
            && this.pattern.length === this.shortcut.length + 1
            && this.pattern.endsWith('*')) {
            this.patternShortcut = true;
            return;
        }

        if (this.pattern.startsWith(SimpleRegex.MASK_START_URL)
            && this.pattern.endsWith(SimpleRegex.MASK_SEPARATOR)) {
            // TODO: validate that it does not contain characters that
            // cannot be in a domain name.
            this.hostname = this.pattern.slice(2, this.pattern.length - 1);
            return;
        }

        this.compileRegex();
    }

    /**
     * Compiles this pattern regex
     */
    private compileRegex(): void {
        const regexText = SimpleRegex.patternToRegexp(this.pattern);
        try {
            // TODO: pass matchcase to the pattern constructor
            // let flags = 'i';
            // if (this.isOptionEnabled(NetworkRuleOption.MatchCase)) {
            //     flags = '';
            // }
            this.regex = new RegExp(regexText, 'i');
        } catch (e) {
            this.regexInvalid = true;
        }
    }

    /**
     * Checks if we should match hostnames and not the URL
     * this is important for the cases when we use urlfilter for DNS-level blocking
     * Note, that even though we may work on a DNS-level, we should still sometimes match full URL instead
     *
     * @param request
     */
    private shouldMatchHostname(request: Request): boolean {
        if (!request.isHostnameRequest) {
            return false;
        }

        return !this.isPatternDomainSpecific();
    }

    /**
     * In case pattern starts with the following it targets some specific domain
     */
    private isPatternDomainSpecific(): boolean {
        if (this.patternDomainSpecific === undefined) {
            this.patternDomainSpecific = this.pattern.startsWith(SimpleRegex.MASK_START_URL)
                || this.pattern.startsWith('http://')
                || this.pattern.startsWith('https:/')
                || this.pattern.startsWith('://');
        }

        return this.patternDomainSpecific;
    }
}
