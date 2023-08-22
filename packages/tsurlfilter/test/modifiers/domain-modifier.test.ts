import { DomainModifier } from '../../src/modifiers/domain-modifier';

describe('Domain modifier', () => {
    describe('constructor and valid domains string with comma separator', () => {
        const COMMA_SEPARATOR = ',';
        const domainsListCases = [
            {
                actual: 'example.com',
                expected: {
                    permitted: ['example.com'],
                    restricted: null,
                    permittedWildcard: null,
                    restrictedWildcard: null,
                    permittedRegex: null,
                    restrictedRegex: null,
                },
            },
            {
                actual: 'example.*',
                expected: {
                    permitted: null,
                    restricted: null,
                    permittedWildcard: ['example.*'],
                    restrictedWildcard: null,
                    permittedRegex: null,
                    restrictedRegex: null,
                },
            },
            {
                actual: 'example.com,example.org',
                expected: {
                    permitted: ['example.com', 'example.org'],
                    restricted: null,
                    permittedWildcard: null,
                    restrictedWildcard: null,
                    permittedRegex: null,
                    restrictedRegex: null,
                },
            },
            {
                actual: '~example.com,~example.org',
                expected: {
                    permitted: null,
                    restricted: ['example.com', 'example.org'],
                    permittedWildcard: null,
                    restrictedWildcard: null,
                    permittedRegex: null,
                    restrictedRegex: null,
                },
            },
            {
                actual: 'example.*,domain.com',
                expected: {
                    permitted: ['domain.com'],
                    restricted: null,
                    permittedWildcard: ['example.*'],
                    restrictedWildcard: null,
                    permittedRegex: null,
                    restrictedRegex: null,
                },
            },
            {
                actual: 'example.*,~example.com',
                expected: {
                    permitted: null,
                    restricted: ['example.com'],
                    permittedWildcard: ['example.*'],
                    restrictedWildcard: null,
                    permittedRegex: null,
                    restrictedRegex: null,
                },
            },
            {
                actual: 'example.org,~example.com,example.*,/io/,~/net/',
                expected: {
                    permitted: ['example.org'],
                    restricted: ['example.com'],
                    permittedWildcard: ['example.*'],
                    restrictedWildcard: null,
                    permittedRegex: [/io/],
                    restrictedRegex: [/net/],
                },
            },
        ];
        test.each(domainsListCases)('%s', ({ actual, expected }) => {
            const domainModifier = new DomainModifier(actual, COMMA_SEPARATOR);
            const {
                permittedDomains,
                restrictedDomains,
                permittedWildcardDomains,
                restrictedWildcardDomains,
                permittedRegexDomains,
                restrictedRegexDomains,
            } = domainModifier;

            const {
                permitted,
                restricted,
                permittedWildcard,
                restrictedWildcard,
                permittedRegex,
                restrictedRegex,
            } = expected;

            expect(permittedDomains).toStrictEqual(permitted);
            expect(restrictedDomains).toStrictEqual(restricted);
            expect(permittedWildcardDomains).toStrictEqual(permittedWildcard);
            expect(restrictedWildcardDomains).toStrictEqual(restrictedWildcard);
            expect(permittedRegexDomains).toStrictEqual(permittedRegex);
            expect(restrictedRegexDomains).toStrictEqual(restrictedRegex);
        });
    });

    describe('constructor and valid domains string with pipe separator', () => {
        const MODIFIER_LIST_SEPARATOR = '|';
        const modifierCases = [
            {
                actual: 'example.com',
                expected: {
                    permitted: ['example.com'],
                    restricted: null,
                    permittedWildcard: null,
                    restrictedWildcard: null,
                    permittedRegex: null,
                    restrictedRegex: null,
                },
            },
            {
                actual: 'EXAMPLE.com',
                expected: {
                    permitted: ['example.com'],
                    restricted: null,
                    permittedWildcard: null,
                    restrictedWildcard: null,
                    permittedRegex: null,
                    restrictedRegex: null,
                },
            },
            {
                // check
                actual: 'ÖRNEK.com',
                expected: {
                    permitted: ['örnek.com'],
                    restricted: null,
                    permittedWildcard: null,
                    restrictedWildcard: null,
                    permittedRegex: null,
                    restrictedRegex: null,
                },
            },
            {
                actual: 'example.com|example.org',
                expected: {
                    permitted: ['example.com', 'example.org'],
                    restricted: null,
                    permittedWildcard: null,
                    restrictedWildcard: null,
                    permittedRegex: null,
                    restrictedRegex: null,
                },
            },
            {
                actual: '~example.com|~example.org',
                expected: {
                    permitted: null,
                    restricted: ['example.com', 'example.org'],
                    permittedWildcard: null,
                    restrictedWildcard: null,
                    permittedRegex: null,
                    restrictedRegex: null,
                },
            },
            {
                actual: 'example.*|domain.com',
                expected: {
                    permitted: ['domain.com'],
                    restricted: null,
                    permittedWildcard: ['example.*'],
                    restrictedWildcard: null,
                    permittedRegex: null,
                    restrictedRegex: null,
                },
            },
            {
                actual: 'example.*|~example.com',
                expected: {
                    permitted: null,
                    restricted: ['example.com'],
                    permittedWildcard: ['example.*'],
                    restrictedWildcard: null,
                    permittedRegex: null,
                    restrictedRegex: null,
                },
            },
            {
                actual: 'example.org|~example.com|example.*|/io/|~/net/',
                expected: {
                    permitted: ['example.org'],
                    restricted: ['example.com'],
                    permittedWildcard: ['example.*'],
                    restrictedWildcard: null,
                    permittedRegex: [/io/],
                    restrictedRegex: [/net/],
                },
            },
        ];
        test.each(modifierCases)('%s', ({ actual, expected }) => {
            const domainModifier = new DomainModifier(actual, MODIFIER_LIST_SEPARATOR);
            const {
                permittedDomains,
                restrictedDomains,
                permittedWildcardDomains,
                restrictedWildcardDomains,
                permittedRegexDomains,
                restrictedRegexDomains,
            } = domainModifier;

            const {
                permitted,
                restricted,
                permittedWildcard,
                restrictedWildcard,
                permittedRegex,
                restrictedRegex,
            } = expected;

            expect(permittedDomains).toStrictEqual(permitted);
            expect(restrictedDomains).toStrictEqual(restricted);
            expect(permittedWildcardDomains).toStrictEqual(permittedWildcard);
            expect(restrictedWildcardDomains).toStrictEqual(restrictedWildcard);
            expect(permittedRegexDomains).toStrictEqual(permittedRegex);
            expect(restrictedRegexDomains).toStrictEqual(restrictedRegex);
        });
    });

    describe('constructor and invalid domains', () => {
        const COMMA_SEPARATOR = ',';
        const EMPTY_DOMAIN_ERROR = 'Empty domain specified in';
        const invalidCases = [
            {
                actual: '',
                error: 'Modifier $domain cannot be empty',
            },
            {
                actual: ' ',
                error: EMPTY_DOMAIN_ERROR,
            },
            {
                actual: '~',
                error: EMPTY_DOMAIN_ERROR,
            },
            {
                actual: '~  ,',
                error: EMPTY_DOMAIN_ERROR,
            },
            {
                actual: ',',
                error: EMPTY_DOMAIN_ERROR,
            },
            {
                actual: 'example.com,',
                error: EMPTY_DOMAIN_ERROR,
            },
            {
                actual: 'example.com, ',
                error: EMPTY_DOMAIN_ERROR,
            },
            {
                actual: 'example.com,,example.org',
                error: EMPTY_DOMAIN_ERROR,
            },
            {
                actual: 'example.com,  ,example.org',
                error: EMPTY_DOMAIN_ERROR,
            },
        ];
        test.each(invalidCases)('%s', ({ actual, error }) => {
            expect(() => {
                new DomainModifier(actual, COMMA_SEPARATOR);
            }).toThrow(error);
        });
    });

    it('works in common cases', () => {
        expect(DomainModifier.isDomainOrSubdomainOfAny('example.org', ['example.org'])).toBeTruthy();

        expect(DomainModifier.isDomainOrSubdomainOfAny('example.com', ['example.org'])).toBeFalsy();
        expect(DomainModifier.isDomainOrSubdomainOfAny('', ['example.org'])).toBeFalsy();
        expect(DomainModifier.isDomainOrSubdomainOfAny('example.org', [])).toBeFalsy();
    });

    it('works in wildcard cases', () => {
        expect(DomainModifier.isDomainOrSubdomainOfAny('example.org', ['example.*', 'test.com'])).toBeTruthy();
        expect(DomainModifier.isDomainOrSubdomainOfAny('sub.example.org', ['example.*', 'test.com'])).toBeTruthy();
        expect(DomainModifier.isDomainOrSubdomainOfAny('example.org', ['one.*', 'example.*', 'test.com'])).toBeTruthy();
        expect(DomainModifier.isDomainOrSubdomainOfAny('www.chrono24.ch', ['chrono24.*'])).toBeTruthy();

        expect(DomainModifier.isDomainOrSubdomainOfAny('example.com', ['test.*'])).toBeFalsy();
        expect(DomainModifier.isDomainOrSubdomainOfAny('subexample.org', ['example.*'])).toBeFalsy();
        expect(DomainModifier.isDomainOrSubdomainOfAny('example.eu.uk', ['example.*'])).toBeFalsy();
        expect(DomainModifier.isDomainOrSubdomainOfAny('example.org', ['sub.example.*', 'test.com'])).toBeFalsy();
        expect(DomainModifier.isDomainOrSubdomainOfAny('', ['example.*', 'test.com'])).toBeFalsy();
    });
});
