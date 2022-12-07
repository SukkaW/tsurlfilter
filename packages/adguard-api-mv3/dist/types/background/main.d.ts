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
import { ConfigurationResult as TsWebExtensionConfigurationResult, RULE_SET_NAME_PREFIX, TooManyRulesError, TooManyRegexpRulesError, MessagesHandlerType } from '@adguard/tswebextension/mv3';
import { APIConfiguration } from './schemas';
export { RULE_SET_NAME_PREFIX, TooManyRulesError, TooManyRegexpRulesError, };
export declare type RuleSetCounters = {
    filterId: number;
    rulesCount: number;
    regexpRulesCount: number;
};
export declare type DynamicRulesStatus = {
    rules: RulesStatus;
    regexpsRules: RulesStatus;
};
export declare type RulesStatus = {
    enabledCount: number;
    totalCount: number;
    maximumCount: number;
    limitExceed: boolean;
    excludedRulesIds: number[];
};
export declare type ConfigurationResult = TsWebExtensionConfigurationResult & {
    dynamicRules: {
        status: DynamicRulesStatus | null;
    };
};
export declare const FILTERS_PATH = "filters/";
export declare const DECLARATIVE_RULE_SETS_PATH = "filters/declarative/";
export declare const WEB_RESOURCES_PATH = "/adguard/resources";
export declare enum StaticFiltersLimits {
    MaxRulesLimit = 1,
    MaxRegexpsLimit = 2,
    MaxFiltersLimit = 3
}
interface AdguardApiInterface {
    onAssistantCreateRule: EventChannel<string>;
    start(configuration: APIConfiguration): Promise<ConfigurationResult>;
    stop(): Promise<void>;
    configure(configuration: APIConfiguration): Promise<ConfigurationResult>;
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
    private tsWebExtension;
    /**
     * Stores status of current enabled rules.
     */
    private configurationResult;
    /**
     * Waiting for start engine to prevent race conditions.
     */
    private waitForStart;
    /**
     * Stores handler for "inner" messages.
     */
    private messageHandler;
    /**
     * {@link TsWebExtension} {@link EventChannel},
     * which fires event on assistant rule creation.
     */
    onAssistantCreateRule: EventChannel<string>;
    /**
     * Stores current available rules counter.
     */
    private availableStaticRulesCount;
    /**
     * Stores amount of current enabled static filters.
     */
    private enabledStaticFiltersCounter;
    /**
     * Stores amount of current enabled rules with regular expressions.
     */
    private enabledStaticFiltersRegexps;
    /**
     * Creates new AdGuard API class.
     *
     * @param filtersPath Path to directory with filters' text rules.
     * @param ruleSetsPath Path to directory with converted rule sets.
     * @param webAccessibleResourcesPath - Path to the web accessible resources.
     */
    constructor(filtersPath?: string, ruleSetsPath?: string, webAccessibleResourcesPath?: string);
    /**
     * Returns counters of current enabled static rule sets.
     *
     * @returns Counters of current enabled static rule sets.
     */
    static get staticRuleSetsCounters(): RuleSetCounters[];
    private messageHandlerWrapper;
    /**
     * Starts engine.
     *
     * @param configuration {@link APIConfiguration}.
     */
    start(configuration: APIConfiguration): Promise<ConfigurationResult>;
    /**
     * Stops engine.
     */
    stop(): Promise<void>;
    /**
     * Modifies AdGuard {@link APIConfiguration}.
     *
     * @param configuration {@link APIConfiguration}.
     */
    configure(configuration: APIConfiguration): Promise<ConfigurationResult>;
    /**
     *
     * @param configurationResult
     */
    private updateCounters;
    /**
     * Returns information about dynamic rules from current configuration.
     *
     * @param configurationResult
     * @returns Object {@link DynamicRulesStatus} with counters of dynamic rules.
     */
    private getDynamicRulesStatus;
    /**
     * Returns configuration object.
     *
     * @param configuration {@link APIConfiguration}.
     * @returns TsWebExtension configuration {@link TsWebExtensionConfiguration}.
     */
    private getConfiguration;
    /**
     * Returns tswebextension messages handler.
     *
     * @returns Messages handler for "inner" tswebextension messages.
     */
    getMessageHandler(): MessagesHandlerType;
    /**
     * Opens the AdGuard assistant in the specified tab.
     *
     * @param tabId The ID of the tab where is needed to open
     * the AdGuard assistant.
     */
    openAssistant(tabId: number): Promise<void>;
    /**
     * Closes the AdGuard assistant in the specified tab.
     *
     * @param tabId The ID of the tab where is needed to close
     * the AdGuard assistant.
     */
    closeAssistant(tabId: number): Promise<void>;
    /**
     * Gets current loaded rules in the filtering engine
     * (except declarative rules).
     *
     * @returns Number of loaded rules in the filtering engine.
     */
    getRulesCount(): number;
    /**
     * Creates new adguardApi instance.
     *
     * @returns AdguardApi instance.
     */
    static create(): AdguardApi;
    /**
     *
     * @param filterId
     */
    private canEnableFilterRules;
    /**
     *
     * @param filterId
     */
    private canEnableFilterRegexps;
    /**
     *
     */
    private get isMaxEnabledFilters();
    /**
     * Checks whether a static filter can be enabled or not.
     *
     * @param filterId Static filter ID.
     * @returns One of the {@link StaticFiltersLimits} if the filter cannot be
     * enabled, or null if the restrictions will not be exceeded.
     */
    canEnableStaticFilter(filterId: number): StaticFiltersLimits | null;
}
