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

import { APIConfiguration } from './schemas';

export {
    ConfigurationResult,
    RULE_SET_NAME_PREFIX,
    TooManyRulesError,
    TooManyRegexpRulesError,
};

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

export const FILTERS_PATH = 'filters/';
export const DECLARATIVE_RULE_SETS_PATH = 'filters/declarative/';
export const WEB_RESOURCES_PATH = '/adguard/resources';

export enum StaticFiltersLimits {
    MaxRulesLimit = 1,
    MaxRegexpsLimit,
    MaxFiltersLimit,
}

const {
    MAX_NUMBER_OF_REGEX_RULES,
    MAX_NUMBER_OF_DYNAMIC_AND_SESSION_RULES,
} = chrome.declarativeNetRequest;

interface AdguardApiInterface {
    onAssistantCreateRule: EventChannel<string>;
    start(configuration: APIConfiguration): Promise<APIConfiguration>;
    stop(): Promise<void>;
    configure(configuration: APIConfiguration): Promise<APIConfiguration>;
    openAssistant(tabId: number): Promise<void>;
    closeAssistant(tabId: number): Promise<void>;
    getRulesCount(): number;
    canEnableStaticFilter(filterId: number): StaticFiltersLimits | null;
}

/**
 * AdGuard API is filtering library, provided following features:
 * - request and content filtering, using {@link TsWebExtension},
 * - content blocking via AdGuard Assistant UI, provided by {@link TsWebExtension}.
 */
export default class AdguardApi implements AdguardApiInterface {
    /**
     * Engine instance.
     */
    private tsWebExtension: TsWebExtension;

    /**
     * Stores status of current enabled rules.
     */
    private configurationResult: ConfigurationResult | undefined;

    /**
     * Waiting for start engine to prevent race conditions.
     */
    private waitForStart: Promise<APIConfiguration> | undefined;

    /**
     * Stores handler for "inner" messages.
     */
    private messageHandler: MessagesHandlerType;

    /**
     * {@link TsWebExtension} {@link EventChannel},
     * which fires event on assistant rule creation.
     */
    public onAssistantCreateRule: EventChannel<string>;

    /**
     * Creates new AdGuard API class.
     *
     * @param filtersPath
     * @param ruleSetsPath
     * @param webAccessibleResourcesPath - Path to the web accessible resources.
     */
    constructor(
        filtersPath: string = FILTERS_PATH,
        ruleSetsPath: string = DECLARATIVE_RULE_SETS_PATH,
        webAccessibleResourcesPath: string = WEB_RESOURCES_PATH,
    ) {
        this.tsWebExtension = new TsWebExtension(
            filtersPath,
            ruleSetsPath,
            webAccessibleResourcesPath,
        );

        this.onAssistantCreateRule = this.tsWebExtension.onAssistantCreateRule;

        this.messageHandler = this.tsWebExtension.getMessageHandler();

        chrome.runtime.onMessage.addListener(this.messageHandlerWrapper);
    }

    /**
     * Returns status of the static sets of rules.
     *
     * @returns Status of the static sets of rules.
     */
    // public get staticRuleSetsStatus(): UpdateStaticFiltersResult | null {
    //     return this.configurationResult?.staticFiltersStatus || null;
    // }

