/**
 * Configuration object interface
 */
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
        allowlistInverted: boolean,
        // enables css hits counter if true
        collectStats: boolean,
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
    verbose: boolean,
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

interface Stats {
    // TODO implement required structure
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
     * Returns stats of blocked ads
     */
    getStats(): Stats,

    /**
     * Fires on stats update
     * @param callback
     */
    onStatsUpdate(callback: (stats: Stats) => void): void,

    /**
     * Clears stats
     */
    clearStats(): void,
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

    public getStats(): Stats {
        // TODO implement
        return {};
    }

    public onStatsUpdate(cb: (stats: Stats) => void): void {
        // TODO implement
        cb({});
    }

    public clearStats(): void {
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
        verbose: true,
        filtersMetadataUrl: 'https://filters.adtidy.org/extension/chromium/filters.json',
        filterRulesUrl: 'https://filters.adtidy.org/extension/chromium/filters/{filter_id}.txt',
    };

    // start api with required configuration
    await api.start(configuration);

    // update configuration
    await api.configure(configuration);

    // handle filtering log events
    api.onFilteringLogEvent((filteringLogEvent: FilteringLogEvent) => {
        // TODO keep track of filtering log events, and update filtering log page
    });

    // handle stats events
    api.onStatsUpdate((stats: Stats) => {
        // TODO update popup and/or send stats to server if required
    });

    setTimeout(() => {
        api.stop();
    }, 5 * 60 * 1000);
})();
