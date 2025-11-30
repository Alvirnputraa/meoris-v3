/**
 * Home Page Cache Utility
 * Handles caching of homepage data in localStorage with version control
 */

interface CacheData {
  pageItems: any[];
  latest: any[];
  timestamp: number;
  version: string;
}

const CACHE_KEY = 'meoris_home_cache';
const CACHE_VERSION = '1.0.0';
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

/**
 * Get cached data from localStorage
 */
export function getHomeCache(): CacheData | null {
  try {
    if (typeof window === 'undefined') return null;

    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CacheData = JSON.parse(cached);

    // Check version
    if (data.version !== CACHE_VERSION) {
      clearHomeCache();
      return null;
    }

    // Check if cache is still valid
    const now = Date.now();
    if (now - data.timestamp > CACHE_DURATION) {
      clearHomeCache();
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error reading home cache:', error);
    clearHomeCache();
    return null;
  }
}

/**
 * Save data to cache
 */
export function setHomeCache(pageItems: any[], latest: any[]): void {
  try {
    if (typeof window === 'undefined') return;

    const cacheData: CacheData = {
      pageItems,
      latest,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error saving home cache:', error);
  }
}

/**
 * Clear the cache
 */
export function clearHomeCache(): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Error clearing home cache:', error);
  }
}

/**
 * Check if cache exists and is valid
 */
export function hasCacheData(): boolean {
  return getHomeCache() !== null;
}

/**
 * Get last update timestamp
 */
export function getLastUpdateTime(): number | null {
  const cache = getHomeCache();
  return cache ? cache.timestamp : null;
}
