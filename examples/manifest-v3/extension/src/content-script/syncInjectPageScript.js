/* eslint-disable no-undef */
/* script executes in 'isolated world' context
 * https://developer.chrome.com/docs/extensions/mv3/content_scripts/#isolated_world
 *
 * We can manage page DOM from this function, but cannot share variables directly
 *
 * 'eval' call or injecting script tag with inline source in this context cause CSP error,
 *  but we can load script from web_accessible_resources and execute script string there
 *
 * Payload is transferring by hidden div data-attribute
 */
export function syncInjectPageScript(payload) {
    const script = document.createElement('script');

    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', chrome.runtime.getURL('page-script.js'));
    script.setAttribute('id', 'page-script');
    script.setAttribute('data-payload', payload);

    script.onload = () => {
        document.head.removeChild(script);
    };

    document.head.appendChild(script);
}
