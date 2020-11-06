import NodeCache from 'node-cache';
import PersistentCache from './persistentCache';

export default class PersistentCacheService {
    private cache: PersistentCache;

    constructor(ttlSeconds?: number | undefined, name?: string) {
        this.cache = new PersistentCache({
            duration: !!ttlSeconds ? 1000 * ttlSeconds : undefined,
            name,
        });
    }

    get<T>(key: NodeCache.Key, storeFunction: () => Promise<T>): Promise<T> {
        const value = this.cache.getSync(key) as T;
        if (value) {
            return Promise.resolve(value);
        }

        return storeFunction().then((result) => {
            this.cache.putSync(key, result);
            return result;
        });
    }

    del(key: NodeCache.Key) {
        this.cache.deleteEntrySync(key);
    }

    delStartWith(startStr: string = '') {
        if (!startStr) {
            return;
        }

        const keys = this.cache.keysSync();
        for (const key of keys) {
            if (key.indexOf(startStr) === 0) {
                this.del(key);
            }
        }
    }

    all() {
        const keys = this.cache.keysSync();
        return keys.map((k) => this.cache.getSync(k));
    }

    flush() {
        return;
    }
}
export { PersistentCacheService };