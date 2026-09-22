import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

@Injectable()
export class MarketDataCacheService {
  private readonly logger = new Logger(MarketDataCacheService.name);
  private readonly cache = new Map<string, CacheEntry<any>>();

  /**
   * Get cached data or fetch fresh data with caching.
   * @param key Cache key (e.g., "crypto:price:BTC", "equity:price:AAPL")
   * @param fetcher Function to fetch fresh data if cache miss/stale
   * @param ttl Time-to-live in milliseconds (default: 60 seconds)
   * @returns Cached or fresh data
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 60000,
  ): Promise<T> {
    const entry = this.cache.get(key);
    const now = Date.now();

    // Return cached data if still valid
    if (entry && now - entry.timestamp < entry.ttl) {
      this.logger.debug(`Cache hit for key: ${key}`);
      return entry.data;
    }

    // Cache miss or stale - fetch fresh data
    this.logger.debug(`Cache miss for key: ${key}, fetching fresh data`);
    const data = await fetcher();

    // Cache the fresh data
    this.cache.set(key, { data, timestamp: now, ttl });

    // Clean up expired entries periodically (simple cleanup on miss)
    this.cleanup();

    return data;
  }

  /**
   * Clear cache for a specific key or all keys.
   * @param key Optional specific key to clear. If not provided, clears all cache.
   */
  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
      this.logger.debug(`Cleared cache for key: ${key}`);
    } else {
      this.cache.clear();
      this.logger.debug('Cleared all cache');
    }
  }

  /**
   * Clean up expired cache entries.
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    if (keysToDelete.length > 0) {
      this.logger.debug(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Get cache statistics for debugging.
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
