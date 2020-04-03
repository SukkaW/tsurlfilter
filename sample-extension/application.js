/* eslint-disable no-console, import/extensions, import/no-unresolved */
import * as AGUrlFilter from './engine.js';
import { applyCss, applyScripts } from './cosmetic.js';
import { FilteringLog } from './filtering-log/filtering-log.js';

/**
 * Extension application class
 */
export class Application {
    /**
     * TS Engine instance
     */
    engine;

    /**
     * Filtering log
     */
    filteringLog = new FilteringLog();

    /**
     * Initializes engine instance
     *
     * @param rulesText
     */
    async startEngine(rulesText) {
        console.log('Starting url filter engine');

        const list = new AGUrlFilter.StringRuleList(1, rulesText, false);
        const ruleStorage = new AGUrlFilter.RuleStorage([list]);
        const config = {
            engine: 'extension',
            // eslint-disable-next-line no-undef
            version: chrome.runtime.getManifest().version,
            verbose: true,
        };

        this.engine = new AGUrlFilter.Engine(ruleStorage, config);

        console.log('Starting url filter engine..ok');
    }

    /**
     * On before request handler
     *
     * @param details request details
     */
    // eslint-disable-next-line consistent-return
    onBeforeRequest(details) {
        console.debug('Processing request..');
        console.debug(details);

        const requestType = Application.testGetRequestType(details.type);
        const request = new AGUrlFilter.Request(details.url, details.initiator, requestType);
        const result = this.engine.matchRequest(request);

        console.debug(result);

        const requestRule = result.getBasicResult();

        if (details.type === 'main_frame') {
            this.filteringLog.addHttpRequestEvent(details.tabId, details.url, details.url, requestRule);
        }

        if (requestRule
            && !requestRule.isWhitelist()) {
            // eslint-disable-next-line consistent-return
            return { cancel: true };
        }
    }

    /**
     * Applies cosmetic rules to request tab
     *
     * @param details request details
     */
    applyCosmetic(details) {
        const { tabId, url } = details;

        console.debug(`Processing tab ${tabId} changes..`);

        // This is a mock request, to do it properly we should pass main frame request with correct cosmetic option
        const request = new AGUrlFilter.Request(url, url, AGUrlFilter.RequestType.Document);
        const cosmeticResult = this.engine.getCosmeticResultForRequest(request,
            AGUrlFilter.CosmeticOption.CosmeticOptionAll);
        console.debug(cosmeticResult);

        applyCss(tabId, cosmeticResult);
        applyScripts(tabId, cosmeticResult);

        // const domainName = adguard.utils.url.getHost(url);
        cosmeticResult.getScriptRules().forEach((scriptRule) => {
            // if (!scriptRule.rule.isDomainSpecific(domainName)) {
            //     return;
            // }

            this.filteringLog.addScriptInjectionEvent(
                tabId,
                url,
                scriptRule,
            );
        });
    }

    /**
     * On response headers received handler
     *
     * @param details
     * @return {{responseHeaders: *}}
     */
    // eslint-disable-next-line consistent-return
    onResponseHeadersReceived(details) {
        let responseHeaders = details.responseHeaders || [];

        let responseHeadersModified = false;
        if (details.type === 'main_frame') {
            const cspHeaders = this.getCSPHeaders(details);
            console.debug(cspHeaders);

            if (cspHeaders && cspHeaders.length > 0) {
                responseHeaders = responseHeaders.concat(cspHeaders);
                responseHeadersModified = true;
            }
        }

        const cookieRules = this.getCookieRules(details);
        if (this.processHeaders(details, responseHeaders, cookieRules)) {
            responseHeadersModified = true;
        }

        if (responseHeadersModified) {
            console.debug('Response headers modified');
            return { responseHeaders };
        }
    }

    /**
     * Called before request is sent to the remote endpoint.
     *
     * @param details Request details
     * @returns {*} headers to send
     */
    // eslint-disable-next-line consistent-return
    onBeforeSendHeaders(details) {
        const requestHeaders = details.requestHeaders || [];

        let requestHeadersModified = false;

        const cookieRules = this.getCookieRules(details);
        if (this.processHeaders(details, requestHeaders, cookieRules)) {
            requestHeadersModified = true;
        }

        if (requestHeadersModified) {
            console.debug('Request headers modified');
            return { requestHeaders };
        }
    }

    /**
     * Returns cookie rules matching request details
     *
     * @param details
     * @return {NetworkRule[]}
     */
    getCookieRules(details) {
        const request = new AGUrlFilter.Request(details.url, details.initiator, AGUrlFilter.RequestType.Document);
        const result = this.engine.matchRequest(request);

        return result.getCookieRules();
    }

    /**
     * Modifies cookie header
     *
     * @param details
     * @param headers
     * @param cookieRules
     * @return {null}
     */
    processHeaders(details, headers, cookieRules) {
        console.debug('Processing headers');
        console.debug(headers);

        cookieRules.forEach((r) => {
            this.filteringLog.addCookieEvent(details.tabId, details.url, r);
        });

        // TODO: Modify cookie header

        return null;
    }

    /**
     * Modify CSP header to block WebSocket, prohibit data: and blob: frames and WebWorkers
     *
     * @param details
     * @returns {{responseHeaders: *}} CSP headers
     */
    getCSPHeaders(details) {
        const request = new AGUrlFilter.Request(details.url, details.initiator, AGUrlFilter.RequestType.Document);
        const result = this.engine.matchRequest(request);

        const cspHeaders = [];
        const cspRules = result.getCspRules();
        if (cspRules) {
            for (let i = 0; i < cspRules.length; i += 1) {
                const rule = cspRules[i];
                cspHeaders.push({
                    name: 'Content-Security-Policy',
                    value: rule.getAdvancedModifierValue(),
                });
            }
        }

        return cspHeaders;
    }

    /**
     * Transform string to Request type object
     *
     * @param requestType
     * @return {RequestType}
     */
    static testGetRequestType(requestType) {
        switch (requestType) {
            case 'document':
                return AGUrlFilter.RequestType.Subdocument;
            case 'stylesheet':
                return AGUrlFilter.RequestType.Stylesheet;
            case 'font':
                return AGUrlFilter.RequestType.Font;
            case 'image':
                return AGUrlFilter.RequestType.Image;
            case 'media':
                return AGUrlFilter.RequestType.Media;
            case 'script':
                return AGUrlFilter.RequestType.Script;
            case 'xmlhttprequest':
                return AGUrlFilter.RequestType.XmlHttpRequest;
            case 'websocket':
                return AGUrlFilter.RequestType.Websocket;
            default:
                return AGUrlFilter.RequestType.Other;
        }
    }
}
