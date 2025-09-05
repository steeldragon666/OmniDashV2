/**
 * CSRF Protection Middleware
 * Implements Double Submit Cookie and Synchronizer Token patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
// import { logger } from '../logging/logger'; // Disabled for Edge Runtime
import jwt from 'jsonwebtoken';
import { env } from '../env';

// Simple console logger for Edge Runtime
const logger = {
  info: console.log,
  warn: console.warn,
  error: console.error,
  security: console.warn
};

// CSRF token configuration
const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = '__Host-csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_FIELD_NAME = '_csrf';
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Methods that require CSRF protection
const PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Paths that are exempt from CSRF protection
const EXEMPT_PATHS = [
  '/api/auth/callback', // OAuth callbacks
  '/api/webhooks', // External webhooks
  '/api/health', // Health check endpoints
];

class CSRFProtection {
  private static instance: CSRFProtection;
  private secret: string;
  private tokenStore: Map<string, { token: string; expires: number }> = new Map();
  
  private constructor() {
    // Use NextAuth secret for CSRF token signing
    this.secret = env.get('NEXTAUTH_SECRET') || crypto.randomBytes(32).toString('hex');
    
    // Clean up expired tokens periodically
    setInterval(() => this.cleanupExpiredTokens(), 60 * 60 * 1000); // Every hour
  }
  
  public static getInstance(): CSRFProtection {
    if (!CSRFProtection.instance) {
      CSRFProtection.instance = new CSRFProtection();
    }
    return CSRFProtection.instance;
  }
  
  /**
   * Generate a CSRF token
   */
  public generateToken(sessionId?: string): string {
    const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
    
    if (sessionId) {
      // Store token with session association
      this.tokenStore.set(sessionId, {
        token,
        expires: Date.now() + CSRF_TOKEN_EXPIRY
      });
    }
    
    // Sign the token
    const signedToken = this.signToken(token);
    
    logger.debug('CSRF token generated', {
      sessionId,
      tokenLength: token.length
    });
    
    return signedToken;
  }
  
  /**
   * Sign a CSRF token using JWT
   */
  private signToken(token: string): string {
    return jwt.sign(
      { csrf: token, iat: Date.now() },
      this.secret,
      { expiresIn: '24h' }
    );
  }
  
  /**
   * Verify a signed CSRF token
   */
  private verifySignedToken(signedToken: string): string | null {
    try {
      const decoded = jwt.verify(signedToken, this.secret) as any;
      return decoded.csrf;
    } catch (error) {
      logger.debug('CSRF token verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }
  
  /**
   * Validate CSRF token from request
   */
  public validateToken(
    providedToken: string,
    cookieToken: string,
    sessionId?: string
  ): boolean {
    // Verify both tokens are present
    if (!providedToken || !cookieToken) {
      logger.warn('CSRF validation failed: missing tokens');
      return false;
    }
    
    // Verify signatures
    const providedCsrf = this.verifySignedToken(providedToken);
    const cookieCsrf = this.verifySignedToken(cookieToken);
    
    if (!providedCsrf || !cookieCsrf) {
      logger.warn('CSRF validation failed: invalid signatures');
      return false;
    }
    
    // Double Submit Cookie validation - tokens must match
    if (providedCsrf !== cookieCsrf) {
      logger.warn('CSRF validation failed: token mismatch');
      return false;
    }
    
    // If session-based validation is enabled
    if (sessionId) {
      const storedData = this.tokenStore.get(sessionId);
      
      if (!storedData) {
        logger.warn('CSRF validation failed: no stored token for session', { sessionId });
        return false;
      }
      
      if (storedData.expires < Date.now()) {
        logger.warn('CSRF validation failed: token expired', { sessionId });
        this.tokenStore.delete(sessionId);
        return false;
      }
      
      if (storedData.token !== providedCsrf) {
        logger.warn('CSRF validation failed: stored token mismatch', { sessionId });
        return false;
      }
    }
    
    logger.debug('CSRF validation successful');
    return true;
  }
  
  /**
   * Clean up expired tokens
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [sessionId, data] of this.tokenStore.entries()) {
      if (data.expires < now) {
        this.tokenStore.delete(sessionId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.debug('Cleaned up expired CSRF tokens', { count: cleaned });
    }
  }
  
  /**
   * Extract CSRF token from request
   */
  public extractTokenFromRequest(req: NextRequest): string | null {
    // Try header first (preferred for AJAX requests)
    const headerToken = req.headers.get(CSRF_HEADER_NAME);
    if (headerToken) {
      return headerToken;
    }
    
    // Try body for form submissions
    if (req.method === 'POST' && req.headers.get('content-type')?.includes('application/json')) {
      // For JSON bodies, we'd need to parse the body
      // This is handled in the route handler
    }
    
    // Try query parameter (not recommended but supported)
    const url = new URL(req.url);
    const queryToken = url.searchParams.get(CSRF_FIELD_NAME);
    if (queryToken) {
      return queryToken;
    }
    
    return null;
  }
  
  /**
   * Extract CSRF token from cookies
   */
  public extractTokenFromCookie(req: NextRequest): string | null {
    const cookieHeader = req.headers.get('cookie');
    if (!cookieHeader) return null;
    
    const cookies = this.parseCookies(cookieHeader);
    return cookies[CSRF_COOKIE_NAME] || null;
  }
  
  /**
   * Parse cookie string
   */
  private parseCookies(cookieString: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    
    cookieString.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
    
    return cookies;
  }
  
  /**
   * Check if path is exempt from CSRF protection
   */
  public isExemptPath(path: string): boolean {
    return EXEMPT_PATHS.some(exemptPath => path.startsWith(exemptPath));
  }
  
  /**
   * Check if request requires CSRF protection
   */
  public requiresProtection(req: NextRequest): boolean {
    // Check if method requires protection
    if (!PROTECTED_METHODS.includes(req.method)) {
      return false;
    }
    
    // Check if path is exempt
    const url = new URL(req.url);
    if (this.isExemptPath(url.pathname)) {
      return false;
    }
    
    return true;
  }
}

// Export singleton instance
export const csrfProtection = CSRFProtection.getInstance();

/**
 * CSRF protection middleware for Next.js
 */
export async function csrfMiddleware(req: NextRequest): Promise<NextResponse | null> {
  // Skip CSRF protection in development unless explicitly enabled
  if (process.env.NODE_ENV === 'development' && process.env.CSRF_ENABLED !== 'true') {
    return null;
  }
  
  // Check if request requires CSRF protection
  if (!csrfProtection.requiresProtection(req)) {
    return null;
  }
  
  // Extract tokens
  const providedToken = csrfProtection.extractTokenFromRequest(req);
  const cookieToken = csrfProtection.extractTokenFromCookie(req);
  
  // Get session ID from auth cookie or header
  const sessionId = extractSessionId(req);
  
  // Validate tokens
  if (!providedToken || !cookieToken) {
    logger.warn('CSRF protection: Missing tokens', {
      path: req.url,
      method: req.method,
      hasProvidedToken: !!providedToken,
      hasCookieToken: !!cookieToken
    });
    
    return NextResponse.json(
      {
        error: 'CSRF validation failed',
        message: 'Missing CSRF token'
      },
      { status: 403 }
    );
  }
  
  const isValid = csrfProtection.validateToken(providedToken, cookieToken, sessionId);
  
  if (!isValid) {
    logger.warn('CSRF protection: Invalid token', {
      path: req.url,
      method: req.method,
      sessionId
    });
    
    return NextResponse.json(
      {
        error: 'CSRF validation failed',
        message: 'Invalid CSRF token'
      },
      { status: 403 }
    );
  }
  
  // Token is valid, continue
  return null;
}

/**
 * Extract session ID from request
 */
function extractSessionId(req: NextRequest): string | undefined {
  // Try to get from auth cookie
  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    const cookies = csrfProtection['parseCookies'](cookieHeader);
    const sessionToken = cookies['next-auth.session-token'] || cookies['__Secure-next-auth.session-token'];
    
    if (sessionToken) {
      // Hash the session token to use as ID
      return crypto.createHash('sha256').update(sessionToken).digest('hex');
    }
  }
  
  // Try to get from authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return crypto.createHash('sha256').update(token).digest('hex');
  }
  
  return undefined;
}

