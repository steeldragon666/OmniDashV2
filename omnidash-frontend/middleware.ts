/**
 * Next.js Middleware - Simplified for Edge Runtime
 * Only includes basic security headers
 */

import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const url = new URL(request.url);
  
  // Skip middleware for static assets and images
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/static/') ||
    url.pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js)$/i)
  ) {
    return response;
  }
  
  try {
    // Add basic security headers
    addSecurityHeaders(response);
    
    // Add request ID for tracking
    const requestId = generateRequestId();
    response.headers.set('X-Request-Id', requestId);
    
    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    
    // Return error response
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An error occurred processing your request',
        requestId: generateRequestId()
      },
      { status: 500 }
    );
  }
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): void {
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.* wss://* ws://localhost:*",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  // Strict Transport Security (HSTS)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  // Other security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};