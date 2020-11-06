import dir from "./dir";
import PersistentCache from "./persistentCache";
import { CacheService, PersistentCacheService } from "./cacheService";

const ttlHour = 60 * 60;
const ttlDay = ttlHour * 24;

export default CacheService;
export {
    dir,
    PersistentCache,
    CacheService,
    PersistentCacheService,
    ttlHour,
    ttlDay
}