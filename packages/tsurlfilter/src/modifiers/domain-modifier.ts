import { getPublicSuffix } from 'tldts';
import { splitByDelimiterWithEscapeCharacter } from '../utils/string-utils';
import { SimpleRegex } from '../rules/simple-regex';

/**
 * This is a helper class that is used specifically to work
 * with domains restrictions.
 *
 * There are two options how you can add a domain restriction:
 * * `$domain` modifier: https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#domain-modifier
 * * domains list for the cosmetic rules
 *
 * The only difference between them is that in one case we use `|` as a separator,
 * and in the other case - `,`.
 *
 * Examples:
 * * `||example.org^$domain=example.com|~sub.example.com` -- network rule
 * * `example.com,~sub.example.com##banner` -- cosmetic rule
 */
export class DomainModifier {
    /**
     * List of permitted domains or null.
     */
    public readonly permittedDomains: string[] | null;

    /**
     * List of restricted domains or null.
     */
    public readonly restrictedDomains: string[] | null;

    /**
     * List of permitted wildcard domains or null.
     */
    public readonly permittedWildcardDomains: string[] | null;

    /**
     * List of restricted wildcard domains or null.
     */
    public readonly restrictedWildcardDomains: string[] | null;

    /**
     * List of permitted regex domains or null.
     */
    public readonly permittedRegexDomains: RegExp[] | null;

    /**
     * List of restricted regex domains or null.
     */
    public readonly restrictedRegexDomains: RegExp[] | null;

    /**
     * Parses the `domains` string and initializes the object.
     *
     * @param domainsStr Domains string.
     * @param separator Separator — `,` or `|`.
     *
     * @throws An error if the domains string is empty or invalid
     */
    constructor(domainsStr: string, separator: string) {
        if (!domainsStr) {
            throw new SyntaxError('Modifier $domain cannot be empty');
        }

        const permittedDomains: string[] = [];
        const restrictedDomains: string[] = [];

        const permittedWildcardDomains: string[] = [];
        const restrictedWildcardDomains: string[] = [];

        const permittedRegexDomains: RegExp[] = [];
        const restrictedRegexDomains: RegExp[] = [];

        const parts = splitByDelimiterWithEscapeCharacter(domainsStr.toLowerCase(), separator, '\\', true);
        for (let i = 0; i < parts.length; i += 1) {
            let domain = parts[i].trim();
            let isRestricted = false;
            if (domain.startsWith('~')) {
                isRestricted = true;
                domain = domain.substring(1);
            }

            if (domain === '') {
                throw new SyntaxError(`Empty domain specified in "${domainsStr}"`);
            }

            if (SimpleRegex.isRegexPattern(domain)) {
                const regexDomain = new RegExp(domain.slice(1, -1));
                if (isRestricted) {
                    restrictedRegexDomains.push(regexDomain);
                } else {
                    permittedRegexDomains.push(regexDomain);
                }
                continue;
            }

            if (DomainModifier.isWildcardDomain(domain)) {
                if (isRestricted) {
                    restrictedWildcardDomains.push(domain);
                } else {
                    permittedWildcardDomains.push(domain);
                }
                continue;
            }

            if (isRestricted) {
                restrictedDomains.push(domain);
            } else {
                permittedDomains.push(domain);
            }
        }

        // FIXME improve this?
        this.restrictedDomains = restrictedDomains.length > 0 ? restrictedDomains : null;
        this.permittedDomains = permittedDomains.length > 0 ? permittedDomains : null;

        this.restrictedWildcardDomains = restrictedWildcardDomains.length > 0 ? restrictedWildcardDomains : null;
        this.permittedWildcardDomains = permittedWildcardDomains.length > 0 ? permittedWildcardDomains : null;

        this.permittedRegexDomains = permittedRegexDomains.length > 0 ? permittedRegexDomains : null;
        this.restrictedRegexDomains = restrictedRegexDomains.length > 0 ? restrictedRegexDomains : null;
    }

    /**
     * isDomainOrSubdomainOfAny checks if `domain` is the same or a subdomain
     * of any of `domains`.
     *
     * @param domain - domain to check
     * @param domains - domains list to check against
     */
    public static isDomainOrSubdomainOfAny(domain: string, domains: string[] | RegExp[]): boolean {
        for (let i = 0; i < domains.length; i += 1) {
            const d = domains[i];
            if (d instanceof RegExp) {
                if (d.test(domain)) {
                    return true;
                }
                continue;
            }

            if (DomainModifier.isWildcardDomain(d)) {
                if (DomainModifier.matchAsWildcard(d, domain)) {
                    return true;
                }
            }

            if (domain === d || (domain.endsWith(d) && domain.endsWith(`.${d}`))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Checks if domain ends with wildcard
     *
     * @param domain
     */
    public static isWildcardDomain(domain: string): boolean {
        return domain.endsWith('.*');
    }

    /**
     * Checks if wildcard matches domain
     *
     * @param wildcard
     * @param domainNameToCheck
     */
    private static matchAsWildcard(wildcard: string, domainNameToCheck: string): boolean {
        const wildcardedDomainToCheck = DomainModifier.genTldWildcard(domainNameToCheck);
        if (wildcardedDomainToCheck) {
            return wildcardedDomainToCheck === wildcard
                || (wildcardedDomainToCheck.endsWith(wildcard) && wildcardedDomainToCheck.endsWith(`.${wildcard}`));
        }

        return false;
    }

    /**
     * Generates from domain tld wildcard e.g. google.com -> google.* ; youtube.co.uk -> youtube.*
     *
     * @param {string} domainName
     * @returns {string} string is empty if tld for provided domain name doesn't exists
     */
    private static genTldWildcard(domainName: string): string {
        const tld = getPublicSuffix(domainName);
        if (tld) {
            // lastIndexOf() is needed not to match the domain, e.g. 'www.chrono24.ch'.
            // https://github.com/AdguardTeam/AdguardBrowserExtension/issues/2312.
            return `${domainName.slice(0, domainName.lastIndexOf(`.${tld}`))}.*`;
        }

        return '';
    }
}

/**
 * Comma separator
 */
export const COMMA_SEPARATOR = ',';

/**
 * Pipe separator
 */
export const PIPE_SEPARATOR = '|';
