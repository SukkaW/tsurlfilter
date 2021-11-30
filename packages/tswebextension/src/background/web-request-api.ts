/* eslint-disable @typescript-eslint/no-unused-vars */
import browser, {WebNavigation, WebRequest} from 'webextension-polyfill';
import {CosmeticOption, NetworkRuleOption, RequestType,} from '@adguard/tsurlfilter';

import { engineApi } from './engine-api';
import { tabsApi } from './tabs';
import { isOwnUrl, isHttpOrWsRequest, getDomain, isThirdPartyRequest } from './utils';
import { cosmeticApi } from './cosmetic-api';
import { redirectsService } from './services/redirects-service';
import { headersService } from './services/headers-service';
import { cookieFiltering } from './services/cookie-filtering/cookie-filtering';
import { contentFilteringService } from './services/content-filtering/content-filtering';
import {
    hideRequestInitiatorElement,
    BrowserEvents,
    requestContextStorage,
    getRequestType
} from './request';

export type WebRequestEventResponse = WebRequest.BlockingResponseOrPromise | void;

export interface WebRequestApiInterface {
    start: () => void;
    stop: () => void;
}


const MAX_URL_LENGTH = 1024 * 16;

export class WebRequestApi implements WebRequestApiInterface {
    private listenerRemovers: (() => void)[] = [];

    constructor() {
        this.onBeforeRequest = this.onBeforeRequest.bind(this);
        this.onBeforeSendHeaders = this.onBeforeSendHeaders.bind(this);
        this.onHeadersReceived = this.onHeadersReceived.bind(this);
        this.handleCspReportRequests = this.handleCspReportRequests.bind(this);
        this.onResponseStarted = this.onResponseStarted.bind(this);
        this.onErrorOccurred = this.onErrorOccurred.bind(this);
        this.onCompleted = this.onCompleted.bind(this);

        this.onCommitted = this.onCommitted.bind(this);
    }

    public start(): void {
        // browser.webRequest Events
        this.initBeforeRequestEventListener();
        this.initCspReportRequestsEventListener();

        this.initBeforeSendHeadersEventListener();
        this.initHeadersReceivedEventListener();
        this.initOnResponseStartedEventListener();
        this.initOnErrorOccurredEventListener();
        this.initOnCompletedEventListener();

        // browser.webNavigation Events
        this.initCommittedEventListener();
    }

    public stop(): void {
        this.listenerRemovers.forEach(removeListener => {
            removeListener();
        })

        this.listenerRemovers = [];

        browser.webNavigation.onCommitted.removeListener(this.onCommitted);
    }

    private onBeforeRequest({ context, details }: BrowserEvents.RequestData<
        WebRequest.OnBeforeRequestDetailsType
    >): WebRequestEventResponse {
        const {
            requestId,
            type,
            frameId,
            tabId,
            parentFrameId,
            originUrl,
            initiator,
        } = details;

        let { url } = details;

        /**
         * truncate too long urls
         * https://github.com/AdguardTeam/AdguardBrowserExtension/issues/1493
         */
        if (url.length > MAX_URL_LENGTH) {
            url = url.slice(0, MAX_URL_LENGTH);
        }

        /**
         * FF sends http instead of ws protocol at the http-listeners layer
         * Although this is expected, as the Upgrade request is indeed an HTTP request,
         * we use a chromium based approach in this case.
         */
        if (type === 'websocket' && url.indexOf('http') === 0) {
            url = url.replace(/^http(s)?:/, 'ws$1:');
        }

        const { requestType, contentType } = getRequestType(type);

        let requestFrameId = type === 'main_frame'
            ? frameId
            : parentFrameId;

        // Relate request to main_frame
        if (requestFrameId === -1) {
            requestFrameId = 0;
        }

        const referrerUrl = originUrl
            || initiator
            || getDomain(url)
            || url;

        const thirdParty = isThirdPartyRequest(url, referrerUrl);

        requestContextStorage.update(requestId, {
            requestUrl: url,
            referrerUrl,
            requestType,
            tabId,
            frameId,
            requestFrameId,
            thirdParty,
            contentType,
        })

        if (isOwnUrl(referrerUrl)
            || !isHttpOrWsRequest(url)) {
            return;
        }

        if (requestType === RequestType.Document || requestType === RequestType.Subdocument) {
            tabsApi.recordRequestFrame(
                tabId,
                frameId,
                referrerUrl,
                requestType,
            );
        }

        const result = engineApi.matchRequest({
            requestUrl: url,
            frameUrl: referrerUrl,
            requestType,
            frameRule: tabsApi.getTabFrameRule(tabId),
        });

        if (!result) {
            return;
        }

        requestContextStorage.update(requestId, {
            matchingResult: result
        });

        const basicResult = result.getBasicResult();

        if (basicResult && !basicResult.isAllowlist()) {
            if (basicResult.isOptionEnabled(NetworkRuleOption.Redirect)) {
                const redirectUrl = redirectsService.createRedirectUrl(basicResult.getAdvancedModifierValue());
                if (redirectUrl) {
                    return { redirectUrl };
                }
            }

            hideRequestInitiatorElement(tabId, requestFrameId, url, requestType, thirdParty);

            return { cancel: true };
        }

        // TODO: Check if content filtering is available (is FF)
        if (context && browser.webRequest.filterResponseData) {
            const cosmeticResult = engineApi.getCosmeticResult(
                context.referrerUrl!, CosmeticOption.CosmeticOptionHtml,
            );
            context.htmlRules = cosmeticResult.Html.getRules();

            // contentFilteringService.onBeforeRequest(
            //     browser.webRequest.filterResponseData(context.requestId),
            //     details,
            // );
        }

        return;
    }

