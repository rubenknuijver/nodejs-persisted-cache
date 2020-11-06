import NodeCache from 'node-cache';

export default class CacheService {
  private cache: NodeCache;

  constructor(ttlSeconds: number) {
    this.cache = new NodeCache({ stdTTL: ttlSeconds, checkperiod: ttlSeconds * 0.2, useClones: false });
  }

  get<T>(key: NodeCache.Key, storeFunction: () => Promise<T>): Promise<T> {
    const value = this.cache.get<T>(key);
    if (value) {
      return Promise.resolve(value);
    }

    return storeFunction().then((result) => {
      this.cache.set(key, result);
      return result;
    });
  }

  del(keys: NodeCache.Key | NodeCache.Key[]): number {
    return this.cache.del(keys);
  }

  delStartWith(startStr: string = '') {
    if (!startStr) {
      return;
    }

    const keys = this.cache.keys();
    for (const key of keys) {
      if (key.indexOf(startStr) === 0) {
        this.del(key);
      }
    }
  }

  flush() {
    this.cache.flushAll();
  }
}

export { CacheService };
