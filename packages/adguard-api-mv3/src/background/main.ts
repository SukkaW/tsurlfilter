/**
 * @file
 * This file is part of Adguard API library (https://github.com/AdguardTeam/tsurlfilter/packages/adguard-api-mv3).
 *
 * Adguard API is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Adguard API is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Adguard API. If not, see <http://www.gnu.org/licenses/>.
 */

import { EventChannel } from '@adguard/tswebextension';
import {
    TsWebExtension,
    Configuration as TsWebExtensionConfiguration,
    ConfigurationResult,
    RULE_SET_NAME_PREFIX,
    TooManyRulesError,
    TooManyRegexpRulesError,
    MessagesHandlerType,
} from '@adguard/tswebextension/mv3';

import { FILTERS_CHANGED } from './constants';
import { APIConfiguration } from './schemas';
import { storage } from './storage';

export type RuleSetCounters = {
    filterId: number;
    rulesCount: number;
    regexpRulesCount: number;
};

export type DynamicRulesStatus = {
    rules: RulesStatus;
    regexpsRules: RulesStatus;
};

export type RulesStatus = {
    enabledCount: number;
    totalCount: number;
    maximumCount: number;
    limitExceed: boolean;
    excludedRulesIds: number[];
};

export const WEB_RESOURCES_PATH = '/adguard/resources';

const {
    MAX_NUMBER_OF_REGEX_RULES,
    MAX_NUMBER_OF_DYNAMIC_AND_SESSION_RULES,
} = chrome.declarativeNetRequest;

interface AdguardApiInterface {
    onAssistantCreateRule: EventChannel<string>;
    start(configuration: APIConfiguration): Promise<void>;
    stop(): Promise<void>;
    configure(configuration: APIConfiguration): Promise<void>;
    openAssistant(tabId: number): Promise<void>;
    closeAssistant(tabId: number): Promise<void>;
    getRulesCount(): number;
}

/**
 * AdGuard API is filtering library, provided following features:
 * - request and content filtering, using {@link TsWebExtension},
 * - content blocking via AdGuard Assistant UI, provided by {@link TsWebExtension}.
 */
export default class AdguardApi implements AdguardApiInterface {
    // Engine instance
    private tsWebExtension: TsWebExtension;

    // Stores result of last call configuration to get status of current enabled
    // rules
    private configurationResult: ConfigurationResult | undefined;

    // Waiting for start engine to prevent race conditions
    private waitForStart: Promise<void> | undefined;

    // Is declarative filtering log enabled or not
    public filteringLogEnabled = false;

    // Stores handler for "inner" messages
    private messageHandler: MessagesHandlerType;

    /**
     * {@link TsWebExtension} {@link EventChannel},
     * which fires event on assistant rule creation.
     */
    public onAssistantCreateRule: EventChannel<string>;

    /**
     * Creates new AdGuard API class.
     *
     * @param webAccessibleResourcesPath - Path to the web accessible resources.
     */
    constructor(webAccessibleResourcesPath = WEB_RESOURCES_PATH) {
        this.tsWebExtension = new TsWebExtension(webAccessibleResourcesPath);

        this.onAssistantCreateRule = this.tsWebExtension.onAssistantCreateRule;

        this.messageHandler = this.tsWebExtension.getMessageHandler();

        chrome.runtime.onMessage.addListener(this.messageHandlerWrapper);
    }

