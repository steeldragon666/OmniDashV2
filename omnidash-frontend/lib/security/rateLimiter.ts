/**
 * Rate Limiting Middleware for API Endpoints
 * Implements multiple strategies for different endpoint types
 */

import { NextRequest, NextResponse } from 'next/server';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
// import { logger } from '../logging/logger'; // Disabled for Edge Runtime
import { env } from '../env';

// Simple console logger for Edge Runtime
const logger = {
  info: console.log,
  warn: console.warn,
  error: console.error
};

// Conditional import of Redis to avoid issues when not available
let Redis: any;
try {
  Redis = (await import('ioredis')).default;
} catch {
  // Redis not available, will use in-memory rate limiting
  Redis = null;
}

// Rate limiter configurations for different endpoint types
const rateLimiterConfigs = {
  // Strict rate limiting for authentication endpoints
  auth: {
    points: 5, // Number of requests
    duration: 900, // Per 15 minutes
    blockDuration: 900, // Block for 15 minutes
    execEvenly: false
  },
  // Moderate rate limiting for API endpoints
  api: {
    points: 100,
    duration: 60, // Per minute
    blockDuration: 60,
    execEvenly: false
  },
  // Relaxed rate limiting for public endpoints
  public: {
    points: 200,
    duration: 60,
    blockDuration: 30,
    execEvenly: true
  },
  // Strict rate limiting for write operations
  write: {
    points: 20,
    duration: 60,
    blockDuration: 300,
    execEvenly: false
  },
  // Very strict for password reset
  passwordReset: {
    points: 3,
    duration: 3600, // Per hour
    blockDuration: 3600,
    execEvenly: false
  }
};

class RateLimiterService {
  private static instance: RateLimiterService;
  private limiters: Map<string, RateLimiterMemory | RateLimiterRedis> = new Map();
  private redis?: Redis;
  
  private constructor() {
    this.initializeRateLimiters();
  }
  
  public static getInstance(): RateLimiterService {
    if (!RateLimiterService.instance) {
      RateLimiterService.instance = new RateLimiterService();
    }
    return RateLimiterService.instance;
  }
  
  /**
   * Initialize rate limiters
   */
  private initializeRateLimiters(): void {
    // Check if Redis is configured and available
    const redisUrl = env.get('REDIS_URL' as any);
    
    if (redisUrl && Redis) {
      try {
        this.redis = new Redis(redisUrl, {
          enableOfflineQueue: false,
          maxRetriesPerRequest: 3,
          lazyConnect: true
        });
        
        this.redis.on('connect', () => {
          logger.info('Redis connected for rate limiting');
        });
        
        this.redis.on('error', (error: Error) => {
          logger.error('Redis error', { error: error.message });
          // Fallback to memory if Redis fails
          this.initializeMemoryLimiters();
        });
        
        // Use Redis-based rate limiters
        this.initializeRedisLimiters();
      } catch (error) {
        logger.warn('Failed to connect to Redis, using in-memory rate limiting', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        this.initializeMemoryLimiters();
      }
    } else {
      // Use in-memory rate limiters
      logger.info('Using in-memory rate limiting (Redis not configured)');
      this.initializeMemoryLimiters();
    }
  }
  
  /**
   * Initialize Redis-based rate limiters
   */
  private initializeRedisLimiters(): void {
    if (!this.redis) return;
    
    Object.entries(rateLimiterConfigs).forEach(([key, config]) => {
      this.limiters.set(key, new RateLimiterRedis({
        storeClient: this.redis!,
        keyPrefix: `rate_limit_${key}`,
        ...config
      }));
    });
    
    logger.info('Redis rate limiters initialized');
  }
  
  /**
   * Initialize in-memory rate limiters
   */
  private initializeMemoryLimiters(): void {
    Object.entries(rateLimiterConfigs).forEach(([key, config]) => {
      this.limiters.set(key, new RateLimiterMemory({
        keyPrefix: `rate_limit_${key}`,
        ...config
      }));
    });
    
    logger.info('In-memory rate limiters initialized');
  }
  
  /**
   * Get rate limiter by type
   */
  public getRateLimiter(type: keyof typeof rateLimiterConfigs): RateLimiterMemory | RateLimiterRedis {
    const limiter = this.limiters.get(type);
    
    if (!limiter) {
      logger.error('Rate limiter not found', { type });
      // Return default API limiter as fallback
      return this.limiters.get('api')!;
    }
    
    return limiter;
  }
  
  /**
   * Check rate limit for a request
   */
  public async checkRateLimit(
    type: keyof typeof rateLimiterConfigs,
    identifier: string,
    points = 1
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    const limiter = this.getRateLimiter(type);
    
    try {
      await limiter.consume(identifier, points);
      return { allowed: true };
    } catch (rejRes: any) {
      const retryAfter = Math.round(rejRes.msBeforeNext / 1000) || 60;
      
      logger.warn('Rate limit exceeded', {
        type,
        identifier,
        retryAfter
      });
      
      return {
        allowed: false,
        retryAfter
      };
    }
  }
  
  /**
   * Reset rate limit for an identifier
   */
  public async resetRateLimit(type: keyof typeof rateLimiterConfigs, identifier: string): Promise<void> {
    const limiter = this.getRateLimiter(type);
    
    try {
      await limiter.delete(identifier);
      logger.info('Rate limit reset', { type, identifier });
    } catch (error) {
      logger.error('Failed to reset rate limit', {
        type,
        identifier,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Export singleton instance
export const rateLimiterService = RateLimiterService.getInstance();

/**
 * Rate limiting middleware for Next.js API routes
 */
export function createRateLimitMiddleware(
  type: keyof typeof rateLimiterConfigs = 'api',
  getIdentifier?: (req: NextRequest) => string
) {
  return async function rateLimitMiddleware(req: NextRequest): Promise<NextResponse | null> {
    // Skip rate limiting in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && process.env.RATE_LIMIT_ENABLED !== 'true') {
      return null; // Continue to next middleware
    }
    
    // Get identifier (IP address by default)
    const identifier = getIdentifier ? getIdentifier(req) : getIpAddress(req);
    
    // Check rate limit
    const { allowed, retryAfter } = await rateLimiterService.checkRateLimit(type, identifier);
    
    if (!allowed) {
      // Return rate limit error response
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(rateLimiterConfigs[type].points),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + retryAfter * 1000).toISOString()
          }
        }
      );
    }
    
    return null; // Continue to next middleware
  };
}

/**
 * Get IP address from request
 */
function getIpAddress(req: NextRequest): string {
  // Try to get real IP from headers (for proxy/load balancer scenarios)
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip'); // Cloudflare
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  // Fallback to request IP
  return req.ip || '127.0.0.1';
}

/**
 * Express-style rate limit middleware wrapper
 */
export function rateLimitHandler(type: keyof typeof rateLimiterConfigs = 'api') {
  return async (req: any, res: any, next: any) => {
    const identifier = getIpAddress(req);
    const { allowed, retryAfter } = await rateLimiterService.checkRateLimit(type, identifier);
    
    if (!allowed) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter
      });
      return;
    }
    
    next();
  };
}

/**
 * Rate limit decorator for class methods
 */
export function RateLimit(type: keyof typeof rateLimiterConfigs = 'api', points = 1) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      // Extract identifier from context (customize based on your needs)
      const context = args[0];
      const identifier = context?.userId || context?.ip || 'unknown';
      
      const { allowed, retryAfter } = await rateLimiterService.checkRateLimit(type, identifier, points);
      
      if (!allowed) {
        throw new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
      }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

export default rateLimiterService;