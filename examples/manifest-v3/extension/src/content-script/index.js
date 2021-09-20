/* eslint-disable no-undef */
import { applyExtendedCss } from './applyExtendedCss';
// import { asyncInjectPageScript } from './asyncInjectPageScript';
import { syncInjectPageScript } from './syncInjectPageScript';

function handleMessage({ type, payload }) {
    switch (type) {
        case 'injectPageScript':
            // asyncInjectPageScript(payload);
            syncInjectPageScript(payload);
            break;
        case 'applyExtendedCss':
            applyExtendedCss(payload);
            break;
        default:
            // do nothing
    }
}

chrome.runtime.onMessage.addListener(handleMessage);
