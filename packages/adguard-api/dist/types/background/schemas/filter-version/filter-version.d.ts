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
import zod from "zod";
/**
 * Runtime validator for persistent filter version data
 */
export declare const filterVersionDataValidator: zod.ZodObject<{
    version: zod.ZodString;
    lastCheckTime: zod.ZodNumber;
    lastUpdateTime: zod.ZodNumber;
    expires: zod.ZodNumber;
}, "strip", zod.ZodTypeAny, {
    expires: number;
    version: string;
    lastCheckTime: number;
    lastUpdateTime: number;
}, {
    expires: number;
    version: string;
    lastCheckTime: number;
    lastUpdateTime: number;
}>;
export declare type FilterVersionData = zod.infer<typeof filterVersionDataValidator>;
/**
 * Runtime validator for persistent key value storage of filter version data.
 *
 * Key is filter metadata id.
 * Value is {@link FilterVersionData}.
 */
export declare const filterVersionStorageDataValidator: zod.ZodRecord<zod.ZodEffects<zod.ZodNumber, number, unknown>, zod.ZodObject<{
    version: zod.ZodString;
    lastCheckTime: zod.ZodNumber;
    lastUpdateTime: zod.ZodNumber;
    expires: zod.ZodNumber;
}, "strip", zod.ZodTypeAny, {
    expires: number;
    version: string;
    lastCheckTime: number;
    lastUpdateTime: number;
}, {
    expires: number;
    version: string;
    lastCheckTime: number;
    lastUpdateTime: number;
}>>;
export declare type FilterVersionStorageData = zod.infer<typeof filterVersionStorageDataValidator>;