    /**
     * Returns counters of current enabled static rule sets.
     *
     * @returns Counters of current enabled static rule sets.
     */
    public get ruleSetsCounters(): RuleSetCounters[] {
        return (
            this.configurationResult?.staticFilters.map((ruleset) => ({
                filterId: Number(ruleset.getId().slice(RULE_SET_NAME_PREFIX.length)),
                rulesCount: ruleset.getRulesCount(),
                regexpRulesCount: ruleset.getRegexpRulesCount(),
            })) || []
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private messageHandlerWrapper = (message: any, sender: any, sendResponse: (response?: any) => void): boolean => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (async (): Promise<any> => {
            if (this.waitForStart) {
                await this.waitForStart;
            }

            // TODO: use MESSAGE_HANDLER_NAME
            if (message.handlerName === 'tsWebExtension') {
                return this.messageHandler(message, sender);
            }

            return null;
        })()
            .then(sendResponse)
            .catch((e) => {
                sendResponse({ error: { message: e.message } });
            });

        return true;
    };

    /**
     * Starts engine.
     *
     * @param configuration {@link APIConfiguration}.
     */
    async start(configuration: APIConfiguration): Promise<void> {
        const start = async (): Promise<void> => {
            const config = await this.getConfiguration(configuration);
            this.configurationResult = await this.tsWebExtension.start(config);
            await AdguardApi.getDynamicRulesInfo(this.configurationResult);

            await this.checkFiltersLimitsChange(configuration);
        };

        this.waitForStart = start();
        await this.waitForStart;
    }

    /**
     * Stops engine.
     */
    async stop(): Promise<void> {
        await this.tsWebExtension.stop();
    }

    /**
     * Modifies AdGuard {@link APIConfiguration}.
     *
     * @param configuration {@link APIConfiguration}.
     * @param skipCheck Whether it is necessary to check whether the limit
     * is exceeded.
     */
    async configure(configuration: APIConfiguration, skipCheck?: boolean): Promise<void> {
        const config = await this.getConfiguration(configuration);
        this.configurationResult = await this.tsWebExtension.configure(config);
        await AdguardApi.getDynamicRulesInfo(this.configurationResult);

        if (skipCheck) {
            return;
        }
        await this.checkFiltersLimitsChange(configuration);
    }

    /**
     * Returns information about dynamic rules from current configuration.
     *
     * @param root0 {@link ConfigurationResult}.
     * @param root0.dynamicRules {@link ConversionResult}.
     * @returns Object {@link DynamicRulesStatus} with counters of dynamic rules.
     */
    static async getDynamicRulesInfo({ dynamicRules }: ConfigurationResult): Promise<DynamicRulesStatus | null> {
        const {
            ruleSets: [ruleset],
            limitations,
        } = dynamicRules;

        if (!ruleset) {
            return null;
        }

        const declarativeRulesCount = ruleset.getRulesCount();
        const regexpsCount = ruleset.getRegexpRulesCount();

        const rulesLimitExceedErr = limitations.find((e) => e instanceof TooManyRulesError);
        const regexpRulesLimitExceedErr = limitations.find((e) => e instanceof TooManyRegexpRulesError);

        return {
            rules: {
                enabledCount: rulesLimitExceedErr?.numberOfMaximumRules || declarativeRulesCount,
                totalCount: declarativeRulesCount + (rulesLimitExceedErr?.numberOfExcludedDeclarativeRules || 0),
                maximumCount: rulesLimitExceedErr?.numberOfMaximumRules || MAX_NUMBER_OF_DYNAMIC_AND_SESSION_RULES,
                limitExceed: rulesLimitExceedErr !== undefined,
                excludedRulesIds: rulesLimitExceedErr?.excludedRulesIds || [],
            },
            regexpsRules: {
                enabledCount: regexpsCount + (regexpRulesLimitExceedErr?.excludedRulesIds.length || 0),
                totalCount: declarativeRulesCount + (regexpRulesLimitExceedErr?.numberOfExcludedDeclarativeRules || 0),
                maximumCount: regexpRulesLimitExceedErr?.numberOfMaximumRules || MAX_NUMBER_OF_REGEX_RULES,
                limitExceed: regexpRulesLimitExceedErr !== undefined,
                excludedRulesIds: regexpRulesLimitExceedErr?.excludedRulesIds || [],
            },
        };
    }

    /**
     * TODO: Check this.
     * If changed - save new values to store for show warning to user
     * and save list of last used filters.
     *
     * @param configuration {@link APIConfiguration}.
     */
    private async checkFiltersLimitsChange(configuration: APIConfiguration): Promise<void> {
        const wasEnabledIds = configuration.filters.sort((a: number, b: number) => a - b);
        const nowEnabledIds = (await chrome.declarativeNetRequest.getEnabledRulesets())
            .map((s) => Number.parseInt(s.slice(RULE_SET_NAME_PREFIX.length), 10))
            .sort((a: number, b: number) => a - b);

        const isDifferent = (): boolean => {
            if (wasEnabledIds.length !== nowEnabledIds.length) {
                return true;
            }

            for (let i = 0; i <= wasEnabledIds.length; i += 1) {
                if (nowEnabledIds[i] !== wasEnabledIds[i]) {
                    return true;
                }
            }

            return false;
        };

        const brokenState = isDifferent();

        // FIXME: If state has been broken - return new applied configuration
        if (brokenState) {
            // Save last used filters ids to show user
            await AdguardApi.setFiltersChangedList(wasEnabledIds);
            const configWithUpdatedFilters = { ...configuration, filters: nowEnabledIds };

            await this.configure(configWithUpdatedFilters, true);
            // If state is not broken - clear list of "broken" filters
        } else if ((await AdguardApi.getFiltersChangedList).length > 0) {
            await AdguardApi.setFiltersChangedList([]);
        }
    }

    private static setFiltersChangedList = async (ids: number[]): Promise<void> => {
        await storage.set(FILTERS_CHANGED, ids);
    };

    private static getFiltersChangedList = async (): Promise<number[]> => {
        const ids = await storage.get<number[]>(FILTERS_CHANGED);

        return ids || [];
    };

    /**
     * Returns configuration object.
     *
     * @param configuration {@link APIConfiguration}.
     * @returns TsWebExtension configuration {@link TsWebExtensionConfiguration}.
     */
    private getConfiguration = async (configuration: APIConfiguration): Promise<TsWebExtensionConfiguration> => {
        const { installType } = await chrome.management.getSelf();
        const isUnpacked = installType === 'development';

        return {
            settings: {
                allowlistEnabled: false,
                allowlistInverted: false,
                collectStats: true,
                stealthModeEnabled: false,
                filteringEnabled: false,
                stealth: {
                    blockChromeClientData: false,
                    hideReferrer: false,
                    hideSearchQueries: false,
                    sendDoNotTrack: false,
                    blockWebRTC: false,
                    selfDestructThirdPartyCookies: false,
                    selfDestructThirdPartyCookiesTime: 0,
                    selfDestructFirstPartyCookies: false,
                    selfDestructFirstPartyCookiesTime: 0,
                },
            },
            filteringLogEnabled: this.filteringLogEnabled,
            filtersPath: 'filters',
            ruleSetsPath: 'filters/declarative',
            staticFiltersIds: configuration.filters,
            trustedDomains: [],
            customFilters: [],
            allowlist: [],
            userrules: configuration.rules || [],
            verbose: isUnpacked,
        };
    };

    /**
     * Returns tswebextension messages handler.
     *
     * @returns Messages handler for "inner" tswebextension messages.
     */
    getMessageHandler(): MessagesHandlerType {
        return this.tsWebExtension.getMessageHandler();
    }

    /**
     * Opens the AdGuard assistant in the specified tab.
     *
     * @param tabId The ID of the tab where is needed to open
     * the AdGuard assistant.
     */
    public async openAssistant(tabId: number): Promise<void> {
        await this.tsWebExtension.openAssistant(tabId);
    }

    /**
     * Closes the AdGuard assistant in the specified tab.
     *
     * @param tabId The ID of the tab where is needed to close
     * the AdGuard assistant.
     */
    public async closeAssistant(tabId: number): Promise<void> {
        await this.tsWebExtension.closeAssistant(tabId);
    }

    /**
     * Gets current loaded rules in the filtering engine
     * (except declarative rules).
     *
     * @returns Number of loaded rules in the filtering engine.
     */
    public getRulesCount(): number {
        return this.tsWebExtension.getRulesCount();
    }

    /**
     * Creates new adguardApi instance.
     *
     * @returns AdguardApi instance.
     */
    public static create(): AdguardApi {
        return new AdguardApi();
    }
}
