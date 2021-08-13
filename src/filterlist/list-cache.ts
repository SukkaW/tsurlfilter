import { IRule } from '../rules/rule';

export class ListCache {
    /**
     * cache with the rules which were retrieved.
     */
    private readonly cache: Map<number, IRule>;

    constructor() {
        this.cache = new Map();
    }

    public get(key: number): IRule | undefined {
        return this.cache.get(key);
    }

    public set(key: number, rule: IRule): void {
        this.cache.set(key, rule);
    }
}
