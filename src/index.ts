import * as dir from './dir';
import PersistentCache from './persistentCache';
import CacheService from './cacheService';
import PersistentCacheService from './persistentCacheService';

const ttlHour = 60 * 60;
const ttlDay = ttlHour * 24;

export default CacheService;
export { dir, PersistentCache, CacheService, PersistentCacheService, ttlHour, ttlDay };
