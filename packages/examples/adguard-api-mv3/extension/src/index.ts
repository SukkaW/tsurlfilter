/* eslint-disable no-console */
import { adguardApi, APIConfiguration } from "@adguard/api";

// FIXME: This code will reevaluate when service worker will be reloaded
(async (): Promise<void> => {
    const configuration: APIConfiguration = {
        filters: [2],
        rules: ["example.org##h1"],
    };

    await adguardApi.start(configuration);

    console.log("Finished Adguard API initialization.");

    configuration.rules!.push("||google.com^$document");

    await adguardApi.configure(configuration);

    console.log("Finished Adguard API re-configuration");

    // Disable Adguard in 1 minute
    setTimeout(async () => {
        await adguardApi.stop();
        console.log("Adguard API has been disabled.");
    }, 60 * 1000);
})();
