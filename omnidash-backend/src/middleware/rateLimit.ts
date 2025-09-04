/**
 * Rate Limiting Middleware
 * Provides rate limiting functionality for API endpoints
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

/**
 * Create a rate limiter middleware with custom options
 */
export const rateLimitMiddleware = (options: RateLimitOptions = {}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
    max: options.max || 100, // limit each IP to 100 requests per windowMs
    message: options.message || {
      error: 'Too many requests',
      message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: options.standardHeaders !== false, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: options.legacyHeaders !== false, // Disable the `X-RateLimit-*` headers
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: options.message || 'Too many requests from this IP, please try again later.',
        retryAfter: Math.round(options.windowMs! / 1000) || 900
      });
    }
  });
};

/**
 * Predefined rate limiters for different use cases
 */
export const RateLimiters = {
  // Strict rate limiter for authentication endpoints
  auth: rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: 'Too many authentication attempts, please try again later.'
  }),

  // Standard rate limiter for API endpoints
  api: rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many API requests, please try again later.'
  }),

  // Lenient rate limiter for general endpoints
  general: rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: 'Too many requests, please try again later.'
  }),

  // Strict rate limiter for expensive operations
  expensive: rateLimitMiddleware({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // limit each IP to 10 requests per hour
    message: 'Too many expensive operations, please try again later.'
  })
};