    private onBeforeSendHeaders(data: BrowserEvents.RequestData<
        WebRequest.OnBeforeSendHeadersDetailsType
    >): WebRequestEventResponse {
        if (!data.context?.matchingResult){
            return;
        }

        cookieFiltering.onBeforeSendHeaders(data.details);

        let requestHeadersModified = false;
        if (headersService.onBeforeSendHeaders(data)) {
            requestHeadersModified = true;
        }

        if (requestHeadersModified) {
            return { requestHeaders: data.details.requestHeaders };
        }

        return;
    }

    private onHeadersReceived(data: BrowserEvents.RequestData<
        WebRequest.OnHeadersReceivedDetailsType
    >): WebRequestEventResponse {
        if (!data.context?.matchingResult){
            return;
        }

        const {
            matchingResult,
            requestType,
            referrerUrl,
            tabId,
            frameId,
        } = data.context;

        if (referrerUrl && (requestType === RequestType.Document || requestType === RequestType.Subdocument)){
            const cosmeticOption = matchingResult.getCosmeticOption();
            this.recordFrameInjection(referrerUrl, tabId, frameId, cosmeticOption);
        }

        cookieFiltering.onHeadersReceived(data.details);

        let responseHeadersModified = false;
        if (headersService.onHeadersReceived(data)) {
            responseHeadersModified = true;
        }

        if (responseHeadersModified) {
            return { responseHeaders: data.details.responseHeaders };
        }
    }

    private onResponseStarted({ context }: BrowserEvents.RequestData<
        WebRequest.OnResponseStartedDetailsType
    >): WebRequestEventResponse {
        if (!context?.matchingResult){
            return;
        }

        const {
            requestType,
            tabId,
            frameId,
        } = context;

        if (requestType === RequestType.Document){
            this.injectJsScript(tabId, frameId);
        }
    }

    private onCompleted({ details }: BrowserEvents.RequestData<
        WebRequest.OnCompletedDetailsType
    >): WebRequestEventResponse {
        requestContextStorage.delete(details.requestId);
    }

    private onErrorOccurred({ details }: BrowserEvents.RequestData<
        WebRequest.OnErrorOccurredDetailsType
    >): WebRequestEventResponse {
        const { requestId, tabId, frameId } = details;

        const frame = tabsApi.getTabFrame(tabId, frameId);

        if (frame?.injection){
            delete frame.injection;
        }

        requestContextStorage.delete(requestId);
    }

    private handleCspReportRequests(data: BrowserEvents.RequestData<
        WebRequest.OnBeforeRequestDetailsType
    >): WebRequestEventResponse {
        // TODO: implement
        return;
    }


    private onCommitted(details: WebNavigation.OnCommittedDetailsType): void {
        this.injectCosmetic(details);
    }


    private initBeforeRequestEventListener(): void {
        const filter: WebRequest.RequestFilter = {
            urls: ['<all_urls>'],
        };

        const extraInfoSpec: WebRequest.OnBeforeRequestOptions[] = ['blocking'];

        const removeListener = BrowserEvents.onBeforeRequest.addListener({
            callback: this.onBeforeRequest,
            filter,
            extraInfoSpec,
        });

        this.listenerRemovers.push(removeListener);
    }

