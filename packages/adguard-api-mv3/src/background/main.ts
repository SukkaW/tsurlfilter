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
} from "@adguard/tswebextension/mv3";

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

// TODO: remove prettier!!!
const { MAX_NUMBER_OF_REGEX_RULES, MAX_NUMBER_OF_DYNAMIC_AND_SESSION_RULES, MAX_NUMBER_OF_ENABLED_STATIC_RULESETS } =
    chrome.declarativeNetRequest;

const WEB_ACCESSIBLE_RESOURCES_PATH = "/web-accessible-resources/redirects";

class TsWebExtensionWrapper {
    private tsWebExtension: TsWebExtension;

    private configurationResult: ConfigurationResult | undefined;

    public filteringLogEnabled: boolean = false;

    constructor() {
        this.tsWebExtension = new TsWebExtension(WEB_ACCESSIBLE_RESOURCES_PATH);
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

    async start(): Promise<void> {
        const config = await this.getConfiguration();
        this.configurationResult = await this.tsWebExtension.start(config);
        const dynamicRulesStatus = await TsWebExtensionWrapper.getDynamicRulesInfo(this.configurationResult);

        await this.checkFiltersLimitsChange();
    }

    async stop(): Promise<void> {
        await this.tsWebExtension.stop();
    }

    async configure(skipCheck?: boolean): Promise<void> {
        const config = await this.getConfiguration();
        this.configurationResult = await this.tsWebExtension.configure(config);
        const dynamicRulesStatus = await TsWebExtensionWrapper.getDynamicRulesInfo(this.configurationResult);

        if (skipCheck) {
            return;
        }
        await this.checkFiltersLimitsChange();
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
     */
    private async checkFiltersLimitsChange(): Promise<void> {
        const wasEnabledIds = filters
            .getFiltersInfo()
            .filter(({ groupId, enabled }) => enabled && groupId !== FiltersGroupId.CUSTOM)
            .map(({ id }) => id)
            .sort((a: number, b: number) => a - b);
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

        await browserActions.setIconBroken(brokenState);

        if (brokenState) {
            // Save last used filters ids to show user
            await settings.setFiltersChangedList(wasEnabledIds);
            await filters.setEnabledFiltersIds(nowEnabledIds);

            await this.configure(true);
            // If state is not broken - clear list of "broken" filters
        } else if (settings.getSetting<number[]>(SETTINGS_NAMES.FILTERS_CHANGED).length > 0) {
            await settings.setFiltersChangedList([]);
        }
    }

    private getConfiguration = async (): Promise<Configuration> => {
        const filtersInfo = filters.getFiltersInfo();
        const staticFiltersIds = filters.getEnableFiltersIds().filter((id) => {
            const filterInfo = filtersInfo.find((f) => f.id === id);
            return filterInfo && filterInfo.groupId !== FiltersGroupId.CUSTOM;
        });
        const customFilters = filters.getEnabledCustomFiltersRules().map((r) => ({
            filterId: r.id,
            content: r.rules,
        }));

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
            staticFiltersIds,
            trustedDomains: [],
            customFilters,
            allowlist: [],
            // TODO: maybe getRules should return array instead of string
            userrules: (await userRules.getRules()).split("\n").filter((rule) => rule),
            verbose: isUnpacked,
        };
    };

    /**
     * Returns tswebextension messages handler
     */
    getMessageHandler() {
        return this.tsWebExtension.getMessageHandler();
    }

    /**
     * Finds and enables filters for current browser locales
     */
    enableCurrentLanguagesFilters = async () => {
        // Cannot check rule sets counters
        if (!this.configurationResult) {
            return;
        }

        const navigatorLocales = navigator.languages.map((locale) => locale.replace("-", "_"));
        const locales = new Set(navigatorLocales);
        const localeFilters = DEFAULT_FILTERS.filter((f) => f.localeCodes?.some((code) => locales.has(code))).map((f) =>
            filters.getFiltersInfo().find(({ id }) => id === f.id)
        );

        // A loop is needed to step through the asynchronous filter enable operation,
        // because each filter enable changes the constraints of the rules.
        for (let i = 0; i < localeFilters.length; i += 1) {
            const localeFilterInMemory = localeFilters[i];
            if (!localeFilterInMemory || localeFilterInMemory.enabled) {
                return;
            }

            const { id, localeCodes } = localeFilterInMemory;
            const ruleSet = this.configurationResult.staticFilters.find((r) => {
                // TODO: Seems like weak relation, not too reliably
                return r.getId() === `${RULE_SET_NAME_PREFIX}${id}`;
            });
            const declarativeRulesCounter = ruleSet?.getRulesCount();

            // eslint-disable-next-line no-await-in-loop
            const availableStaticRulesCount = await chrome.declarativeNetRequest.getAvailableStaticRuleCount();
            const enabledStaticFiltersCount = filters
                .getFiltersInfo()
                .filter((f) => f.enabled && f.groupId !== FiltersGroupId.CUSTOM).length;

            if (
                declarativeRulesCounter !== undefined &&
                declarativeRulesCounter < availableStaticRulesCount &&
                enabledStaticFiltersCount < MAX_NUMBER_OF_ENABLED_STATIC_RULESETS
            ) {
                log.debug(`Trying enable locale filter with id ${id} for locales: ${localeCodes}`);
                // eslint-disable-next-line no-await-in-loop
                await filters.enableFilter(id);
                // eslint-disable-next-line no-await-in-loop
                await this.configure();
            } else {
                log.debug(`Cannot enable locale filter with id ${id} for locales: ${localeCodes}`);
            }
        }
    };
}

export const adguardApi = new TsWebExtensionWrapper();
