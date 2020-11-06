import dir from "./dir";
import fs from "fs";
import path from "path";
import rmdir from "rmdir";

//import { EventEmitter } from "events";
//import { type } from "os";
//import { from } from "rxjs";

export type Converter<T, R> = (input: T) => R;
export type SerializerFunction = <T>(obj: T) => string;
export type DeserializerFunction = <R>(t: string) => R;

export interface CacheItem {
    cacheUntil: number | undefined;
    data: string
}

export type CacheKey = string | number;

export interface CacheSet {
    [key: string]: CacheItem;
    [key: number]: CacheItem;
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
        const base = path.normalize(
            (options.base || (require.main ? path.dirname(require.main.filename) : undefined) || process.cwd()) + '/cache'
        );
        this.cacheDir = path.normalize(base + '/' + (options.name || 'cache'));
        this.cacheInfinitely = !(typeof options.duration === "number");
        this.cacheDuration = options.duration;
        this.ram = typeof options.memory == 'boolean' ? options.memory : true;
        this.persist = typeof options.persist == 'boolean' ? options.persist : true;

        if (this.persist && !this.exists(this.cacheDir))
            dir.sync(this.cacheDir);
    }

    private exists(dir: string): boolean {
        try {
            fs.accessSync(dir);
        } catch (err) {
            return false;
        }
        return true;
    }
    private safeCallback(callback: Function) {
        if (typeof callback === 'function') return callback
        else return () => null;
    }

    buildFilePath(name: CacheKey): string {
        return path.normalize(`${this.cacheDir}/${name}.json`);
    }

    buildCacheEntry(data: string): CacheItem {
        return {
            cacheUntil: !this.cacheInfinitely ? new Date().getTime() + this.cacheDuration : undefined,
            data: data
        };
    }

    put(name: CacheKey, data: any, callback: (...args:any[]) => void) {
        let entry = this.buildCacheEntry(data);

        if (this.persist)
            fs.writeFile(this.buildFilePath(name), this.serialize(entry), callback);

        if (this.ram) {
            entry.data = this.serialize(entry.data);

            this.memoryCache[name] = entry;

            if (!this.persist)
                return this.safeCallback(callback)(null);
        }
    }

    putSync(name: CacheKey, data: any) {
        let entry = this.buildCacheEntry(data);

        if (this.persist)
            fs.writeFileSync(this.buildFilePath(name), this.serialize(entry));

        if (this.ram) {
            this.memoryCache[name] = entry;
            this.memoryCache[name].data = this.serialize(this.memoryCache[name].data);
        }
    }

    readCacheFile(name: CacheKey) {

    }

    get(name: CacheKey, callback: (...args: any[]) => any): any {
        if (this.ram && !!this.memoryCache[name]) {
            var entry = this.memoryCache[name];

            if (!!entry.cacheUntil && new Date().getTime() > entry.cacheUntil) {
                return this.safeCallback(callback)(null, undefined);
            }

            return this.safeCallback(callback)(null, this.deserialize<CacheItem>(entry.data));
        }

        fs.readFile(this.buildFilePath(name), 'utf8', (err, content) => {
            if (err != null) {
                return this.safeCallback(callback)(null, undefined);
            }

            var entry = this.deserialize<CacheItem>(content);

            if (!!entry.cacheUntil && new Date().getTime() > entry.cacheUntil) {
                return this.safeCallback(callback)(null, undefined);
            }

            return this.safeCallback(callback)(null, entry.data);
        });
    }

    getSync(name: CacheKey) {
        if (this.ram && !!this.memoryCache[name]) {
            var entry = this.memoryCache[name];

            if (entry.cacheUntil && new Date().getTime() > entry.cacheUntil) {
                return undefined;
            }

            return this.deserialize(entry.data);
        }

        try {
            var data = this.deserialize<CacheItem>(fs.readFileSync(this.buildFilePath(name), 'utf8'));
        } catch (e) {
            return undefined;
        }

        if (data.cacheUntil && new Date().getTime() > data.cacheUntil)
            return undefined;

        return data.data;
    }

    deleteEntry(name: CacheKey, callback: (...args:any[]) => void) {
        if (this.ram) {
            delete this.memoryCache[name];

            if (!this.persist)
                this.safeCallback(callback)(null);
        }

        fs.unlink(this.buildFilePath(name), callback);
    }
    deleteEntrySync(name: CacheKey) {
        if (this.ram) {
            delete this.memoryCache[name];

            if (!this.persist)
                return;
        }

        fs.unlinkSync(this.buildFilePath(name));
    }

    unlink(callback: (...args: any[]) => void) {
        if (this.persist)
            return rmdir(this.cacheDir, this.safeCallback(callback));

        this.safeCallback(callback)(null);
    }

    transformFileNameToKey(fileName: string): string {
        return fileName.slice(0, -5);
    }

    keys(callback: Function) {
        callback = this.safeCallback(callback);

        if (this.ram && !this.persist)
            return callback(null, Object.keys(this.memoryCache));

        fs.readdir(this.cacheDir, (err, files) => {
            return !!err ? callback(err) : callback(err, files.map(this.transformFileNameToKey));
        });
    }

    keysSync() {
        if (this.ram && !this.persist)
            return Object.keys(this.memoryCache);

        return fs.readdirSync(this.cacheDir).map(this.transformFileNameToKey);
    }
}