import browser, { Runtime } from 'webextension-polyfill';
import { RequestType } from '@adguard/tsurlfilter';

import { requestBlockingApi } from './request';
import {
    getExtendedCssPayloadValidator,
    Message,
    MessageType,
    messageValidator,
    processShouldCollapsePayloadValidator,
} from '../common';
import { tabsApi } from './tabs';
import { engineApi } from './engine-api';
import { cosmeticApi } from './cosmetic-api';

export interface MessagesApiInterface {
    start: () => void;
    stop: () => void;
    sendMessage: (tabId: number, message: unknown) => void;
}
// TODO: add long live connection
export class MessagesApi {

    constructor() {
        this.handleMessage = this.handleMessage.bind(this);
    }

    public start(): void {
        browser.runtime.onMessage.addListener(this.handleMessage);
    }

    public stop(): void {
        browser.runtime.onMessage.removeListener(this.handleMessage);
    }

    public sendMessage(tabId: number, message: unknown) {
        browser.tabs.sendMessage(tabId, message);
    }

    private async handleMessage(message: Message, sender: Runtime.MessageSender) {
        try {
            message = messageValidator.parse(message);
        } catch (e) {
            // ignore
            return;
        }

        const { type } = message;

        switch (type) {
            case MessageType.PROCESS_SHOULD_COLLAPSE: {
                return this.handleProcessShouldCollapseMessage(
                    sender, 
                    message.payload,
                );
            }
            case MessageType.GET_EXTENDED_CSS: {
                return this.handleGetExtendedCssMessage(
                    sender,
                    message.payload,
                )
            }
            default:
                return;
        }
    }

    private handleProcessShouldCollapseMessage(
        sender: Runtime.MessageSender,
        payload?: unknown,
    ) {
        if (!payload || !sender?.tab?.id) {
            return false;
        }

        const res = processShouldCollapsePayloadValidator.safeParse(payload);

        if (!res.success){
            return false;
        }

        const tabId = sender.tab.id;

        const { elementUrl, documentUrl, requestType } = res.data;

        return requestBlockingApi.processShouldCollapse(tabId, elementUrl, documentUrl, requestType);
    }

    private handleGetExtendedCssMessage(
        sender: Runtime.MessageSender,
        payload?: unknown,
    ) {
        if (!payload || !sender?.tab?.id) {
            return false;
        }

        const res = getExtendedCssPayloadValidator.safeParse(payload);

        if (!res.success){
            return false;
        }

        const tabId = sender.tab.id;

        const { documentUrl } = res.data;

        //TODO: replace to separate function

        const matchingResult = engineApi.matchRequest({
            requestUrl: documentUrl,
            frameUrl: documentUrl,
            requestType: RequestType.Document,
            frameRule: tabsApi.getTabFrameRule(tabId),
        });

        if(!matchingResult){
            return
        }

        const cosmeticOption = matchingResult.getCosmeticOption();

        const cosmeticResult = engineApi.getCosmeticResult(documentUrl, cosmeticOption);
        const extCssText = cosmeticApi.getExtCssText(cosmeticResult);

        return extCssText;
    }
}

export const messagesApi = new MessagesApi();
