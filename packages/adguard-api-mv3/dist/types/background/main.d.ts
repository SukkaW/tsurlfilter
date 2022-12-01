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
import { ConfigurationResult, MessagesHandlerType } from '@adguard/tswebextension/mv3';
import { APIConfiguration } from './schemas';
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
export declare const WEB_RESOURCES_PATH = "/adguard/resources";
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
    private tsWebExtension;
    private configurationResult;
    private waitForStart;
    filteringLogEnabled: boolean;
    private messageHandler;
    /**
     * {@link TsWebExtension} {@link EventChannel},
     * which fires event on assistant rule creation.
     */
    onAssistantCreateRule: EventChannel<string>;
    /**
     * Creates new AdGuard API class.
     *
     * @param webAccessibleResourcesPath - Path to the web accessible resources.
     */
    constructor(webAccessibleResourcesPath?: string);
    /**
     * Returns counters of current enabled static rule sets.
     *
     * @returns Counters of current enabled static rule sets.
     */
    get ruleSetsCounters(): RuleSetCounters[];
    private messageHandlerWrapper;
    /**
     * Starts engine.
     *
     * @param configuration {@link APIConfiguration}.
     */
    start(configuration: APIConfiguration): Promise<void>;
    /**
     * Stops engine.
     */
    stop(): Promise<void>;
    /**
     * Modifies AdGuard {@link APIConfiguration}.
     *
     * @param configuration {@link APIConfiguration}.
     * @param skipCheck Whether it is necessary to check whether the limit
     * is exceeded.
     */
    configure(configuration: APIConfiguration, skipCheck?: boolean): Promise<void>;
    /**
     * Returns information about dynamic rules from current configuration.
     *
     * @param root0 {@link ConfigurationResult}.
     * @param root0.dynamicRules {@link ConversionResult}.
     * @returns Object {@link DynamicRulesStatus} with counters of dynamic rules.
     */
    static getDynamicRulesInfo({ dynamicRules }: ConfigurationResult): Promise<DynamicRulesStatus | null>;
    /**
     * TODO: Check this.
     * If changed - save new values to store for show warning to user
     * and save list of last used filters.
     *
     * @param configuration {@link APIConfiguration}.
     */
    private checkFiltersLimitsChange;
    private static setFiltersChangedList;
    private static getFiltersChangedList;
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
}
export {};
