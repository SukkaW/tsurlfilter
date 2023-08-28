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

        const parts = splitByDelimiterWithEscapeCharacter(domainsStr.toLowerCase(), separator, '\\', true);
        for (let i = 0; i < parts.length; i += 1) {
            let domain = parts[i].trim();
            let restricted = false;
            if (domain.startsWith('~')) {
                restricted = true;
                domain = domain.substring(1);
            }

            if (domain === '') {
                throw new SyntaxError(`Empty domain specified in "${domainsStr}"`);
            }

            if (restricted) {
                restrictedDomains.push(domain);
            } else {
                permittedDomains.push(domain);
            }
        }

        // FIXME improve typings to state that domains list cannot be empty
        this.restrictedDomains = restrictedDomains.length > 0 ? restrictedDomains : null;
        this.permittedDomains = permittedDomains.length > 0 ? permittedDomains : null;
    }

    /**
     * matchDomain checks if the filtering rule is allowed on this domain.
     * @param domain - domain to check.
     */
    public matchDomain(domain: string): boolean {
        if (this.hasRestrictedDomains()) {
            if (DomainModifier.isDomainOrSubdomainOfAny(domain, this.restrictedDomains!)) {
                // Domain or host is restricted
                // i.e. $domain=~example.org
                return false;
            }
        }

        if (this.hasPermittedDomains()) {
            if (!DomainModifier.isDomainOrSubdomainOfAny(domain, this.permittedDomains!)) {
                // Domain is not among permitted
                // i.e. $domain=example.org and we're checking example.com
                return false;
            }
        }

        return true;
    }

    /**
     * Checks if rule has permitted domains
     */
    public hasPermittedDomains(): boolean {
        return !!this.permittedDomains && this.permittedDomains.length > 0;
    }

    /**
     * Checks if rule has restricted domains
     */
    public hasRestrictedDomains(): boolean {
        return !!this.restrictedDomains && this.restrictedDomains.length > 0;
    }

    /**
     * Gets list of permitted domains.
     */
    public getPermittedDomains(): string[] | null {
        return this.permittedDomains;
    }

    /**
     * Gets list of restricted domains.
     */
    public getRestrictedDomains(): string[] | null {
        return this.restrictedDomains;
    }

    /**
     * isDomainOrSubdomainOfAny checks if `domain` is the same or a subdomain
     * of any of `domains`.
     *
     * @param domain - domain to check
     * @param domains - domains list to check against
     */
    public static isDomainOrSubdomainOfAny(domain: string, domains: string[]): boolean {
        for (let i = 0; i < domains.length; i += 1) {
            const d = domains[i];
            if (DomainModifier.isWildcardDomain(d)) {
                if (DomainModifier.matchAsWildcard(d, domain)) {
                    return true;
                }
            }

            if (domain === d || (domain.endsWith(d) && domain.endsWith(`.${d}`))) {
                return true;
            }

            if (SimpleRegex.isRegexPattern(d)) {
                // FIXME SimpleRegex.patternFromString(d); use this after it is refactored to not add 'g' flag
                const domainPattern = new RegExp(d.slice(1, -1));
                if (domainPattern.test(domain)) {
                    return true;
                }
                continue;
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
