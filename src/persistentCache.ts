import * as _dir_ from './dir';
import _fs_ from 'fs';
import _path_ from 'path';
import _rmdir_ from 'rmdir';

export type Converter<T, R> = (input: T) => R;
export type SerializerFunction = <T>(obj: T) => string;
export type DeserializerFunction = <R>(t: string) => R;

export interface CacheItem {
  cacheUntil: number | undefined;
  data: string;
}

export type CacheKey = string | number;

export interface CacheSet {
  [key: string]: CacheItem;
  [key: number]: CacheItem;
}

function exists(path: string): boolean {
  try {
    _fs_.accessSync(path);
  } catch (err) {
    return false;
  }
  return true;
}

function safeCallback(callback: (...args: any[]) => any | void) {
  if (typeof callback === 'function') return callback;
  else return () => null;
}

export default class PersistentCache {
  memoryCache: CacheSet = {};
  ram: boolean;
  cacheDir: string;
  cacheInfinitely: boolean;
  cacheDuration: number;
  persist: boolean;

  serialize: SerializerFunction = JSON.stringify;
  deserialize: DeserializerFunction = JSON.parse;

  constructor(options: any = {}) {
    const base = _path_.normalize(
      (options.base || (require.main ? _path_.dirname(require.main.filename) : undefined) || process.cwd()) + '/cache',
    );
    this.cacheDir = _path_.normalize(base + '/' + (options.name || 'cache'));
    this.cacheInfinitely = !(typeof options.duration === 'number');
    this.cacheDuration = options.duration;
    this.ram = typeof options.memory === 'boolean' ? options.memory : true;
    this.persist = typeof options.persist === 'boolean' ? options.persist : true;

    if (this.persist && !exists(this.cacheDir)) _dir_.sync(this.cacheDir);
  }

  buildFilePath(name: CacheKey): string {
    return _path_.normalize(`${this.cacheDir}/${name}.json`);
  }

  buildCacheEntry(data: string): CacheItem {
    return {
      cacheUntil: !this.cacheInfinitely ? new Date().getTime() + this.cacheDuration : undefined,
      data,
    };
  }

  put(name: CacheKey, data: any, callback: (...args: any[]) => void) {
    const entry = this.buildCacheEntry(data);

    if (this.persist) _fs_.writeFile(this.buildFilePath(name), this.serialize(entry), callback);

    if (this.ram) {
      entry.data = this.serialize(entry.data);

      this.memoryCache[name] = entry;

      if (!this.persist) return safeCallback(callback)(null);
    }
  }

  putSync(name: CacheKey, data: any) {
    const entry = this.buildCacheEntry(data);

    if (this.persist) _fs_.writeFileSync(this.buildFilePath(name), this.serialize(entry));

    if (this.ram) {
      this.memoryCache[name] = entry;
      this.memoryCache[name].data = this.serialize(this.memoryCache[name].data);
    }
  }

  readCacheFile(name: CacheKey) { return; }

  get(name: CacheKey, callback: (...args: any[]) => any): any {
    if (this.ram && !!this.memoryCache[name]) {
      const entry = this.memoryCache[name];

      if (!!entry.cacheUntil && new Date().getTime() > entry.cacheUntil) {
        return safeCallback(callback)(null, undefined);
      }

      return safeCallback(callback)(null, this.deserialize<CacheItem>(entry.data));
    }

    _fs_.readFile(this.buildFilePath(name), 'utf8', (err, content) => {
      if (err != null) {
        return safeCallback(callback)(null, undefined);
      }

      const entry = this.deserialize<CacheItem>(content);

      if (!!entry.cacheUntil && new Date().getTime() > entry.cacheUntil) {
        return safeCallback(callback)(null, undefined);
      }

      return safeCallback(callback)(null, entry.data);
    });
  }

  getSync(name: CacheKey) {
    if (this.ram && !!this.memoryCache[name]) {
      const entry = this.memoryCache[name];

      if (entry.cacheUntil && new Date().getTime() > entry.cacheUntil) {
        return undefined;
      }

      return this.deserialize(entry.data);
    }

    try {
      const data = this.deserialize<CacheItem>(_fs_.readFileSync(this.buildFilePath(name), 'utf8'));
      return (data.cacheUntil && new Date().getTime() > data.cacheUntil)
        ? undefined
        : data.data;
    } catch (e) {
      return undefined;
    }
  }

  deleteEntry(name: CacheKey, callback: (...args: any[]) => void) {
    if (this.ram) {
      delete this.memoryCache[name];

      if (!this.persist) safeCallback(callback)(null);
    }

    _fs_.unlink(this.buildFilePath(name), callback);
  }
  deleteEntrySync(name: CacheKey) {
    if (this.ram) {
      delete this.memoryCache[name];

      if (!this.persist) return;
    }

    _fs_.unlinkSync(this.buildFilePath(name));
  }

  unlink(callback: (...args: any[]) => void) {
    if (this.persist) return _rmdir_(this.cacheDir, safeCallback(callback));

    safeCallback(callback)(null);
  }

  transformFileNameToKey(fileName: string): string {
    return fileName.slice(0, -5);
  }

  keys(callback: (...args: any[]) => any) {
    callback = safeCallback(callback);

    if (this.ram && !this.persist) return callback(null, Object.keys(this.memoryCache));

    _fs_.readdir(this.cacheDir, (err, files) => {
      return !!err ? callback(err) : callback(err, files.map(this.transformFileNameToKey));
    });
  }

  keysSync() {
    if (this.ram && !this.persist) return Object.keys(this.memoryCache);

    return _fs_.readdirSync(this.cacheDir).map(this.transformFileNameToKey);
  }
}
