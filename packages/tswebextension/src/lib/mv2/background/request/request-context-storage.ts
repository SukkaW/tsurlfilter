import type { WebRequest } from 'webextension-polyfill';
import type { CosmeticResult, MatchingResult, HTTPMethod } from '@adguard/tsurlfilter';

import type { ContentType } from '../../../common';
import type ParsedCookie from '../services/cookie-filtering/parsed-cookie';
import type { TabFrameRequestContext } from '../tabs/tabs-api';

export const enum RequestContextState {
    BeforeRequest = 'beforeRequest',
    BeforeSendHeaders = 'beforeSendHeaders',
    SendHeaders = 'sendHeaders',
    HeadersReceived = 'headersReceived',
    AuthRequired = 'authRequired',
    BeforeRedirect = 'beforeRedirect',
    ResponseStarted = 'responseStarted',
    Completed = 'completed',
    Error = 'error',
}

/**
 * Request context data.
 */
export type RequestContext = TabFrameRequestContext & {
    state: RequestContextState;
    timestamp: number; // record time in ms
    referrerUrl: string;
    contentType: ContentType;
    requestFrameId: number;
    thirdParty: boolean;
    method: HTTPMethod;

    requestHeaders?: WebRequest.HttpHeaders;
    responseHeaders?: WebRequest.HttpHeaders;
    statusCode?: number;
    cookies?: ParsedCookie[];
    contentTypeHeader?: string;

    /**
     * Filtering data from {@link EngineApi.matchRequest}.
     */
    matchingResult?: MatchingResult | null;

    /**
     * Filtering data from {@link EngineApi.getCosmeticResult}.
     */
    cosmeticResult?: CosmeticResult
};

/**
 * Implementation of the request context storage.
 */
export class RequestContextStorage extends Map<string, RequestContext> {
    /**
     * Update request context fields. Can be done partially.
     *
     * @param requestId Request id.
     * @param data Partial request context.
     * @returns Updated request context.
     */
    public update(requestId: string, data: Partial<RequestContext>): RequestContext | undefined {
        const requestContext = super.get(requestId);

        if (requestContext) {
            Object.assign(requestContext, data);
            return requestContext;
        }

        // TODO: Throws error if request context not found after RequestEvents refactoring.
        super.set(requestId, data as RequestContext);
        return undefined;
    }
}

export const requestContextStorage = new RequestContextStorage();
