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

export const FILTERS_INFO_STORAGE_KEY = 'filters_info';
export const USER_RULES_STATUS_STORAGE_KEY = 'user_rules_status';
export const ENABLED_FILTERS_IDS = 'enabled_filters_ids';

export enum FiltersGroupId {
    CUSTOM = 0,
    MAIN = 1,
    LANGUAGES = 2,
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

// FIXME: Check these types
export enum RulesetType {
    RULESET_1 = 'ruleset_1',
    RULESET_2 = 'ruleset_2',
    RULESET_3 = 'ruleset_3',
    RULESET_4 = 'ruleset_4',
    RULESET_6 = 'ruleset_6',
    RULESET_7 = 'ruleset_7',
    RULESET_8 = 'ruleset_8',
    RULESET_9 = 'ruleset_9',
    RULESET_13 = 'ruleset_13',
    RULESET_14 = 'ruleset_14',
    RULESET_16 = 'ruleset_16',
    RULESET_224 = 'ruleset_224',
}

// FIXME: Check these types
export const FILTER_RULESET = {
    [RulesetType.RULESET_1]: { id: 1, enabled: false },
    [RulesetType.RULESET_2]: { id: 2, enabled: true },
    [RulesetType.RULESET_3]: { id: 3, enabled: false },
    [RulesetType.RULESET_4]: { id: 4, enabled: false },
    [RulesetType.RULESET_6]: { id: 6, enabled: false },
    [RulesetType.RULESET_7]: { id: 7, enabled: false },
    [RulesetType.RULESET_8]: { id: 8, enabled: false },
    [RulesetType.RULESET_9]: { id: 9, enabled: false },
    [RulesetType.RULESET_13]: { id: 13, enabled: false },
    [RulesetType.RULESET_14]: { id: 14, enabled: false },
    [RulesetType.RULESET_16]: { id: 16, enabled: false },
    [RulesetType.RULESET_224]: { id: 224, enabled: false },
};
