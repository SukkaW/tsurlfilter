import browser from 'webextension-polyfill';

/**
 * If referrer of request contains full url of extension,
 * then this request is considered as extension's own request
 * (e.g. request for filter downloading)
 * https://github.com/AdguardTeam/AdguardBrowserExtension/issues/1437
 */
export const isOwnUrl = (referrerUrl: string): boolean => {
    return referrerUrl.indexOf(browser.runtime.getURL('')) === 0;
};

export const isHttpOrWsRequest = (url: string): boolean => {
    return !!url && (url.indexOf('http') === 0 || url.indexOf('ws') === 0);
};

export const getDomain = (url: string): string | undefined => {
    let firstIdx = url.indexOf('//');

    if (firstIdx === -1) {
        /**
         * It's non hierarchical structured URL (e.g. stun: or turn:)
         * https://tools.ietf.org/html/rfc4395#section-2.2
         * https://tools.ietf.org/html/draft-nandakumar-rtcweb-stun-uri-08#appendix-B
         */
        firstIdx = url.indexOf(':');

        if (firstIdx === -1) {
            return;
        }
        
        firstIdx -= 1;
    }

    const nextSlashIdx = url.indexOf('/', firstIdx + 2);
    const startParamsIdx = url.indexOf('?', firstIdx + 2);

    const lastIdx = startParamsIdx < nextSlashIdx ? startParamsIdx : nextSlashIdx;

    return lastIdx !== -1 ? url.slice(0, lastIdx) : url;
};