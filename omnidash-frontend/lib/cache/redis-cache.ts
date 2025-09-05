import { Redis } from 'ioredis';

export class RedisCache {
  private redis: Redis;
  private defaultTTL = 3600; // 1 hour in seconds

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      retryMaxDelay: 3000,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        return err.message.includes(targetError);
      },
    });

    this.redis.on('error', (error) => {
      console.error('Redis Cache Error:', error);
    });

    this.redis.on('connect', () => {
      console.log('Redis Cache Connected');
    });
  }

  /**
   * Get a value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (value === null) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache with optional TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      const expirationTime = ttl || this.defaultTTL;
      
      await this.redis.setex(key, expirationTime, serialized);
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL for a key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      console.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Increment a numeric value
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.redis.incr(key);
    } catch (error) {
      console.error(`Cache incr error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Set with expiration only if key doesn't exist
   */
  async setNX(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      const expirationTime = ttl || this.defaultTTL;
      
      const result = await this.redis.set(key, serialized, 'EX', expirationTime, 'NX');
      return result === 'OK';
    } catch (error) {
      console.error(`Cache setNX error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await this.redis.mget(...keys);
      return values.map(value => value ? JSON.parse(value) as T : null);
    } catch (error) {
      console.error(`Cache mget error for keys ${keys.join(', ')}:`, error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline();
      
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        const serialized = JSON.stringify(value);
        pipeline.setex(key, ttl || this.defaultTTL, serialized);
      });
      
      const results = await pipeline.exec();
      return results?.every(([error]) => !error) ?? false;
    } catch (error) {
      console.error(`Cache mset error:`, error);
      return false;
    }
  }

  /**
   * Delete keys by pattern
   */
  async deleteByPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      return await this.redis.del(...keys);
    } catch (error) {
      console.error(`Cache deleteByPattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Add to a set
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.redis.sadd(key, ...members);
    } catch (error) {
      console.error(`Cache sadd error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get all members of a set
   */
  async smembers(key: string): Promise<string[]> {
    try {
      return await this.redis.smembers(key);
    } catch (error) {
      console.error(`Cache smembers error for key ${key}:`, error);
      return [];
    }
  }

  /**
   * Remove from a set
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.redis.srem(key, ...members);
    } catch (error) {
      console.error(`Cache srem error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Push to a list (left side)
   */
  async lpush(key: string, ...elements: string[]): Promise<number> {
    try {
      return await this.redis.lpush(key, ...elements);
    } catch (error) {
      console.error(`Cache lpush error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get range of list elements
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await this.redis.lrange(key, start, stop);
    } catch (error) {
      console.error(`Cache lrange error for key ${key}:`, error);
      return [];
    }
  }

  /**
   * Trim a list to specified range
   */
  async ltrim(key: string, start: number, stop: number): Promise<boolean> {
    try {
      const result = await this.redis.ltrim(key, start, stop);
      return result === 'OK';
    } catch (error) {
      console.error(`Cache ltrim error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Flush all keys (use with caution)
   */
  async flushall(): Promise<boolean> {
    try {
      const result = await this.redis.flushall();
      return result === 'OK';
    } catch (error) {
      console.error(`Cache flushall error:`, error);
      return false;
    }
  }

  /**
   * Get cache info and stats
   */
  async info(): Promise<string> {
    try {
      return await this.redis.info('memory');
    } catch (error) {
      console.error(`Cache info error:`, error);
      return '';
    }
  }

  /**
   * Close the connection
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      console.error('Cache disconnect error:', error);
    }
  }

  /**
   * Health check
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Cache ping error:', error);
      return false;
    }
  }
}

// Singleton instance
let cacheInstance: RedisCache | null = null;

export function getCache(): RedisCache {
  if (!cacheInstance) {
    cacheInstance = new RedisCache();
  }
  return cacheInstance;
}