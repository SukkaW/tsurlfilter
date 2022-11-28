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

import zod from 'zod';

import { ADGUARD_FILTERS_IDS } from '../../../../scripts/update-filters';

/**
 * {@link AdguardApi} Configuration runtime validator.
 */
export const configurationValidator = zod.object({
    /**
     * An array of filters identifiers.
     *
     * FIXME: Describe limitations
     * You can look for possible filters identifiers in the filters metadata file.
     */
    filters: zod.number().array().refine((arr) => {
        arr.every((id) => ADGUARD_FILTERS_IDS.includes(id));
    }),

    /**
     * An array of custom filtering rules.
     *
     * These custom rules might be created by a user via AdGuard Assistant UI.
     *
     * @see https://adguard.com/en/filterrules.html
     */
    rules: zod.string().array().optional(),
});

export type APIConfiguration = zod.infer<typeof configurationValidator>;
