import { getPublicSuffix } from 'tldts';

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
    /** list of permitted domains or null */
    public readonly permittedDomains: string[] | null;

    /** list of restricted domains or null */
    public readonly restrictedDomains: string[] | null;

    /**
     * Parses the `domains` string and initializes the object.
     *
     * @param domains - domains string
     * @param sep - separator (`,` or `|`)
     *
     * @throws an error if the domains string is empty or invalid
     */
    constructor(domains: string, sep: string) {
        if (!domains) {
            throw new SyntaxError('Modifier $domain cannot be empty');
        }

        const permittedDomains: string[] = [];
        const restrictedDomains: string[] = [];

        const collectDomain = (rawDomain: string) => {
            if (rawDomain.startsWith('~')) {
                // cut `~` before the domain
                // and save domain as restricted
                restrictedDomains.push(rawDomain.toLowerCase().substring(1).trim());
            } else {
                // otherwise save domain as permitted
                permittedDomains.push(rawDomain.toLowerCase());
            }
        };

        let sepIndex;
        let parsedDomain;
        let domainsStrToParse = domains;

        while (domainsStrToParse.length) {
            sepIndex = domainsStrToParse.indexOf(sep);
            if (sepIndex === -1) {
                // no `sep` in the domains string
                collectDomain(domainsStrToParse);
                domainsStrToParse = '';
            } else if (sepIndex > 0) {
                // get the domain before `sep`
                parsedDomain = domainsStrToParse.slice(0, sepIndex);
                collectDomain(parsedDomain);
                // save new version of string left to parse
                domainsStrToParse = domainsStrToParse.slice(sepIndex + 1);
                // `sep` ends the domains string
                // e.g. '$domain=example.com|'
                if (domainsStrToParse.length === 0) {
                    throw new SyntaxError(`Empty domain specified in "${domains}" after "${parsedDomain}"`);
                }
            } else {
                // sepIndex === 0 which means that `sep` starts the domains string
                // e.g. '$domain=|example.com'
                // or   ',example.com##div'
                throw new SyntaxError(`Empty domain specified in "${domainsStrToParse}"`);
            }
        }

        this.restrictedDomains = restrictedDomains.length > 0 ? restrictedDomains : null;
        this.permittedDomains = permittedDomains.length > 0 ? permittedDomains : null;
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
            return `${domainName.slice(0, domainName.indexOf(`.${tld}`))}.*`;
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
