/**
 * In-memory cache implementation for development and fallback
 */
export class MemoryCache {
  private cache: Map<string, { value: any; expiry: number }>;
  private defaultTTL = 3600 * 1000; // 1 hour in milliseconds
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cache = new Map();
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Get a value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  /**
   * Set a value in cache with optional TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    const expirationTime = Date.now() + (ttl ? ttl * 1000 : this.defaultTTL);
    
    this.cache.set(key, {
      value,
      expiry: expirationTime
    });
    
    return true;
  }

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  /**
   * Check if a key exists and is not expired
   */
  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get TTL for a key in seconds
   */
  async ttl(key: string): Promise<number> {
    const item = this.cache.get(key);
    
    if (!item) {
      return -2; // Key doesn't exist
    }

    const remaining = item.expiry - Date.now();
    
    if (remaining <= 0) {
      this.cache.delete(key);
      return -2; // Key expired
    }

    return Math.floor(remaining / 1000); // Return in seconds
  }

  /**
   * Increment a numeric value
   */
  async incr(key: string): Promise<number> {
    const current = await this.get<number>(key);
    const newValue = (current || 0) + 1;
    await this.set(key, newValue);
    return newValue;
  }

  /**
   * Set with expiration only if key doesn't exist
   */
  async setNX(key: string, value: any, ttl?: number): Promise<boolean> {
    if (await this.exists(key)) {
      return false;
    }
    
    return await this.set(key, value, ttl);
  }

  /**
   * Get multiple keys at once
   */
  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    const results: (T | null)[] = [];
    
    for (const key of keys) {
      results.push(await this.get<T>(key));
    }
    
    return results;
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<boolean> {
    try {
      for (const [key, value] of Object.entries(keyValuePairs)) {
        await this.set(key, value, ttl);
      }
      return true;
    } catch (error) {
      console.error('Memory cache mset error:', error);
      return false;
    }
  }

  /**
   * Delete keys by pattern (simple pattern matching with wildcards)
   */
  async deleteByPattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let deletedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  /**
   * Flush all keys
   */
  async flushall(): Promise<boolean> {
    this.cache.clear();
    return true;
  }

  /**
   * Get cache statistics
   */
  async info(): Promise<string> {
    const stats = {
      keys: this.cache.size,
      memoryUsage: this.getMemoryUsage(),
      expiredKeys: this.getExpiredKeysCount()
    };
    
    return `keys:${stats.keys},memory:${stats.memoryUsage}KB,expired:${stats.expiredKeys}`;
  }

  /**
   * Health check
   */
  async ping(): Promise<boolean> {
    return true;
  }

  /**
   * Close/cleanup
   */
  async disconnect(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
    
    if (keysToDelete.length > 0) {
      console.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Estimate memory usage in KB
   */
  private getMemoryUsage(): number {
    let size = 0;
    
    for (const [key, item] of this.cache.entries()) {
      size += key.length * 2; // Approximate character size
      size += JSON.stringify(item.value).length * 2;
      size += 16; // Approximate overhead for expiry timestamp
    }
    
    return Math.round(size / 1024);
  }

  /**
   * Count expired keys (without removing them)
   */
  private getExpiredKeysCount(): number {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const item of this.cache.values()) {
      if (now > item.expiry) {
        expiredCount++;
      }
    }
    
    return expiredCount;
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys (for debugging)
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Singleton instance
let memoryCacheInstance: MemoryCache | null = null;

export function getMemoryCache(): MemoryCache {
  if (!memoryCacheInstance) {
    memoryCacheInstance = new MemoryCache();
  }
  return memoryCacheInstance;
}