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

import {
    TsWebExtension,
    Configuration,
    ConfigurationResult,
    RULE_SET_NAME_PREFIX,
    TooManyRulesError,
    TooManyRegexpRulesError,
    MessagesHandlerType,
} from "@adguard/tswebextension/mv3";
import { FILTERS_CHANGED } from "./constants";
import { APIConfiguration } from "./schemas";
import { storage } from "./storage";

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

// FIXME: remove prettier!!!
const { MAX_NUMBER_OF_REGEX_RULES, MAX_NUMBER_OF_DYNAMIC_AND_SESSION_RULES } = chrome.declarativeNetRequest;

const WEB_ACCESSIBLE_RESOURCES_PATH = "/web-accessible-resources/redirects";

class TsWebExtensionWrapper {
    private tsWebExtension: TsWebExtension;

    private configurationResult: ConfigurationResult | undefined;

    private waitForStart: Promise<void> | undefined;

    public filteringLogEnabled: boolean = false;

    private messageHandler: MessagesHandlerType;

    constructor() {
        this.tsWebExtension = new TsWebExtension(WEB_ACCESSIBLE_RESOURCES_PATH);

        this.messageHandler = this.tsWebExtension.getMessageHandler();

        chrome.runtime.onMessage.addListener(this.messageHandlerWrapper);
    }

    public get ruleSetsCounters(): RuleSetCounters[] {
        return (
            this.configurationResult?.staticFilters.map((ruleset) => ({
                filterId: Number(ruleset.getId().slice(RULE_SET_NAME_PREFIX.length)),
                rulesCount: ruleset.getRulesCount(),
                regexpRulesCount: ruleset.getRegexpRulesCount(),
            })) || []
        );
    }

    // FIXME: Add reinitialization with read last provided config values from memory
    private messageHandlerWrapper = (message: any, sender: any, sendResponse: (response?: any) => void): boolean => {
        (async (): Promise<any> => {
            if (this.waitForStart) {
                await this.waitForStart;
            }

            // logger.debug("[messageHandlerWrapper]: handle message", message);

            // TODO: use MESSAGE_HANDLER_NAME
            if (message.handlerName === "tsWebExtension") {
                return this.messageHandler(message, sender);
            }

            return null;
        })()
            .then(sendResponse)
            .catch((e: any) => {
                sendResponse({ error: { message: e.message } });
            });

        return true;
    };

    async start(configuration: APIConfiguration): Promise<void> {
        const start = async (): Promise<void> => {
            const config = await this.getConfiguration(configuration);
            this.configurationResult = await this.tsWebExtension.start(config);
            await TsWebExtensionWrapper.getDynamicRulesInfo(this.configurationResult);

            await this.checkFiltersLimitsChange(configuration);
        };

        this.waitForStart = start();
        await this.waitForStart;
    }

    async stop(): Promise<void> {
        await this.tsWebExtension.stop();
    }

    async configure(configuration: APIConfiguration, skipCheck?: boolean): Promise<void> {
        const config = await this.getConfiguration(configuration);
        this.configurationResult = await this.tsWebExtension.configure(config);
        await TsWebExtensionWrapper.getDynamicRulesInfo(this.configurationResult);

        if (skipCheck) {
            return;
        }
        await this.checkFiltersLimitsChange(configuration);
    }

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
     * If changed - save new values to store for show warning to user
     * and save list of last used filters
     * TODO: Check this
     *
     * @param configuration
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

        // await browserActions.setIconBroken(brokenState);

        if (brokenState) {
            // Save last used filters ids to show user
            await TsWebExtensionWrapper.setFiltersChangedList(wasEnabledIds);
            const configWithUpdatedFilters = { ...configuration, filters: nowEnabledIds };

            await this.configure(configWithUpdatedFilters, true);
            // If state is not broken - clear list of "broken" filters
        } else if ((await TsWebExtensionWrapper.getFiltersChangedList).length > 0) {
            await TsWebExtensionWrapper.setFiltersChangedList([]);
        }
    }

    private static setFiltersChangedList = async (ids: number[]): Promise<void> => {
        await storage.set(FILTERS_CHANGED, ids);
    };

    private static getFiltersChangedList = async (): Promise<number[]> => {
        const ids = await storage.get<number[]>(FILTERS_CHANGED);

        return ids || [];
    };

    private getConfiguration = async (configuration: APIConfiguration): Promise<Configuration> => {
        const { installType } = await chrome.management.getSelf();
        const isUnpacked = installType === "development";

        return {
            settings: {
                allowlistEnabled: false,
                allowlistInverted: false,
                collectStats: true,
                stealthModeEnabled: false,
                filteringEnabled: false,
                // TODO: check fields needed in the mv3
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
            filtersPath: "filters",
            ruleSetsPath: "filters/declarative",
            staticFiltersIds: configuration.filters,
            trustedDomains: [],
            customFilters: [],
            allowlist: [],
            userrules: configuration.rules || [],
            verbose: isUnpacked,
        };
    };

    /**
     * Returns tswebextension messages handler
     */
    getMessageHandler(): MessagesHandlerType {
        return this.tsWebExtension.getMessageHandler();
    }
}

export const adguardApi = new TsWebExtensionWrapper();
