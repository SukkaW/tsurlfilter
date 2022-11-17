import { CosmeticOption, RequestType } from '@adguard/tsurlfilter';

import { isHttpOrWsRequest } from '../../common/utils';
import { logger } from '../utils/logger';

import { CosmeticRules, engineApi } from './engine-api';
import { TsWebExtension } from './app';
import { declarativeFilteringLog } from './declarative-filtering-log';
import {
    CommonMessageType,
    ExtendedMV3MessageType,
    MessageMV3,
    messageMV3Validator,
    getCssPayloadValidator,
} from './messages';

export type MessagesHandlerType = (
    message: MessageMV3,
    sender: chrome.runtime.MessageSender,
) => Promise<unknown>;

/**
 * MessageApi knows how to handle {@link MessageMV3}.
 */
export default class MessagesApi {
    /**
     * Stores link to {@link TsWebExtension} app to save context.
     */
    private tsWebExtension: TsWebExtension;

    /**
     * Creates new {@link MessagesApi}.
     *
     * @param tsWebExtension Current {@link TsWebExtension} app.
     *
     * @returns New {@link MessagesApi} handler.
     */
    constructor(tsWebExtension: TsWebExtension) {
        this.tsWebExtension = tsWebExtension;
        this.handleMessage = this.handleMessage.bind(this);
    }

    /**
     * Handles message with {@link CommonMessageType}
     * or {@link ExtendedMV3MessageType}.
     *
     * @param message Message.
     * @param sender Sender of message.
     *
     * @returns Data according to the received message.
     */
    public async handleMessage(
        message: MessageMV3,
        sender: chrome.runtime.MessageSender,
    ): Promise<unknown> {
        logger.debug('[HANDLE MESSAGE]: ', message);

        try {
            message = messageMV3Validator.parse(message);
        } catch (e) {
            logger.error('Bad message', message);
            // Ignore this message
            return;
        }

        const { type } = message;
        switch (type) {
            case CommonMessageType.GET_CSS: {
                logger.debug('[HANDLE MESSAGE]: call getCss');

                const res = getCssPayloadValidator.safeParse(message.payload);
                if (!res.success) {
                    return;
                }

                let { url, referrer } = res.data;

                // https://github.com/AdguardTeam/AdguardBrowserExtension/issues/1498
                // When document url for iframe is about:blank then we use tab url
                if (!isHttpOrWsRequest(url) && sender.frameId !== 0 && sender.tab?.url) {
                    url = sender.tab.url;
                }

                return this.getCss(url, referrer);
            }
            case ExtendedMV3MessageType.GetCollectedLog: {
                return declarativeFilteringLog.getCollected();
            }
            default: {
                logger.error('Did not found handler for message');
            }
        }
    }

    /**
     * Builds css for specified url.
     *
     * @param requestUrl Url for which build css.
     * @param referrerUrl
     *
     * @returns Cosmetic css.
     */
    private getCss(requestUrl: string, referrerUrl: string): CosmeticRules | undefined {
        logger.debug('[GET CSS]: received call', requestUrl);

        if (this.tsWebExtension.isStarted) {
            const result = engineApi.matchRequest({
                requestUrl,
                frameUrl: referrerUrl,
                // Always RequestType.Document, because in MV3 we request CSS
                // for the already loaded page
                requestType: RequestType.Document,
                frameRule: engineApi.matchFrame(requestUrl),
            });

            const cosmeticOption = result?.getCosmeticOption();

            return engineApi.buildCosmeticCss(
                requestUrl,
                // FIXME: add MatchingResultgetCosmeticOption
                cosmeticOption || CosmeticOption.CosmeticOptionAll,
                false,
                false,
            );
        }
    }
}
