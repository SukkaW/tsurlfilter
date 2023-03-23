import browser from 'webextension-polyfill';
// Import directly from files to avoid side effects of tree shaking.
// If import from '../../common', entire tsurlfilter will be in the package.
import { MessageType, sendAppMessage } from '../../common/content-script';

/**
 * Initializes assistant object and create messages listener for assistant.
 */
export const initAssistant = (): void => {
    if (window.top !== window || !(document.documentElement instanceof HTMLElement)) {
        return;
    }

    browser.runtime.onMessage.addListener(async (message) => {
        switch (message.type) {
            case MessageType.InitAssistant: {
                // If there is no assistant on the window after execute
                // loading script - throw error.
                if (window.adguardAssistant === undefined) {
                    throw new Error('adguardAssistant not found in the window object.');
                } else {
                    window.adguardAssistant.close();
                }

                window.adguardAssistant.start(null, (rules) => {
                    sendAppMessage({
                        type: MessageType.AssistantCreateRule,
                        payload: { ruleText: rules },
                    });
                });
                break;
            }
            case MessageType.CloseAssistant: {
                if (window.adguardAssistant) {
                    window.adguardAssistant.close();
                }
                break;
            }
            default:
                break;
        }
    });
};
