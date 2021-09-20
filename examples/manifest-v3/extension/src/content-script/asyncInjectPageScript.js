/* eslint-disable no-undef */
/* script executes in 'isolated world' context
 * https://developer.chrome.com/docs/extensions/mv3/content_scripts/#isolated_world
 *
 * We can manage page DOM from this function, but cannot share variables directly
 *
 * 'eval' call or injecting script tag with inline source in this context cause CSP error,
 *  but we can load script from web_accessible_resources and execute script string there
 *
 * document.dispatchEvent with custom event is used for transferring the payload to the page script
 */
export function asyncInjectPageScript(payload) {
    const script = document.createElement('script');

    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', chrome.runtime.getURL('page-script.js'));

    script.onload = () => {
        /*
         * Using document.dispatchEvent instead window.postMessage by security reason
         * https://github.com/w3c/webextensions/issues/78#issuecomment-915272953
         */
        document.dispatchEvent(new CustomEvent('runPayload', {
            detail: payload,
        }));

        document.head.removeChild(script);
    };

    document.head.appendChild(script);
}
