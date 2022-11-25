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

class Storage {
    private storage;

    constructor(storage: chrome.storage.LocalStorageArea) {
        this.storage = storage;
    }

    get = <T>(key: string): Promise<T | undefined> => {
        return new Promise((resolve, reject) => {
            this.storage.get([key], (result: { [x: string]: T }) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                }
                resolve(result[key]);
            });
        });
    };

    set = (key: string, value: any): Promise<void> => {
        return new Promise((resolve, reject) => {
            this.storage.set({ [key]: value }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                }
                resolve();
            });
        });
    };

    remove = (key: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            this.storage.remove(key, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                }
                resolve();
            });
        });
    };
}

export const storage = new Storage(chrome.storage.local);
