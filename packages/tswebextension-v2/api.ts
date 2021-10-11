// API interface

interface Configuration {
    // Methods which will be implemented through this property:
    //  - addCustomFilter
    //  - enableFilter
    //  - disableFilter
    filters: number[],
    // urls to custom filters
    customFilters: string[],
    allowlist: string[],
    userrules: string[],
    settings: {
        // method setFilterUpdateInterval can be implemented through this property
        filtersUpdateInterval: number,
        activateFiltersAutomatically: boolean,
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
    filtersMetadataUrl: string,
    filterRulesUrl: string,
}

// TODO complement with other methods
type RequestMethod = 'POST' | 'GET' | 'PING'

interface FilteringLogEvent {
    eventId: number,
    requestUrl: string,
    timestamp: number,
    isThirdParty: boolean,
    method: RequestMethod,
}

interface Stats {
    // TODO implement convenient structure
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
     * Returns filtering log events
     */
    getFilteringLogEvents(): FilteringLogEvent[],

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
     * Returns stats of blocked ads
     */
    getStats(): Stats,

    /**
     * Calls callback with current stats object when stats object updates
     * @param callback
     */
    onStatsUpdate(callback: (stats: Stats) => void): void,

    /**
     * Opens tab with filtering log
     */
    openFilteringLog(): void,

    /**
     * Clears stats
     */
    clearStats(): void,
}

class Api implements ApiInterface {
    async start(configuration: Configuration): Promise<void> {
        // TODO implement
    }

    stop() {
        // TODO implement
    }

    async configure(configuration: Configuration): Promise<void> {
        // TODO implement
    }

    getFilteringLogEvents() {
        // TODO implement
        return [{
            eventId: 10,
            requestUrl: 'https://example.org',
            timestamp: 1633960896641,
            isThirdParty: false,
            method: 'POST' as RequestMethod,
        }]
    }

    async checkFiltersUpdates(): Promise<void> {
        // TODO implement
    }

    openAssistant() {
        // TODO implement
    }

    closeAssistant() {
        // TODO implement
    }

    getStats(): Stats {
        // TODO implement
        return {};
    }

    onStatsUpdate(cb: (stats: Stats) => void): void {
        // TODO implement
        return cb({});
    }

    clearStats(): void {
        // TODO implement
    }

    openFilteringLog(): void {
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
        filtersMetadataUrl: 'https://filters.adtidy.org/extension/chromium/filters.json',
        filterRulesUrl: 'https://filters.adtidy.org/extension/chromium/filters/{filter_id}.txt',
    }

    // start api with required configuration
    await api.start(configuration);

    // update configuration
    await api.configure(configuration);

    // get filtering log
    const filteringLogEvents = api.getFilteringLogEvents();

    api.onStatsUpdate((stats: Stats) => {
        // TODO update popup and/or send stats to server if required
    });

    setTimeout(() => {
        api.stop();
    }, 5 * 60 * 1000)
})();
