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
import { ConfigurationResult, MessagesHandlerType } from "@adguard/tswebextension/mv3";
import { APIConfiguration } from "./schemas";
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
declare class TsWebExtensionWrapper {
    private tsWebExtension;
    private configurationResult;
    private waitForStart;
    filteringLogEnabled: boolean;
    private messageHandler;
    constructor();
    get ruleSetsCounters(): RuleSetCounters[];
    private messageHandlerWrapper;
    start(configuration: APIConfiguration): Promise<void>;
    stop(): Promise<void>;
    configure(configuration: APIConfiguration, skipCheck?: boolean): Promise<void>;
    static getDynamicRulesInfo({ dynamicRules }: ConfigurationResult): Promise<DynamicRulesStatus | null>;
    /**
     * If changed - save new values to store for show warning to user
     * and save list of last used filters
     * TODO: Check this
     *
     * @param configuration
     */
    private checkFiltersLimitsChange;
    private static setFiltersChangedList;
    private static getFiltersChangedList;
    private getConfiguration;
    /**
     * Returns tswebextension messages handler
     */
    getMessageHandler(): MessagesHandlerType;
}
export declare const adguardApi: TsWebExtensionWrapper;
export {};
