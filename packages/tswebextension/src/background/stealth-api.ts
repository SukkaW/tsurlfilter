import browser, { WebRequest } from 'webextension-polyfill';
import { StringRuleList } from '@adguard/tsurlfilter';
import { Configuration } from './configuration';
import { StealthConfig, StealthService } from './services/stealth-service';
import { RequestContext, requestContextStorage } from './request/request-context-storage';

/**
 * Stealth api
 */
export interface StealthApiInterface {
    start: (configuration: Configuration) => void;
    stop: () => void;
}

/**
 * Stealth api implementation
 */
export class StealthApi implements StealthApiInterface {
    /**
     * Stealth filter identifier
     */
    private static STEALTH_MODE_FILTER_ID: -1;

    /**
     * Stealth configuration
     */
    private configuration: StealthConfig | undefined;

    /**
     * Stealth service
     */
    private engine: StealthService | undefined;

    /**
     * Starts service
     *
     * @param configuration
     */
    public start(configuration: Configuration):void {
        this.configuration = {
            ...configuration.settings.stealth,
        } as StealthConfig;

        this.engine = new StealthService(this.configuration);

        const filter: WebRequest.RequestFilter = {
            urls: ['<all_urls>'],
        };

        browser.webRequest.onBeforeSendHeaders.addListener(this.onBeforeSendHeaders, filter);
    }

    /**
     * Stops service
     */
    public stop():void {
        browser.webRequest.onBeforeSendHeaders.removeListener(this.onBeforeSendHeaders);
    }

    /**
     * Returns rule list with stealth mode rules
     * @return {StringRuleList}
     */
    public getStealthModeRuleList(): StringRuleList | null {
        if (!this.engine) {
            return null;
        }

        const rulesTexts = this.engine.getCookieRulesTexts().join('\n');
        return new StringRuleList(StealthApi.STEALTH_MODE_FILTER_ID, rulesTexts, false, false);
    }

    /**
     * Handler
     *
     * @param details
     */
    private onBeforeSendHeaders(details: WebRequest.OnBeforeSendHeadersDetailsType):void {
        if (!this.engine) {
            return;
        }

        if (!details.requestHeaders) {
            return;
        }

        const context = requestContextStorage.get(details.requestId);
        if (!context) {
            return;
        }

        if (!this.canApplyStealthActionsToContext(context)) {
            return;
        }

        const stealthActions = this.engine.processRequestHeaders(
            context.requestUrl!,
            context.requestType!,
            details.requestHeaders,
        );

        // if (stealthActions > 0) {
        //     requestContextStorage.update(details.requestId, { stealthActions });
        // }
    }

    private canApplyStealthActionsToContext(context: RequestContext): boolean {
        // TODO: Missing config field
        // if (isStealthModeDisabled()) {
        //     return false;
        // }

        const matchingResult = context.matchingResult;
        if (matchingResult) {
            if (matchingResult.documentRule || matchingResult.stealthRule) {
                return false;
            }
        }

        return true;
    }
}

export const stealthApi = new StealthApi();
