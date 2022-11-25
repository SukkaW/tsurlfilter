/**
 * @file
 * This file is part of Adguard API library (https://github.com/AdguardTeam/tsurlfilter/packages/adguard-api).
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

import { FilterInfo, FiltersGroupId, FILTER_RULESET, RulesetType } from "./constants";

// FIXME: Check description
export const DEFAULT_FILTERS: FilterInfo[] = [
    {
        id: FILTER_RULESET[RulesetType.RULESET_1].id,
        enabled: FILTER_RULESET[RulesetType.RULESET_1].enabled,
        title: "Russian",
        description: "Filter that enables ad blocking on websites in the Russian language.",
        groupId: FiltersGroupId.LANGUAGES,
        localeCodes: ["ru", "ru_RU"],
    },
    {
        id: FILTER_RULESET[RulesetType.RULESET_2].id,
        enabled: FILTER_RULESET[RulesetType.RULESET_2].enabled,
        title: "options_block_ads_option",
        groupId: FiltersGroupId.MAIN,
    },
    {
        id: FILTER_RULESET[RulesetType.RULESET_14].id,
        enabled: FILTER_RULESET[RulesetType.RULESET_14].enabled,
        title: "options_block_annoyances_option",
        description: "options_block_annoyances_option_desc",
        groupId: FiltersGroupId.MAIN,
    },
    {
        id: FILTER_RULESET[RulesetType.RULESET_3].id,
        enabled: FILTER_RULESET[RulesetType.RULESET_3].enabled,
        title: "options_block_trackers_option",
        description: "options_block_trackers_option_desc",
        groupId: FiltersGroupId.MAIN,
    },
    {
        id: FILTER_RULESET[RulesetType.RULESET_4].id,
        enabled: FILTER_RULESET[RulesetType.RULESET_4].enabled,
        title: "options_block_social_widgets_option",
        description: "options_block_social_widgets_option_desc",
        groupId: FiltersGroupId.MAIN,
    },
    {
        id: FILTER_RULESET[RulesetType.RULESET_6].id,
        enabled: FILTER_RULESET[RulesetType.RULESET_6].enabled,
        title: "German",
        description:
            "EasyList Germany + AdGuard German filter. Filter list that specifically removes ads on websites in the German language.",
        groupId: FiltersGroupId.LANGUAGES,
        localeCodes: ["de", "de_DE"],
    },
    {
        id: FILTER_RULESET[RulesetType.RULESET_7].id,
        enabled: FILTER_RULESET[RulesetType.RULESET_7].enabled,
        title: "Japanese",
        description: "Filter that enables ad blocking on websites in the Japanese language.",
        groupId: FiltersGroupId.LANGUAGES,
        localeCodes: ["ja", "ja_JP"],
    },
    {
        id: FILTER_RULESET[RulesetType.RULESET_8].id,
        enabled: FILTER_RULESET[RulesetType.RULESET_8].enabled,
        title: "Dutch",
        description:
            "EasyList Dutch + AdGuard Dutch filter. Filter list that specifically removes ads on websites in the Dutch language.",
        groupId: FiltersGroupId.LANGUAGES,
        localeCodes: ["nl", "nl_NL"],
    },
    {
        id: FILTER_RULESET[RulesetType.RULESET_9].id,
        enabled: FILTER_RULESET[RulesetType.RULESET_9].enabled,
        title: "Spanish/Portuguese",
        description: "Filter list that specifically removes ads on websites in the Spanish and Portuguese languages.",
        groupId: FiltersGroupId.LANGUAGES,
        localeCodes: ["es", "es_ES", "pt_PT", "pt"],
    },
    {
        id: FILTER_RULESET[RulesetType.RULESET_13].id,
        enabled: FILTER_RULESET[RulesetType.RULESET_13].enabled,
        title: "Turkish",
        description: "Filter list that specifically removes ads on websites in the Turkish language.",
        groupId: FiltersGroupId.LANGUAGES,
        localeCodes: ["tr", "tr_TR"],
    },
    {
        id: FILTER_RULESET[RulesetType.RULESET_16].id,
        enabled: FILTER_RULESET[RulesetType.RULESET_16].enabled,
        title: "French",
        description:
            "Liste FR + AdGuard French filter. Filter list that specifically removes ads on websites in the French language.",
        groupId: FiltersGroupId.LANGUAGES,
        localeCodes: ["fr", "fr_FR"],
    },
    {
        id: FILTER_RULESET[RulesetType.RULESET_224].id,
        enabled: FILTER_RULESET[RulesetType.RULESET_224].enabled,
        title: "Chinese",
        // eslint-disable-next-line max-len
        description:
            "EasyList China + AdGuard Chinese filter. Filter list that specifically removes ads on websites in Chinese language.",
        groupId: FiltersGroupId.LANGUAGES,
        localeCodes: ["zh", "zh_CN"],
    },
];