/**
 * Helper to generate CSRF token and set cookie
 */
export function generateCSRFToken(res: NextResponse, sessionId?: string): string {
  const token = csrfProtection.generateToken(sessionId);
  
  // Set CSRF cookie with security flags
  res.cookies.set({
    name: CSRF_COOKIE_NAME,
    value: token,
    httpOnly: false, // Must be readable by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60 // 24 hours
  });
  
  return token;
}

/**
 * Express-style CSRF middleware
 */
export function csrfHandler() {
  return async (req: any, res: any, next: any) => {
    // Generate token for GET requests
    if (req.method === 'GET') {
      req.csrfToken = () => csrfProtection.generateToken(req.sessionID);
      return next();
    }
    
    // Validate token for state-changing requests
    if (PROTECTED_METHODS.includes(req.method)) {
      const providedToken = 
        req.headers[CSRF_HEADER_NAME] || 
        req.body?._csrf || 
        req.query?._csrf;
        
      const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
      
      const isValid = csrfProtection.validateToken(
        providedToken,
        cookieToken,
        req.sessionID
      );
      
      if (!isValid) {
        return res.status(403).json({
          error: 'CSRF validation failed',
          message: 'Invalid or missing CSRF token'
        });
      }
    }
    
    next();
  };
}

/**
 * React hook helper for CSRF tokens
 * Usage: Include this component in your HTML head to make CSRF token available to client-side JavaScript
 */
export function createCSRFTokenScript(token: string): string {
  return `<script>window.__CSRF_TOKEN__ = '${token}';</script>`;
}

/**
 * Get CSRF token from client-side JavaScript
 */
export function getClientCSRFToken(): string | null {
  if (typeof window !== 'undefined') {
    return (window as any).__CSRF_TOKEN__ || null;
  }
  return null;
}

export default csrfProtection;