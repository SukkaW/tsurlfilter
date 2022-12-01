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
        console.log('Total rules count:', adguardApi.getRulesCount());
    };

    await adguardApi.start(configuration);

    console.log('Finished Adguard API initialization.');
    logTotalCount();

    configuration.rules!.push('||google.com^$document');

    await adguardApi.configure(configuration);

    console.log('Finished Adguard API re-configuration');
    logTotalCount();

    // update config on assistant rule apply
    adguardApi.onAssistantCreateRule.subscribe(async (rule) => {
        console.log(`Rule ${rule} was created by Adguard Assistant`);
        configuration.rules!.push(rule);
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

    // Disable Adguard in 1 minute
    setTimeout(async () => {
        await adguardApi.stop();
        console.log('Adguard API has been disabled.');
    }, 60 * 1000);
})();
