import { RedisCache } from './redis-cache';
import { MemoryCache } from './memory-cache';

export interface CacheInterface {
  get<T = any>(key: string): Promise<T | null>;
  set(key: string, value: any, ttl?: number): Promise<boolean>;
  del(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  ttl(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  setNX(key: string, value: any, ttl?: number): Promise<boolean>;
  mget<T = any>(keys: string[]): Promise<(T | null)[]>;
  mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<boolean>;
  deleteByPattern(pattern: string): Promise<number>;
  flushall(): Promise<boolean>;
  info(): Promise<string>;
  ping(): Promise<boolean>;
  disconnect(): Promise<void>;
}

export class CacheManager implements CacheInterface {
  private primaryCache: CacheInterface;
  private fallbackCache: CacheInterface;
  private useRedis: boolean;

  constructor() {
    this.fallbackCache = new MemoryCache();
    this.useRedis = !!process.env.REDIS_URL;
    
    if (this.useRedis) {
      this.primaryCache = new RedisCache();
      console.log('Cache: Using Redis with memory fallback');
    } else {
      this.primaryCache = this.fallbackCache;
      console.log('Cache: Using memory cache only');
    }
  }

  /**
   * Get value with automatic fallback
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const result = await this.primaryCache.get<T>(key);
      return result;
    } catch (error) {
      console.warn(`Primary cache failed for key ${key}, trying fallback:`, error);
      
      if (this.useRedis) {
        return await this.fallbackCache.get<T>(key);
      }
      
      return null;
    }
  }

  /**
   * Set value with automatic fallback
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const success = await this.primaryCache.set(key, value, ttl);
      
      // Also set in fallback cache if using Redis
      if (this.useRedis) {
        await this.fallbackCache.set(key, value, ttl).catch(() => {
          // Ignore fallback errors
        });
      }
      
      return success;
    } catch (error) {
      console.warn(`Primary cache set failed for key ${key}:`, error);
      
      if (this.useRedis) {
        return await this.fallbackCache.set(key, value, ttl);
      }
      
      return false;
    }
  }

  /**
   * Delete value from both caches
   */
  async del(key: string): Promise<boolean> {
    let success = false;
    
    try {
      success = await this.primaryCache.del(key);
    } catch (error) {
      console.warn(`Primary cache delete failed for key ${key}:`, error);
    }
    
    if (this.useRedis) {
      try {
        await this.fallbackCache.del(key);
      } catch (error) {
        // Ignore fallback errors
      }
    }
    
    return success;
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      return await this.primaryCache.exists(key);
    } catch (error) {
      console.warn(`Primary cache exists check failed for key ${key}:`, error);
      
      if (this.useRedis) {
        return await this.fallbackCache.exists(key);
      }
      
      return false;
    }
  }

  /**
   * Get TTL for key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.primaryCache.ttl(key);
    } catch (error) {
      console.warn(`Primary cache TTL check failed for key ${key}:`, error);
      
      if (this.useRedis) {
        return await this.fallbackCache.ttl(key);
      }
      
      return -1;
    }
  }

  /**
   * Increment numeric value
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.primaryCache.incr(key);
    } catch (error) {
      console.warn(`Primary cache increment failed for key ${key}:`, error);
      
      if (this.useRedis) {
        return await this.fallbackCache.incr(key);
      }
      
      return 0;
    }
  }

  /**
   * Set if not exists
   */
  async setNX(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      return await this.primaryCache.setNX(key, value, ttl);
    } catch (error) {
      console.warn(`Primary cache setNX failed for key ${key}:`, error);
      
      if (this.useRedis) {
        return await this.fallbackCache.setNX(key, value, ttl);
      }
      
      return false;
    }
  }

  /**
   * Get multiple keys
   */
  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    try {
      return await this.primaryCache.mget<T>(keys);
    } catch (error) {
      console.warn(`Primary cache mget failed for keys ${keys.join(', ')}:`, error);
      
      if (this.useRedis) {
        return await this.fallbackCache.mget<T>(keys);
      }
      
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple keys
   */
  async mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<boolean> {
    try {
      const success = await this.primaryCache.mset(keyValuePairs, ttl);
      
      // Also set in fallback cache if using Redis
      if (this.useRedis) {
        await this.fallbackCache.mset(keyValuePairs, ttl).catch(() => {
          // Ignore fallback errors
        });
      }
      
      return success;
    } catch (error) {
      console.warn(`Primary cache mset failed:`, error);
      
      if (this.useRedis) {
        return await this.fallbackCache.mset(keyValuePairs, ttl);
      }
      
      return false;
    }
  }

  /**
   * Delete keys by pattern
   */
  async deleteByPattern(pattern: string): Promise<number> {
    let count = 0;
    
    try {
      count = await this.primaryCache.deleteByPattern(pattern);
    } catch (error) {
      console.warn(`Primary cache deleteByPattern failed for pattern ${pattern}:`, error);
    }
    
    if (this.useRedis) {
      try {
        await this.fallbackCache.deleteByPattern(pattern);
      } catch (error) {
        // Ignore fallback errors
      }
    }
    
    return count;
  }

  /**
   * Flush all keys
   */
  async flushall(): Promise<boolean> {
    let success = false;
    
    try {
      success = await this.primaryCache.flushall();
    } catch (error) {
      console.warn(`Primary cache flush failed:`, error);
    }
    
    if (this.useRedis) {
      try {
        await this.fallbackCache.flushall();
      } catch (error) {
        // Ignore fallback errors
      }
    }
    
    return success;
  }

  /**
   * Get cache info
   */
  async info(): Promise<string> {
    try {
      return await this.primaryCache.info();
    } catch (error) {
      console.warn(`Primary cache info failed:`, error);
      
      if (this.useRedis) {
        return await this.fallbackCache.info();
      }
      
      return 'Cache info unavailable';
    }
  }

  /**
   * Health check
   */
  async ping(): Promise<boolean> {
    try {
      return await this.primaryCache.ping();
    } catch (error) {
      console.warn(`Primary cache ping failed:`, error);
      
      if (this.useRedis) {
        return await this.fallbackCache.ping();
      }
      
      return false;
    }
  }

  /**
   * Disconnect from cache
   */
  async disconnect(): Promise<void> {
    try {
      await this.primaryCache.disconnect();
    } catch (error) {
      console.warn('Primary cache disconnect failed:', error);
    }
    
    if (this.useRedis) {
      try {
        await this.fallbackCache.disconnect();
      } catch (error) {
        // Ignore fallback errors
      }
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    type: string;
    healthy: boolean;
    info: string;
  }> {
    const healthy = await this.ping();
    const info = await this.info();
    
    return {
      type: this.useRedis ? 'Redis with Memory Fallback' : 'Memory Only',
      healthy,
      info
    };
  }

  /**
   * Warm up cache with initial data
   */
  async warmup(data: Record<string, { value: any; ttl?: number }>): Promise<void> {
    console.log('Warming up cache...');
    
    for (const [key, { value, ttl }] of Object.entries(data)) {
      try {
        await this.set(key, value, ttl);
      } catch (error) {
        console.warn(`Cache warmup failed for key ${key}:`, error);
      }
    }
    
    console.log(`Cache warmed up with ${Object.keys(data).length} entries`);
  }
}

// Singleton instance
let cacheManager: CacheManager | null = null;

export function getCacheManager(): CacheManager {
  if (!cacheManager) {
    cacheManager = new CacheManager();
  }
  return cacheManager;
}