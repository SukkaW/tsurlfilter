/* eslint-disable max-classes-per-file */
class CacheEntry {
    public key: number;

    public value: number[];

    constructor(key: number, value: number[]) {
        this.key = key;
        this.value = value;
    }
}

export class HashMap {
    private readonly capacity: number;

    private readonly buckets: Array<CacheEntry[]>;

    public depth: number;

    constructor(capacity: number) {
        this.buckets = new Array<CacheEntry[]>();
        this.capacity = capacity;
        this.depth = 0;
    }

    public getAll(keys: number[]): number[] | undefined {
        const values: number[] = [];

        for (let i = 0; i < keys.length; i += 1) {
            const value = this.get(keys[i]);
            if (value) {
                values.push(...value);
            }
        }

        return values;

        // const idxs: number[] = [];
        // for (let i = 0; i < keys.length; i += 1) {
        //     const idx = keys[i] % this.capacity;
        //     if (this.buckets[idx] && idxs.indexOf(idx) === -1) {
        //         idxs.push(idx);
        //     }
        // }

        // if (idxs.length === 0) {
        //     return undefined;
        // }

        // const values: number[] = [];

        // for (let i = 0; i < idxs.length; i += 1) {
        //     const idx = idxs[i];
        //     const entries = this.buckets[idx];
        //     for (let j = 0; j < entries.length; j += 1) {
        //         const entry = entries[j];
        //         values.push(...entry.value);

        //         // if (entry.key === key) {
        //         //     return entry.value;
        //         // }
        //     }
        // }

        // return values;
    }

    public get(key: number): number[] | undefined {
        const idx = key % this.capacity;
        const entries = this.buckets[idx];
        if (!entries) {
            return undefined;
        }

        for (let i = 0; i < entries.length; i += 1) {
            const entry = entries[i];

            if (entry.key === key) {
                return entry.value;
            }
        }

        return undefined;
    }

    public set(key: number, value: number[]): void {
        const idx = key % this.capacity;
        let entries = this.buckets[idx];

        if (!entries) {
            entries = new Array<CacheEntry>();
            this.buckets[idx] = entries;
        }

        for (let i = 0; i < entries.length; i += 1) {
            const entry = entries[i];

            if (entry.key === key) {
                entry.value = value;

                return;
            }
        }

        entries.push(new CacheEntry(key, value));
        if (entries.length > this.depth) {
            this.depth = entries.length;
        }
    }
}
