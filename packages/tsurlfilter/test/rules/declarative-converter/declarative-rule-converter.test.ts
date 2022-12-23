import { TooComplexRegexpError } from '../../../src/rules/declarative-converter/errors/conversion-errors';
import {
    DeclarativeRulePriority,
} from '../../../src/rules/declarative-converter/grouped-rules-converters/abstract-rule-converter';
import { DeclarativeRulesConverter } from '../../../src/rules/declarative-converter/rules-converter';
import { NetworkRule } from '../../../src/rules/network-rule';
import { IndexedRule } from '../../../src/rules/rule';
import { RuleFactory } from '../../../src/rules/rule-factory';

const createRulesFromText = (
    filterId: number,
    lines: string[],
): IndexedRule[] => {
    let idx = 0;

    return lines
        .map((r) => {
            const rule = RuleFactory.createRule(r, filterId);
            return rule
            // eslint-disable-next-line no-plusplus
                ? new IndexedRule(rule, idx++)
                : null;
        })
        .filter((r) => r) as IndexedRule[];
};

describe('DeclarativeRuleConverter', () => {
    it('converts simple blocking rules', () => {
        const filterId = 0;
        const ruleId = 1;

        const rules = createRulesFromText(
            filterId,
            ['||example.org^'],
        );
        const {
            declarativeRules: [declarativeRule],
        } = DeclarativeRulesConverter.convert(
            [[filterId, rules]],
        );
        expect(declarativeRule).toEqual({
            id: ruleId,
            action: {
                type: 'block',
            },
            condition: {
                urlFilter: '||example.org^',
                isUrlFilterCaseSensitive: false,
            },
        });
    });

    it('converts simple allowlist rules', () => {
        const filterId = 0;
        const rules = createRulesFromText(
            filterId,
            ['@@||example.org^'],
        );
        const ruleId = 1;
        const {
            declarativeRules: [declarativeRule],
        } = DeclarativeRulesConverter.convert(
            [[filterId, rules]],
        );
        expect(declarativeRule).toEqual({
            id: ruleId,
            priority: DeclarativeRulePriority.Exception,
            action: {
                type: 'allow',
            },
            condition: {
                urlFilter: '||example.org^',
                isUrlFilterCaseSensitive: false,
            },
        });
    });

    it('converts important allowlist rules', () => {
        const filterId = 0;
        const rules = createRulesFromText(
            filterId,
            ['@@||example.org^$important'],
        );
        const ruleId = 1;
        const {
            declarativeRules: [declarativeRule],
        } = DeclarativeRulesConverter.convert(
            [[filterId, rules]],
        );
        expect(declarativeRule).toEqual({
            id: ruleId,
            priority: DeclarativeRulePriority.ImportantException,
            action: {
                type: 'allow',
            },
            condition: {
                urlFilter: '||example.org^',
                isUrlFilterCaseSensitive: false,
            },
        });
    });

    it('converts rules with $third-party modifiers', () => {
        const filterId = 0;
        const ruleId = 1;

        const thirdPartyRules = createRulesFromText(
            filterId,
            ['||example.org^$third-party'],
        );
        const {
            declarativeRules: [thirdPartyDeclarative],
        } = DeclarativeRulesConverter.convert(
            [[filterId, thirdPartyRules]],
        );
        expect(thirdPartyDeclarative).toEqual({
            id: ruleId,
            action: {
                type: 'block',
            },
            condition: {
                domainType: 'thirdParty',
                urlFilter: '||example.org^',
                isUrlFilterCaseSensitive: false,
            },
        });

        const negateFirstPartyRules = createRulesFromText(
            filterId,
            ['||example.org^$~third-party'],
        );
        const {
            declarativeRules: [negateFirstPartyDeclarative],
        } = DeclarativeRulesConverter.convert(
            [[filterId, negateFirstPartyRules]],
        );

        expect(negateFirstPartyDeclarative).toEqual({
            id: ruleId,
            action: {
                type: 'block',
            },
            condition: {
                domainType: 'firstParty',
                urlFilter: '||example.org^',
                isUrlFilterCaseSensitive: false,
            },
        });
    });

    it('converts rules with $first-party modifiers', () => {
        const filterId = 0;
        const ruleId = 1;

        const firstPartyRules = createRulesFromText(
            filterId,
            ['||example.org^$first-party'],
        );
        const {
            declarativeRules: [firstPartyDeclarative],
        } = DeclarativeRulesConverter.convert(
            [[filterId, firstPartyRules]],
        );
        expect(firstPartyDeclarative).toEqual({
            id: ruleId,
            action: {
                type: 'block',
            },
            condition: {
                domainType: 'firstParty',
                urlFilter: '||example.org^',
                isUrlFilterCaseSensitive: false,
            },
        });

        const negateFirstPartyRules = createRulesFromText(
            filterId,
            ['||example.org^$~first-party'],
        );
        const {
            declarativeRules: [negateFirstPartyDeclarative],
        } = DeclarativeRulesConverter.convert(
            [[filterId, negateFirstPartyRules]],
        );
        expect(negateFirstPartyDeclarative).toEqual({
            id: ruleId,
            action: {
                type: 'block',
            },
            condition: {
                domainType: 'thirdParty',
                urlFilter: '||example.org^',
                isUrlFilterCaseSensitive: false,
            },
        });
    });

    it('converts rules with $domain modifiers', () => {
        const filterId = 0;
        const ruleId = 1;

        const domainRules = createRulesFromText(
            filterId,
            ['||example.org^$domain=example.com'],
        );
        const {
            declarativeRules: [domainDeclarative],
        } = DeclarativeRulesConverter.convert(
            [[filterId, domainRules]],
        );
        expect(domainDeclarative).toEqual({
            id: ruleId,
            action: {
                type: 'block',
            },
            condition: {
                urlFilter: '||example.org^',
                initiatorDomains: ['example.com'],
                isUrlFilterCaseSensitive: false,
            },
        });

        const multipleDomainRules = createRulesFromText(
            filterId,
            ['||example.org^$domain=example.com|example2.com|~example3.com|~example4.com'],
        );
        const {
            declarativeRules: [multipleDomainDeclarative],
        } = DeclarativeRulesConverter.convert(
            [[filterId, multipleDomainRules]],
        );
        expect(multipleDomainDeclarative).toEqual({
            id: ruleId,
            action: {
                type: 'block',
            },
            condition: {
                urlFilter: '||example.org^',
                initiatorDomains: ['example.com', 'example2.com'],
                excludedInitiatorDomains: ['example3.com', 'example4.com'],
                isUrlFilterCaseSensitive: false,
            },
        });

        const negateDomainRules = createRulesFromText(
            filterId,
            ['||example.org^$domain=~example.com'],
        );
        const {
            declarativeRules: [negateDomainDeclarative],
        } = DeclarativeRulesConverter.convert(
            [[filterId, negateDomainRules]],
        );
        expect(negateDomainDeclarative).toEqual({
            id: ruleId,
            action: {
                type: 'block',
            },
            condition: {
                urlFilter: '||example.org^',
                excludedInitiatorDomains: ['example.com'],
                isUrlFilterCaseSensitive: false,
            },
        });
    });

    it('converts rules with specified request types', () => {
        const filterId = 0;
        const ruleId = 1;

        const scriptRules = createRulesFromText(
            filterId,
            ['||example.org^$script'],
        );
        const {
            declarativeRules: [scriptRuleDeclarative],
        } = DeclarativeRulesConverter.convert(
            [[filterId, scriptRules]],
        );
        expect(scriptRuleDeclarative).toEqual({
            id: ruleId,
            action: {
                type: 'block',
            },
            condition: {
                urlFilter: '||example.org^',
                resourceTypes: ['script'],
                isUrlFilterCaseSensitive: false,
            },
        });

        const negatedScriptRules = createRulesFromText(
            filterId,
            ['||example.org^$~script'],
        );
        const {
            declarativeRules: [negatedScriptRuleDeclarative],
        } = DeclarativeRulesConverter.convert(
            [[filterId, negatedScriptRules]],
        );
        expect(negatedScriptRuleDeclarative).toEqual({
            id: ruleId,
            action: {
                type: 'block',
            },
            condition: {
                urlFilter: '||example.org^',
                excludedResourceTypes: ['script'],
                isUrlFilterCaseSensitive: false,
            },
        });

        const multipleRequestTypesRules = createRulesFromText(
            filterId,
            ['||example.org^$script,image,media'],
        );
        const {
            declarativeRules: [multipleDeclarativeRule],
        } = DeclarativeRulesConverter.convert(
            [[filterId, multipleRequestTypesRules]],
        );
        expect(multipleDeclarativeRule.condition?.resourceTypes?.sort())
            .toEqual(['script', 'image', 'media'].sort());

        const multipleNegatedRequestTypesRules = createRulesFromText(
            filterId,
            ['||example.org^$~script,~subdocument'],
        );
        const {
            declarativeRules: [multipleNegatedDeclarativeRule],
        } = DeclarativeRulesConverter.convert(
            [[filterId, multipleNegatedRequestTypesRules]],
        );
        expect(multipleNegatedDeclarativeRule!.condition?.excludedResourceTypes?.sort())
            .toEqual(['script', 'sub_frame'].sort());
    });

    it('set rules case sensitive if necessary', () => {
        const filterId = 0;
        const ruleId = 1;

        const matchCaseRules = createRulesFromText(
            filterId,
            ['||example.org^$match-case'],
        );
        const {
            declarativeRules: [matchCaseDeclarative],
        } = DeclarativeRulesConverter.convert(
            [[filterId, matchCaseRules]],
        );
        expect(matchCaseDeclarative).toEqual({
            id: ruleId,
            action: {
                type: 'block',
            },
            condition: {
                urlFilter: '||example.org^',
                isUrlFilterCaseSensitive: true,
            },
        });

        const negatedMatchCaseRules = createRulesFromText(
            filterId,
            ['||example.org^$~match-case'],
        );
        const {
            declarativeRules: [negatedMatchCaseDeclarative],
        } = DeclarativeRulesConverter.convert(
            [[filterId, negatedMatchCaseRules]],
        );
        expect(negatedMatchCaseDeclarative).toEqual({
            id: ruleId,
            action: {
                type: 'block',
            },
            condition: {
                urlFilter: '||example.org^',
                isUrlFilterCaseSensitive: false,
            },
        });
    });

    it('converts wildcard blocking rules', () => {
        const filterId = 0;
        const ruleId = 1;

        const rules = createRulesFromText(
            filterId,
            ['||*example.org^'],
        );
        const {
            declarativeRules: [declarativeRule],
        } = DeclarativeRulesConverter.convert(
            [[filterId, rules]],
        );

        expect(declarativeRule).toEqual({
            id: ruleId,
            action: {
                type: 'block',
            },
            condition: {
                urlFilter: '*example.org^',
                isUrlFilterCaseSensitive: false,
            },
        });
    });

    // backreference; negative lookahead not supported;
    // https://github.com/google/re2/wiki/Syntax
    it('converts regex backslash before 1-9', () => {
        const filterId = 0;

        const rules = createRulesFromText(
            filterId,
            // eslint-disable-next-line max-len
            ['/\\.vidzi\\.tv\\/([a-f0-9]{2})\\/([a-f0-9]{2})\\/([a-f0-9]{2})\\/\\1\\2\\3([a-f0-9]{26})\\.js/$domain=vidzi.tv'],
        );
        const {
            declarativeRules: [declarativeRule],
        } = DeclarativeRulesConverter.convert(
            [[filterId, rules]],
        );

        expect(declarativeRule).toEqual(undefined);
    });

    // TODO Find how exactly the complexity of a rule is calculated
    it('checks more complex regex than allowed', () => {
        const filterId = 0;
        // eslint-disable-next-line max-len
        const regexpRuleText = '/www\\.oka\\.fm\\/.+\\/(yuzhnyj4.gif|cel.gif|tehnoplyus.jpg|na_chb_foto_250_250.jpg|ugzemli.gif|istorii.gif|advokat.jpg|odejda-shkola.gif|russkij-svet.jpg|dveri.gif|Festival_shlyapok_2.jpg)/';
        const rules = createRulesFromText(
            filterId,
            [regexpRuleText],
        );

        const {
            errors,
            declarativeRules: [declarativeRule],
        } = DeclarativeRulesConverter.convert(
            [[filterId, rules]],
        );

        const networkRule = new NetworkRule(regexpRuleText, filterId);

        const err = new TooComplexRegexpError(
            `More complex regex than allowed: "${networkRule.getText()}"`,
            networkRule,
            declarativeRule,
        );

        expect(errors).toHaveLength(1);
        expect(errors).toContainEqual(err);
    });

    it('converts regex negative lookahead', () => {
        const filterId = 0;

        const rules = createRulesFromText(
            filterId,
            ['/rustorka.\\w+\\/forum\\/(?!login.php)/$removeheader=location'],
        );

        const {
            declarativeRules: [declarativeRule],
        } = DeclarativeRulesConverter.convert(
            [[filterId, rules]],
        );
        expect(declarativeRule).toEqual(undefined);
    });

    // Cookies rules are not supported
    it('converts $cookies rules', () => {
        const filterId = 0;

        const rules = createRulesFromText(
            filterId,
            ['$cookie=bf_lead'],
        );

        const {
            declarativeRules: [declarativeRule],
        } = DeclarativeRulesConverter.convert(
            [[filterId, rules]],
        );

        expect(declarativeRule).toEqual(undefined);
    });

    describe('converts cyrillic domain rules', () => {
        it('converts domains section', () => {
            const filterId = 0;
            const ruleId = 1;
            const rules = createRulesFromText(
                filterId,
                ['path$domain=меил.рф'],
            );

            const {
                declarativeRules: [declarativeRule],
            } = DeclarativeRulesConverter.convert(
                [[filterId, rules]],
            );

            expect(declarativeRule).toEqual({
                id: ruleId,
                action: {
                    type: 'block',
                },
                condition: {
                    urlFilter: 'path',
                    isUrlFilterCaseSensitive: false,
                    initiatorDomains: [
                        'xn--e1agjb.xn--p1ai',
                    ],
                },
            });
        });

        it('converts urlFilterSection', () => {
            const filterId = 0;
            const ruleId = 1;
            const rules = createRulesFromText(
                filterId,
                ['||банрек.рус^$third-party'],
            );

            const {
                declarativeRules: [declarativeRule],
            } = DeclarativeRulesConverter.convert(
                [[filterId, rules]],
            );

            expect(declarativeRule).toEqual({
                id: ruleId,
                action: {
                    type: 'block',
                },
                condition: {
                    urlFilter: 'xn--||-8kcdv4aty.xn--^-4tbdh',
                    domainType: 'thirdParty',
                    isUrlFilterCaseSensitive: false,
                },
            });
        });
    });

    it('converts $redirect rules', () => {
        const resourcesPath = '/war/redirects';
        const filterId = 0;
        const ruleId = 1;

        const rules = createRulesFromText(
            filterId,
            ['||example.org/script.js$script,redirect=noopjs'],
        );

        const {
            declarativeRules: [declarativeRule],
        } = DeclarativeRulesConverter.convert(
            [[filterId, rules]],
            { resourcesPath },
        );

        expect(declarativeRule).toStrictEqual({
            id: ruleId,
            action: {
                type: 'redirect',
                redirect: {
                    extensionPath: `${resourcesPath}/noopjs.js`,
                },
            },
            condition: {
                isUrlFilterCaseSensitive: false,
                resourceTypes: [
                    'script',
                ],
                urlFilter: '||example.org/script.js',
            },
        });
    });

    describe('converts $denyallow rules', () => {
        it('converts denyallow simple rule', () => {
            const filterId = 0;
            const ruleId = 1;

            const rules = createRulesFromText(
                filterId,
                ['/adguard_circle.png$image,denyallow=cdn.adguard.com,domain=testcases.adguard.com|surge.sh'],
            );

            const {
                declarativeRules: [declarativeRule],
            } = DeclarativeRulesConverter.convert(
                [[filterId, rules]],
            );

            expect(declarativeRule).toStrictEqual({
                id: ruleId,
                action: { type: 'block' },
                condition: {
                    urlFilter: '/adguard_circle.png',
                    initiatorDomains: [
                        'testcases.adguard.com',
                        'surge.sh',
                    ],
                    excludedRequestDomains: ['cdn.adguard.com'],
                    resourceTypes: ['image'],
                    isUrlFilterCaseSensitive: false,
                },
            });
        });

        it('converts denyallow exclude rule', () => {
            const filterId = 0;
            const ruleId = 1;

            const rules = createRulesFromText(
                filterId,
                // eslint-disable-next-line max-len
                ['@@/adguard_dns_map.png$image,denyallow=cdn.adguard.com|fastcdn.adguard.com,domain=testcases.adguard.com|surge.sh'],
            );

            const {
                declarativeRules: [declarativeRule],
            } = DeclarativeRulesConverter.convert(
                [[filterId, rules]],
            );

            expect(declarativeRule).toStrictEqual({
                priority: 1,
                id: ruleId,
                action: { type: 'allow' },
                condition: {
                    urlFilter: '/adguard_dns_map.png',
                    initiatorDomains: [
                        'testcases.adguard.com',
                        'surge.sh',
                    ],
                    excludedRequestDomains: [
                        'cdn.adguard.com',
                        'fastcdn.adguard.com',
                    ],
                    resourceTypes: ['image'],
                    isUrlFilterCaseSensitive: false,
                },
            });
        });
    });

    describe('check $removeparam', () => {
        it('converts $removeparam rules', () => {
            const filterId = 0;
            const rules = createRulesFromText(
                filterId,
                ['||example.com$removeparam=param'],
            );
            const ruleId = 1;

            const {
                declarativeRules: [declarativeRule],
            } = DeclarativeRulesConverter.convert(
                [[filterId, rules]],
            );
            expect(declarativeRule).toEqual({
                id: ruleId,
                action: {
                    type: 'redirect',
                    redirect: {
                        transform: {
                            queryTransform: {
                                removeParams: ['param'],
                            },
                        },
                    },
                },
                condition: {
                    isUrlFilterCaseSensitive: false,
                    urlFilter: '||example.com',
                },
            });
        });

        it('converts empty $removeparam rule', () => {
            const filterId = 0;
            const rules = createRulesFromText(
                filterId,
                ['||example.com$removeparam'],
            );
            const ruleId = 1;

            const {
                declarativeRules: [declarativeRule],
            } = DeclarativeRulesConverter.convert(
                [[filterId, rules]],
            );
            expect(declarativeRule).toEqual({
                id: ruleId,
                action: {
                    type: 'redirect',
                    redirect: {
                        transform: {
                            query: '',
                        },
                    },
                },
                condition: {
                    isUrlFilterCaseSensitive: false,
                    urlFilter: '||example.com',
                },
            });
        });

        it('combine several $removeparam rule', () => {
            const filterId = 0;
            const rules = createRulesFromText(
                filterId,
                [
                    '||testcases.adguard.com$xmlhttprequest,removeparam=p1case1',
                    '||testcases.adguard.com$xmlhttprequest,removeparam=p2case1',
                    '||testcases.adguard.com$xmlhttprequest,removeparam=P3Case1',
                    '$xmlhttprequest,removeparam=p1case2',
                ],
            );
            const firstGroupedRuleId = 1;
            const secondGroupedRuleId = 4;

            const { declarativeRules } = DeclarativeRulesConverter.convert(
                [[filterId, rules]],
            );
            expect(declarativeRules)
                .toEqual(expect.arrayContaining([{
                    id: firstGroupedRuleId,
                    action: {
                        type: 'redirect',
                        redirect: {
                            transform: {
                                queryTransform: {
                                    removeParams: [
                                        'p1case1',
                                        'p2case1',
                                        'P3Case1',
                                    ],
                                },
                            },
                        },
                    },
                    condition: {
                        urlFilter: '||testcases.adguard.com',
                        resourceTypes: ['xmlhttprequest'],
                        isUrlFilterCaseSensitive: false,
                    },
                }, {
                    id: secondGroupedRuleId,
                    action: {
                        type: 'redirect',
                        redirect: {
                            transform: {
                                queryTransform: {
                                    removeParams: ['p1case2'],
                                },
                            },
                        },
                    },
                    condition: {
                        resourceTypes: ['xmlhttprequest'],
                        isUrlFilterCaseSensitive: false,
                    },
                }]));
        });

        it('converts $removeparam resource type xmlhttprequest', () => {
            const filterId = 0;
            const rules = createRulesFromText(
                filterId,
                ['||testcases.adguard.com$xmlhttprequest,removeparam=p2case2'],
            );
            const ruleId = 1;

            const {
                declarativeRules: [declarativeRule],
            } = DeclarativeRulesConverter.convert(
                [[filterId, rules]],
            );
            expect(declarativeRule).toEqual({
                id: ruleId,
                action: {
                    type: 'redirect',
                    redirect: {
                        transform: {
                            queryTransform: {
                                removeParams: ['p2case2'],
                            },
                        },
                    },
                },
                condition: {
                    isUrlFilterCaseSensitive: false,
                    resourceTypes: ['xmlhttprequest'],
                    urlFilter: '||testcases.adguard.com',
                },
            });
        });
    });
});
