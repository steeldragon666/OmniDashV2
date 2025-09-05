import { getCacheManager } from './cache-manager';

/**
 * Cache decorator options
 */
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string | ((args: any[]) => string); // Custom cache key
  prefix?: string; // Key prefix
  bypass?: boolean; // Skip caching
  refreshThreshold?: number; // Refresh cache when TTL is below this threshold (seconds)
}

/**
 * Default cache key generator
 */
function generateCacheKey(
  className: string,
  methodName: string,
  args: any[],
  customKey?: string | ((args: any[]) => string),
  prefix?: string
): string {
  let key: string;
  
  if (typeof customKey === 'function') {
    key = customKey(args);
  } else if (typeof customKey === 'string') {
    key = customKey;
  } else {
    // Default key generation
    const argsKey = args.length > 0 ? JSON.stringify(args) : '';
    key = `${className}.${methodName}(${argsKey})`;
  }
  
  return prefix ? `${prefix}:${key}` : key;
}

/**
 * Method decorator for caching
 */
export function Cached(options: CacheOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    
    descriptor.value = async function (...args: any[]) {
      // Skip caching if bypass is true
      if (options.bypass) {
        return await originalMethod.apply(this, args);
      }
      
      const cacheManager = getCacheManager();
      const cacheKey = generateCacheKey(
        className,
        propertyKey,
        args,
        options.key,
        options.prefix
      );
      
      try {
        // Try to get from cache first
        const cachedResult = await cacheManager.get(cacheKey);
        
        if (cachedResult !== null) {
          // Check refresh threshold
          if (options.refreshThreshold) {
            const ttl = await cacheManager.ttl(cacheKey);
            
            if (ttl <= options.refreshThreshold && ttl > 0) {
              // Refresh in background
              originalMethod.apply(this, args)
                .then(async (result: any) => {
                  await cacheManager.set(cacheKey, result, options.ttl);
                })
                .catch(() => {
                  // Ignore refresh errors
                });
            }
          }
          
          return cachedResult;
        }
        
        // Execute original method
        const result = await originalMethod.apply(this, args);
        
        // Cache the result
        await cacheManager.set(cacheKey, result, options.ttl);
        
        return result;
        
      } catch (error) {
        console.error(`Cache decorator error for ${className}.${propertyKey}:`, error);
        // Fallback to original method
        return await originalMethod.apply(this, args);
      }
    };
    
    return descriptor;
  };
}

/**
 * Class decorator for automatic cache invalidation
 */
export function CacheInvalidate(pattern: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);
      
      try {
        const cacheManager = getCacheManager();
        await cacheManager.deleteByPattern(pattern);
      } catch (error) {
        console.error(`Cache invalidation error for pattern ${pattern}:`, error);
      }
      
      return result;
    };
    
    return descriptor;
  };
}

/**
 * Memoization decorator (in-memory caching for the current request/session)
 */
export function Memoized(options: { key?: string } = {}) {
  const memoCache = new Map<string, any>();
  
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    
    descriptor.value = function (...args: any[]) {
      const key = options.key || `${className}.${propertyKey}(${JSON.stringify(args)})`;
      
      if (memoCache.has(key)) {
        return memoCache.get(key);
      }
      
      const result = originalMethod.apply(this, args);
      memoCache.set(key, result);
      
      return result;
    };
    
    return descriptor;
  };
}

/**
 * Rate limit decorator with caching
 */
export function RateLimited(options: {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (args: any[]) => string;
}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    
    descriptor.value = async function (...args: any[]) {
      const cacheManager = getCacheManager();
      
      const rateLimitKey = options.keyGenerator 
        ? `ratelimit:${options.keyGenerator(args)}`
        : `ratelimit:${className}.${propertyKey}`;
      
      try {
        const currentCount = await cacheManager.get<number>(rateLimitKey) || 0;
        
        if (currentCount >= options.maxRequests) {
          throw new Error(`Rate limit exceeded for ${className}.${propertyKey}`);
        }
        
        // Increment counter
        await cacheManager.setNX(rateLimitKey, 1, Math.ceil(options.windowMs / 1000));
        await cacheManager.incr(rateLimitKey);
        
        return await originalMethod.apply(this, args);
        
      } catch (error) {
        if (error.message.includes('Rate limit exceeded')) {
          throw error;
        }
        
        // If cache fails, allow the operation (fail open)
        console.warn(`Rate limiting failed for ${className}.${propertyKey}:`, error);
        return await originalMethod.apply(this, args);
      }
    };
    
    return descriptor;
  };
}

/**
 * Cache warming utility
 */
export async function warmupCache(entries: Array<{
  key: string;
  value: any;
  ttl?: number;
}>) {
  const cacheManager = getCacheManager();
  
  console.log(`Warming up cache with ${entries.length} entries...`);
  
  const warmupData: Record<string, { value: any; ttl?: number }> = {};
  
  entries.forEach(entry => {
    warmupData[entry.key] = {
      value: entry.value,
      ttl: entry.ttl
    };
  });
  
  await cacheManager.warmup(warmupData);
}

/**
 * Cache metrics collection
 */
export async function getCacheMetrics(): Promise<{
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  memoryUsage: string;
}> {
  const cacheManager = getCacheManager();
  
  try {
    const stats = await cacheManager.getStats();
    const info = stats.info;
    
    // Parse cache info (format depends on cache implementation)
    const infoLines = info.split(',');
    const metrics: any = {};
    
    infoLines.forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        metrics[key.trim()] = value.trim();
      }
    });
    
    return {
      hits: parseInt(metrics.hits) || 0,
      misses: parseInt(metrics.misses) || 0,
      hitRate: parseFloat(metrics.hit_rate) || 0,
      size: parseInt(metrics.keys) || 0,
      memoryUsage: metrics.memory || '0KB'
    };
    
  } catch (error) {
    console.error('Failed to get cache metrics:', error);
    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      memoryUsage: '0KB'
    };
  }
}