/* eslint-disable class-methods-use-this */
// TODO: Remove call to console
/* eslint-disable no-console */
import FiltersApi from './filters-api';
import UserRulesApi from './user-rules-api';
import MessagesApi from './messages-api';
import TabsApi from './tabs-api';
import { getAndExecuteScripts } from './scriptlets';

import {
    AppInterface,
    SiteStatus,
    defaultFilteringLog,
    configurationValidator,
    ConfigurationContext,
    Configuration,
} from '../../common';
import { engineApi } from './engine-api';

// TODO: implement
export class TsWebExtension implements AppInterface<Configuration, ConfigurationContext> {
    onFilteringLogEvent = defaultFilteringLog.onLogEvent;

    configuration: ConfigurationContext | undefined;

    isStarted = false;

    private startPromise: Promise<void> | undefined;

    /**
     * Web accessible resources path in the result bundle
     * relative to the root dir. Should start with leading slash '/'
     */
    private readonly webAccessibleResourcesPath: string | undefined;

    /**
     * Constructor
     *
     * @param webAccessibleResourcesPath string path to web accessible resourses,
     * relative to the extension root dir. Should start with leading slash '/'
     */
    constructor(webAccessibleResourcesPath?: string) {
        this.webAccessibleResourcesPath = webAccessibleResourcesPath;
    }

    /**
     * Runs configuration process via saving promise to inner startPromise
     */
    private async innerStart(config: Configuration): Promise<void> {
        console.debug('[START]: start');

        try {
            await this.configure(config);
        } catch (e) {
            this.startPromise = undefined;
            console.debug('[START]: failed', e);

            return;
        }

        this.isStarted = true;
        this.startPromise = undefined;
        console.debug('[START]: started');
    }

    /**
     * Starts filtering
     */
    public async start(config: Configuration): Promise<void> {
        console.debug('[START]: is started ', this.isStarted);

        if (this.isStarted) {
            return;
        }

        if (this.startPromise) {
            console.debug('[START]: already called start, waiting');
            await this.startPromise;
            console.debug('[START]: awaited start');
            return;
        }

        const configuration = configurationValidator.parse(config);

        // Call and wait for promise for allow multiple calling start
        this.startPromise = this.innerStart(configuration);
        await this.startPromise;

        await this.executeScriptlets(configuration);
    }

    /**
     * Stops service, disables all user rules and filters
     */
    public async stop(): Promise<void> {
        await UserRulesApi.removeAllRules();

        const disableFiltersIds = await FiltersApi.getEnabledRulesets();
        await FiltersApi.updateFiltering(disableFiltersIds);

        await engineApi.stopEngine();

        this.isStarted = false;
    }

    /**
     * Uses configuration to pass params to filters, user rules and filter engine
     */
    public async configure(config: Configuration): Promise<void> {
        console.debug('[CONFIGURE]: start with ', config);

        const configuration = configurationValidator.parse(config);

        const enableFiltersIds = configuration.filters
            .map(({ filterId }) => filterId);
        const currentFiltersIds = await FiltersApi.getEnabledRulesets();
        const disableFiltersIds = currentFiltersIds
            .filter((f) => !enableFiltersIds.includes(f)) || [];

        await FiltersApi.updateFiltering(disableFiltersIds, enableFiltersIds);
        await UserRulesApi.updateDynamicFiltering(
            configuration.userrules,
            this.webAccessibleResourcesPath,
        );
        await engineApi.startEngine({
            filters: configuration.filters,
            userrules: configuration.userrules,
            verbose: configuration.verbose,
        });

        this.configuration = TsWebExtension.createConfigurationContext(configuration);

        console.debug('[CONFIGURE]: end');
    }

    public openAssistant(): void {}

    public closeAssistant(): void {}

    public getSiteStatus(): SiteStatus {
        return SiteStatus.FilteringEnabled;
    }

    public getRulesCount(): number {
        return 0;
    }

    /**
     * @returns messages handler
     */
    public getMessageHandler() {
        const messagesApi = new MessagesApi(this);
        return messagesApi.handleMessage;
    }

    async executeScriptlets(config: Configuration) {
        const activeTab = await TabsApi.getActiveTab();

        if (this.isStarted && activeTab?.url && activeTab?.id) {
            const { url, id } = activeTab;
            const { filters, userrules, verbose } = config;
            await engineApi.startEngine({ filters, userrules, verbose });
            await getAndExecuteScripts(id, url, verbose);
        }

        chrome.webNavigation.onCommitted.addListener(
            async (details) => {
                if (this.isStarted) {
                    const { filters, userrules, verbose } = config;
                    await engineApi.startEngine({ filters, userrules, verbose });
                    await getAndExecuteScripts(details.tabId, details.url, verbose);
                }
            },
        );
    }

    /**
     * Extract Partial Configuration from whole Configration,
     * excluding heavyweight fields which contains rules
     * @param configuration Configuration
     * @returns ConfigurationContext
     */
    private static createConfigurationContext(configuration: Configuration): ConfigurationContext {
        const { filters, verbose, settings } = configuration;

        return {
            filters: filters.map(({ filterId }) => filterId),
            verbose,
            settings,
        };
    }
}