    /**
     * Returns counters of current enabled static rule sets.
     *
     * @returns Counters of current enabled static rule sets.
     */
    public get staticRuleSetsCounters(): RuleSetCounters[] {
        return TsWebExtension.ruleSetsCounters;
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
    async start(configuration: APIConfiguration): Promise<APIConfiguration> {
        const start = async (): Promise<APIConfiguration> => {
            const config = await this.getConfiguration(configuration);
            this.configurationResult = await this.tsWebExtension.start(config);

            return this.checkExceedFiltersLimits(configuration);
        };

        this.waitForStart = start();

        return this.waitForStart;
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
    async configure(configuration: APIConfiguration, skipCheck?: boolean): Promise<APIConfiguration> {
        const config = await this.getConfiguration(configuration);
        this.configurationResult = await this.tsWebExtension.configure(config);

        if (skipCheck) {
            return configuration;
        }

        return this.checkExceedFiltersLimits(configuration);
    }

    /**
     * Returns information about dynamic rules from current configuration.
     *
     * @returns Object {@link DynamicRulesStatus} with counters of dynamic rules.
     */
    public get dynamicRulesInfo(): DynamicRulesStatus | null {
        if (!this.configurationResult) {
            return null;
        }

        const {
            dynamicRules: {
                ruleSets: [ruleset],
                limitations,
            },
        } = this.configurationResult;

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
     * If changed - save new values to store for show warning to user
     * and save list of last used filters.
     *
     * @param configuration {@link APIConfiguration}.
     * @returns Changed {@link APIConfiguration} if browser disabled some
     * static filters.
     */
    private async checkExceedFiltersLimits(configuration: APIConfiguration): Promise<APIConfiguration> {
        const wasEnabledIds = configuration.filters.sort((a: number, b: number) => a - b);
        const nowEnabledIds = (await chrome.declarativeNetRequest.getEnabledRulesets())
            .map((s) => Number.parseInt(s.slice(RULE_SET_NAME_PREFIX.length), 10))
            .sort((a: number, b: number) => a - b);

        const isConfigurationChanged = (): boolean => {
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

        if (isConfigurationChanged()) {
            const configWithCurrentFilters = { ...configuration, filters: nowEnabledIds };

            await this.configure(configWithCurrentFilters, true);

            return configWithCurrentFilters;
        }

        return configuration;
    }

    /**
     * Returns configuration object.
     *
     * @param configuration {@link APIConfiguration}.
     * @returns TsWebExtension configuration {@link TsWebExtensionConfiguration}.
     */
    // eslint-disable-next-line class-methods-use-this
    private getConfiguration = async (configuration: APIConfiguration): Promise<TsWebExtensionConfiguration> => {
        const { filters, rules, verbose } = configuration;

        return {
            settings: {
                allowlistEnabled: false,
                allowlistInverted: false,
                collectStats: true,
                stealthModeEnabled: false,
                filteringEnabled: true,
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
            filteringLogEnabled: false,
            staticFiltersIds: filters,
            trustedDomains: [],
            customFilters: [],
            allowlist: [],
            userrules: rules || [],
            verbose,
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

    /**
     *
     * @param filterId
     */
    private canEnableFilterRules(filterId: number): boolean {
        const filterToEnable = this.filters.find((f) => f.id === filterId);
        if (!filterToEnable) {
            return false;
        }

        const ruleSet = this.ruleSetsCounters.find((r) => r.filterId === filterToEnable.id);
        const declarativeRulesCounter = ruleSet?.rulesCount;
        if (declarativeRulesCounter === undefined) {
            return false;
        }

        return declarativeRulesCounter <= this.availableStaticRulesCount;
    }

    /**
     *
     * @param filterId
     */
    private canEnableFilterRegexps(filterId: number): boolean {
        const filterToEnable = this.filters
            .find((f) => f.id === filterId);
        if (!filterToEnable) {
            return false;
        }

        const ruleSet = this.ruleSetsCounters.find((r) => r.filterId === filterToEnable.id);
        const regexpRulesCounter = ruleSet?.regexpRulesCount;
        if (regexpRulesCounter === undefined) {
            return false;
        }

        return this.enabledStaticFiltersRegexps + regexpRulesCounter <= MAX_NUMBER_OF_REGEX_RULES;
    }

    /**
     *
     */
    private get isMaxEnabledFilters(): boolean {
        return this.enabledStaticFiltersCounter >= chrome.declarativeNetRequest.MAX_NUMBER_OF_ENABLED_STATIC_RULESETS;
    }

    /**
     * Checks whether a static filter can be enabled or not.
     *
     * @param filterId Static filter ID.
     * @returns One of the {@link StaticFiltersLimits} if the filter cannot be
     * enabled, or null if the restrictions will not be exceeded.
     */
    public canEnableStaticFilter(filterId: number): StaticFiltersLimits | null {
        if (!this.canEnableFilterRules(filterId)) {
            return StaticFiltersLimits.MaxRulesLimit;
        }
        if (!this.canEnableFilterRegexps(filterId)) {
            return StaticFiltersLimits.MaxRegexpsLimit;
        }
        if (this.isMaxEnabledFilters) {
            return StaticFiltersLimits.MaxFiltersLimit;
        }

        return null;
    }
}
