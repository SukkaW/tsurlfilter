import { z as zod } from 'zod';

import { configurationValidator } from '../../common';

export const configurationMV3Validator = configurationValidator.extend({
    /**
     * List of static filters ids.
     * The content for these filters will be loaded by the tswebextension
     * from the "filtersPath" provided when needed.
     */
    staticFiltersIds: zod.number().array(),

    /**
     * List of custom filters that can be added/edited/deleted by the user.
     */
    customFilters: zod.object({
        filterId: zod.number(),
        content: zod.string(),
    }).array(),

    /**
     * Enables filtering log if true.
     */
    filteringLogEnabled: zod.boolean(),
});

export type ConfigurationMV3 = zod.infer<typeof configurationMV3Validator>;

export type ConfigurationMV3Context =
    & Omit<ConfigurationMV3, 'customFilters' | 'allowlist' | 'userrules' | 'trustedDomains'>
    & { customFilters: number[] };