    /**
     * Handler for csp reports urls
     */
    private initCspReportRequestsEventListener(): void {
        const filter: WebRequest.RequestFilter = {
            urls: ['<all_urls>'],
            types: ['csp_report'],
        };

        const extraInfoSpec: WebRequest.OnBeforeRequestOptions[] = ['requestBody'];

        const removeListener = BrowserEvents.onBeforeRequest.addListener({
            callback: this.handleCspReportRequests,
            filter,
            extraInfoSpec,
        });

        this.listenerRemovers.push(removeListener);
    }

    private initBeforeSendHeadersEventListener(): void {
        const filter: WebRequest.RequestFilter = {
            urls: ['<all_urls>'],
        };

        const removeListener =  BrowserEvents.onBeforeSendHeaders.addListener({
            callback: this.onBeforeSendHeaders,
            filter,
        });

        this.listenerRemovers.push(removeListener);
    }

    private initHeadersReceivedEventListener(): void {
        const filter: WebRequest.RequestFilter = {
            urls: ['<all_urls>'],
        };

        const extraInfoSpec: WebRequest.OnHeadersReceivedOptions[] = ['responseHeaders', 'blocking'];

        const removeListener =  BrowserEvents.onHeadersReceived.addListener({
            callback: this.onHeadersReceived,
            filter,
            extraInfoSpec,
        });

        this.listenerRemovers.push(removeListener);
    }

    private initOnResponseStartedEventListener(): void {
        const filter: WebRequest.RequestFilter = {
            urls: ['<all_urls>'],
        };

        const removeListener = BrowserEvents.onResponseStarted.addListener({
            callback: this.onResponseStarted,
            filter,
        });

        this.listenerRemovers.push(removeListener);
    }

    private initOnErrorOccurredEventListener(): void {
        const filter: WebRequest.RequestFilter = {
            urls: ['<all_urls>'],
        };

        const removeListener = BrowserEvents.onErrorOccurred.addListener({ filter });
        this.listenerRemovers.push(removeListener);
    }

    private initOnCompletedEventListener(): void {
        const filter: WebRequest.RequestFilter = {
            urls: ['<all_urls>'],
        };

        const extraInfoSpec: WebRequest.OnCompletedOptions[] = ['responseHeaders'];

        const removeListener = BrowserEvents.onCompleted.addListener({
            filter,
            extraInfoSpec
        });

        this.listenerRemovers.push(removeListener);
    }

    private initCommittedEventListener(): void {
        browser.webNavigation.onCommitted.addListener(this.onCommitted);
    }

    private recordFrameInjection(
        url: string,
        tabId: number,
        frameId: number,
        cosmeticOption: CosmeticOption,
    ): void {
        const cosmeticResult = engineApi.getCosmeticResult(url, cosmeticOption);

        const cssText = cosmeticApi.getCssText(cosmeticResult);
        const extCssText = cosmeticApi.getExtCssText(cosmeticResult);
        const jsScriptText = cosmeticApi.getScriptText(cosmeticResult);

        const frame = tabsApi.getTabFrame(tabId, frameId);

        if (frame){
            frame.injection = {
                cssText,
                extCssText,
                jsScriptText,
            };
        }
    }

    private injectJsScript(tabId: number, frameId: number) {
        const frame = tabsApi.getTabFrame(tabId, frameId);

        if (frame?.injection?.jsScriptText) {
            cosmeticApi.injectScript(frame.injection.jsScriptText, tabId, frameId);
        }
    }

    private injectCosmetic(details: WebNavigation.OnCommittedDetailsType): void{
        const { url, tabId, frameId } = details;

        const frame = tabsApi.getTabFrame(tabId, frameId);

        const referrerUrl = frame?.url || getDomain(url) || url;

        if (isOwnUrl(referrerUrl)
            || !isHttpOrWsRequest(url)) {
            return;
        }

        if (frame?.injection){
            const {
                cssText,
                extCssText,
                jsScriptText,
            } = frame.injection;

            if (cssText){
                cosmeticApi.injectCss(cssText, tabId, frameId);
            }

            /*
            if (extCssText){
                cosmeticApi.injectExtCss(extCssText, tabId, frameId);
            }
            */

            if (jsScriptText){
                cosmeticApi.injectScript(jsScriptText, tabId, frameId);
            }

            delete frame.injection;
        }
    }
}

export const webRequestApi = new WebRequestApi();
