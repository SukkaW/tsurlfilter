/* eslint-disable jsdoc/require-file-overview */
/* eslint-disable no-console */
import { AdguardApi, APIConfiguration } from '@adguard/api';

(async (): Promise<void> => {
    const configuration: APIConfiguration = {
        filters: [2],
        rules: ['example.org##h1'],
    };

    const adguardApi = AdguardApi.create();

    // console log current rules count, loaded in engine
    const logTotalCount = (): void => {
        console.log('Total rules in engine count:', adguardApi.getRulesCount());

        const staticRuleSetsRegularRules = adguardApi.staticRuleSetsCounters
            .reduce((sum, counters) => sum + counters.rulesCount, 0);
        console.log('Total regular rules in static filters:', staticRuleSetsRegularRules);

        const staticRuleSetsRegexpRules = adguardApi.staticRuleSetsCounters
            .reduce((sum, counters) => sum + counters.rulesCount, 0);
        console.log('Total regexp rules in static filters:', staticRuleSetsRegexpRules);

        const dynamicRegularRules = adguardApi.dynamicRulesInfo?.rules;
        console.log('Total regular rules in dynamic rules:', dynamicRegularRules);

        const dynamicRegexpRules = adguardApi.dynamicRulesInfo?.regexpsRules;
        console.log('Total regexp rules in dynamic rules:', dynamicRegexpRules);
    };

    // update config on assistant rule apply
    adguardApi.onAssistantCreateRule.subscribe(async (rule) => {
        console.log(`Rule ${rule} was created by Adguard Assistant`);
        configuration.rules?.push(rule);
        await adguardApi.configure(configuration);
        console.log('Finished Adguard API re-configuration');
        logTotalCount();
    });

    chrome.runtime.onMessage.addListener(async (message) => {
        switch (message.type) {
            case 'OPEN_ASSISTANT': {
                chrome.tabs.query({ active: true }, async (res) => {
                    if (res[0]?.id) {
                        await adguardApi.openAssistant(res[0].id);
                    }
                });
                break;
            }
            default:
            // do nothing
        }
    });

    await adguardApi.start(configuration);

    console.log('Finished Adguard API initialization.');
    logTotalCount();

    configuration.rules?.push('||google.com^$document');

    await adguardApi.configure(configuration);

    console.log('Finished Adguard API re-configuration');
    logTotalCount();

    // Enable all available filters to test browser limitation
    configuration.filters = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 224];

    const appliedConfiguration = await adguardApi.configure(configuration);

    console.log('Finished Adguard API after enable too much filters: ', appliedConfiguration.filters);
    logTotalCount();

    // Disable Adguard in 1 minute
    setTimeout(async () => {
        await adguardApi.stop();
        console.log('Adguard API has been disabled.');
    }, 60 * 1000);
})();
