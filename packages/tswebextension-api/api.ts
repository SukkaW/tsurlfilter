/**
 * Configuration object interface
 */
interface Configuration {
    /**
     * Specifies filter lists that will be used to filter content.
     * filterId should uniquely identify the filter so that the API user
     * may match it with the source lists in the filtering log callbacks.
     * content is a string with the full filter list content. The API will
     * parse it into a list of individual rules.
     */
    filters: { filterId: number, content: string }[],

    /**
     * List of domain names of sites, which should be excluded from blocking
     * or which should be included in blocking depending on the value of
     * allowlistInverted setting value
     */
    allowlist: string[],

    /**
     * List of rules added by user
     */
    userrules: string[],

    /**
     * Flag responsible for logging
     */
    verbose: boolean,

    settings: {
        /**
         * Flag specifying if ads for sites would be blocked or allowed
         */
        allowlistInverted: boolean,
        /**
         * Enables css hits counter if true
         */
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
}

// TODO complement with other methods
type RequestMethod = 'POST' | 'GET'

// TODO complement with other types
type RequestType = 'DOCUMENT' | 'PING' | 'IMAGE' | 'STYLESHEET' | 'SCRIPT'

/**
 * Represents information about rule which blocked ad
 * can be used in the stats of filtering log
 */
interface RequestRule {
    filterId: number,
    ruleText: string,
    allowlistRule: boolean,
    cspRule: boolean,
    modifierValue: string | null,
    cookieRule: boolean
    cssRule: boolean,
}

/**
 * Represents data of filtering log event, can be used to display events
 * in the filtering log, or collect stats to display on popup
 */
interface FilteringLogEvent {
    // TODO complement with required fields
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

/**
 * Returns information about state for site
 */
enum SiteStatus {
    /**
     * AdBlocker can't apply rules on this site
     */
    SiteInException = 'SITE_IN_EXCEPTION',
    /**
     * Site is in the allowlist
     */
    SiteAllowlisted = 'SITE_ALLOWLISTED',

    /**
     * Filtering on the site is working as expected
     */
    FilteringEnabled = 'FILTERING_ENABLED',
}

interface TsWebExtensionInterface {
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
     * Returns current status for site
     */
    getSiteStatus(url: string): SiteStatus,
}

class TsWebExtension implements TsWebExtensionInterface {
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

    public openAssistant() {
        // TODO implement
    }

    public closeAssistant() {
        // TODO implement
    }

    public getSiteStatus(url: string): SiteStatus {
        // TODO implement
        return SiteStatus.FilteringEnabled;
    }
}

// Usage example
(async () => {
    const tsWebExtension = new TsWebExtension();

    const configuration: Configuration = {
        filters: [
            { filterId: 1, content: '' },
            { filterId: 2, content: '' },
        ],
        allowlist: ['example.com'],
        userrules: ['||example.org^', 'example.com##h1'],
        verbose: false,
        settings: {
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
    };

    // start tsWebExtension with required configuration
    await tsWebExtension.start(configuration);

    // update configuration
    await tsWebExtension.configure(configuration);

    // handle filtering log events and stats
    tsWebExtension.onFilteringLogEvent((filteringLogEvent: FilteringLogEvent) => {
        // TODO keep track of filtering log events, and update filtering log page
        console.log(filteringLogEvent);
    });

    setTimeout(() => {
        tsWebExtension.stop();
    }, 5 * 60 * 1000);
})();
