/**
 * Configuration object interface
 */
interface Configuration {
    filters: { filterId: number, content: string }[],
    allowlist: string[],
    userrules: string[],
    verbose: boolean,
    settings: {
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
}

class TsWebExtension implements ApiInterface {
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
