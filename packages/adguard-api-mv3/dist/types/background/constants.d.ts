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
export declare const FILTERS_INFO_STORAGE_KEY = "filters_info";
export declare const USER_RULES_STATUS_STORAGE_KEY = "user_rules_status";
export declare const ENABLED_FILTERS_IDS = "enabled_filters_ids";
export declare const FILTERS_CHANGED = "filters_changed";
export declare enum FiltersGroupId {
    CUSTOM = 0,
    MAIN = 1,
    LANGUAGES = 2
}
export interface Rules {
    id: number;
    rules: string;
}
export interface FilterInfo {
    id: number;
    title: string;
    enabled: boolean;
    description?: string;
    groupId: FiltersGroupId;
    url?: string;
    localeCodes?: string[];
}
export declare enum RulesetType {
    RULESET_1 = "ruleset_1",
    RULESET_2 = "ruleset_2",
    RULESET_3 = "ruleset_3",
    RULESET_4 = "ruleset_4",
    RULESET_6 = "ruleset_6",
    RULESET_7 = "ruleset_7",
    RULESET_8 = "ruleset_8",
    RULESET_9 = "ruleset_9",
    RULESET_13 = "ruleset_13",
    RULESET_14 = "ruleset_14",
    RULESET_16 = "ruleset_16",
    RULESET_224 = "ruleset_224"
}
export declare const FILTER_RULESET: {
    ruleset_1: {
        id: number;
        enabled: boolean;
    };
    ruleset_2: {
        id: number;
        enabled: boolean;
    };
    ruleset_3: {
        id: number;
        enabled: boolean;
    };
    ruleset_4: {
        id: number;
        enabled: boolean;
    };
    ruleset_6: {
        id: number;
        enabled: boolean;
    };
    ruleset_7: {
        id: number;
        enabled: boolean;
    };
    ruleset_8: {
        id: number;
        enabled: boolean;
    };
    ruleset_9: {
        id: number;
        enabled: boolean;
    };
    ruleset_13: {
        id: number;
        enabled: boolean;
    };
    ruleset_14: {
        id: number;
        enabled: boolean;
    };
    ruleset_16: {
        id: number;
        enabled: boolean;
    };
    ruleset_224: {
        id: number;
        enabled: boolean;
    };
};
