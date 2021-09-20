/* eslint-disable no-undef */
/* script executes in 'isolated world' context
 * https://developer.chrome.com/docs/extensions/mv3/content_scripts/#isolated_world
 *
 * We can manage page DOM from this function, but cannot share variables directly
 *
 * 'eval' call or injecting script tag with inline source in this context cause CSP error,
 *  but we can load script from web_accessible_resources and execute script string there
 *
 * Payload is transferring by hiden div data-attribute
 */
export function syncInjectPageScript(payload) {
    const div = document.createElement('div');

    div.setAttribute('hidden', true);
    div.setAttribute('id', 'page-script-payload');
    div.setAttribute('data-page-script-payload', payload);

    const script = document.createElement('script');

    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', chrome.runtime.getURL('page-script.js'));

    script.onload = () => {
        document.head.removeChild(script);
    };

    document.body.appendChild(div);
    document.head.appendChild(script);
}
