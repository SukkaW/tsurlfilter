/**
 * Configuration object interface
 */
interface Configuration {
    // available filters
    filters: number[],
    // urls to custom filters
    customFilters: string[],
    allowlist: string[],
    userrules: string[],
    settings: {
        // method setFilterUpdateInterval can be implemented through this property
        filtersUpdateInterval: number,
        activateFiltersAutomatically: boolean,
        allowlistInverted: boolean,
        // enables css hits counter if true
        collectStats: boolean,
        useOptimizedFilters: boolean,
        stealth: {
            blockChromeClientData: boolean,
            hideReferrer: boolean,
            hideSearchQueries: boolean,
            sendDoNotTrack: boolean,
            blockWebRTC: boolean,
            selfDestructThirdPartyCookies: boolean
            selfDestructThirdPartyCookiesTime: number,
            selfDestructFirstPartyCookies: boolean,
            selfDestructFirstPartyCookiesTime: number,
        },
    },
    localFiltersFolder: string,
    localFiltersName: string,
    localFiltersNameOptimized: string,
    localFiltersTranslations: string,
    localFiltersMetadata: string,
    filtersMetadataUrl: string,
    filterRulesUrl: string,
}

// TODO complement with other methods
type RequestMethod = 'POST' | 'GET'

// TODO complement with other types
type RequestType = 'DOCUMENT' | 'PING' | 'IMAGE' | 'STYLESHEET' | 'SCRIPT'

interface RequestRule {
    filterId: number,
    ruleText: string,
    allowlistRule: boolean,
    cspRule: boolean,
    modifierValue: string | null,
    cookieRule: boolean
    cssRule: boolean,
}

// TODO complement with required fields
interface FilteringLogEvent {
    tabId: number,
    eventId: number,
    // string representation of blocked dom node
    element?: string,
    requestUrl?: string,
    frameUrl: string,
    requestType: RequestType,
    timestamp: number,
    statusCode: number,
    method: RequestMethod,
    requestRule: RequestRule,
}

interface Tag {
    id: number,
    title: string,
}

interface FiltersState {
    id: number,
    title: string,
    description: string,
    groupId: number,
    enabled: boolean,
    version: string,
    tags: number[],
    updated: number,
    homepage: string,
    order: number,
    languages: string[],
}

interface GroupsState {
    id: number,
    title: string,
    description: string,
    order: number,
}

interface FiltersMetadata {
    filters: FiltersState[],
    groups: GroupsState[],
    tags: Tag[],
}

interface ApiInterface {
    /**
     * Starts api
     * @param configuration
     */
    start(configuration: Configuration): Promise<void>

    /**
     * Stops api
     */
    stop(): void

    /**
     * Updates configuration
     * @param configuration
     */
    configure(configuration: Configuration): Promise<void>

    /**
     * Fires on filtering log event
     */
    onFilteringLogEvent(cb: (filteringLogEvent: FilteringLogEvent) => void): void,

    /**
     * Launches assistant in the current tab
     */
    openAssistant(): void,

    /**
     * Closes assistant
     */
    closeAssistant(): void,

    /**
     * Checks updates of filters
     */
    checkFiltersUpdates(): Promise<void>,

    /**
     * Returns filters state
     */
    getFiltersMetadata(): FiltersMetadata,

    /**
     * Enables filter
     */
    enableFilter(filterId: number): Promise<void>,

    /**
     * Disables filter
     */
    disableFilter(filterId: number): Promise<void>,

    /**
     * Enables group
     */
    enableGroup(groupId: number): Promise<void>,

    /**
     * Disables group
     */
    disableGroup(groupId: number): Promise<void>,
}

class Api implements ApiInterface {
    public async start(configuration: Configuration): Promise<void> {
        // TODO implement
    }

    public stop() {
        // TODO implement
    }

    public async configure(configuration: Configuration): Promise<void> {
        // TODO implement
    }

    public onFilteringLogEvent(cb: (filteringLogEvent: FilteringLogEvent) => void) {
        // TODO implement
        cb({
            tabId: 10,
            eventId: 10,
            requestUrl: 'https://example.org',
            frameUrl: 'https://example.org',
            requestType: 'DOCUMENT' as RequestType,
            timestamp: 1633960896641,
            statusCode: 200,
            method: 'POST' as RequestMethod,
            requestRule: {
                filterId: 1,
                ruleText: '||ad.mail.ru^$domain=~e.mail.ru|~octavius.mail.ru',
                allowlistRule: false,
                cspRule: false,
                modifierValue: null,
                cookieRule: false,
                cssRule: false,
            },
        });
    }

    public async checkFiltersUpdates(): Promise<void> {
        // TODO implement
    }

    public openAssistant() {
        // TODO implement
    }

    public closeAssistant() {
        // TODO implement
    }

    public getFiltersMetadata(): FiltersMetadata {
        // TODO implement
        return {} as FiltersMetadata;
    }

    public async enableFilter(filterId: number): Promise<void> {
        // TODO implement
    }

    public async disableFilter(filterId: number): Promise<void> {
        // TODO implement
    }

    public async enableGroup(groupId: number): Promise<void> {
        // TODO implement
    }

    public async disableGroup(groupId: number): Promise<void> {
        // TODO implement
    }
}

// Usage example
(async () => {
    const api = new Api();

    const configuration: Configuration = {
        filters: [1, 2],
        customFilters: ['https://example.org/custom_filter_url', 'https://example.org/another_custom_filter_url'],
        allowlist: ['example.com'],
        userrules: ['||example.org^', 'example.com##h1'],
        settings: {
            filtersUpdateInterval: 60 * 60 * 1000,
            activateFiltersAutomatically: true,
            collectStats: true,
            allowlistInverted: false,
            useOptimizedFilters: false,
            stealth: {
                blockChromeClientData: true,
                hideReferrer: true,
                hideSearchQueries: true,
                sendDoNotTrack: true,
                blockWebRTC: true,
                selfDestructThirdPartyCookies: true,
                selfDestructThirdPartyCookiesTime: 3600,
                selfDestructFirstPartyCookies: true,
                selfDestructFirstPartyCookiesTime: 3600,
            },
        },
        localFiltersFolder: 'filters',
        localFiltersName: 'filter_{filterId}.txt',
        localFiltersNameOptimized: 'filter_mobile_{filterId}.txt',
        localFiltersTranslations: 'filters_i18n.json',
        localFiltersMetadata: 'filters.json',
        filtersMetadataUrl: 'https://filters.adtidy.org/extension/chromium/filters.json',
        filterRulesUrl: 'https://filters.adtidy.org/extension/chromium/filters/{filter_id}.txt',
    };

    // start api with required configuration
    await api.start(configuration);

    // update configuration
    await api.configure(configuration);

    // handle filtering log events and stats
    api.onFilteringLogEvent((filteringLogEvent: FilteringLogEvent) => {
        // TODO keep track of filtering log events, and update filtering log page
        console.log(filteringLogEvent);
    });

    setTimeout(() => {
        api.stop();
    }, 5 * 60 * 1000);
})();
