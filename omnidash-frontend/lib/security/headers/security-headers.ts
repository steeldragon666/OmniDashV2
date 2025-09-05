import { NextResponse } from 'next/server';

/**
 * Security headers configuration
 */
export interface SecurityHeadersConfig {
  // Content Security Policy
  contentSecurityPolicy?: {
    directives: Record<string, string[]>;
    reportOnly?: boolean;
    reportUri?: string;
  };
  
  // HTTP Strict Transport Security
  strictTransportSecurity?: {
    maxAge: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
  
  // Frame Options
  frameOptions?: 'DENY' | 'SAMEORIGIN' | string;
  
  // Content Type Options
  contentTypeOptions?: boolean;
  
  // Referrer Policy
  referrerPolicy?: string;
  
  // Permissions Policy
  permissionsPolicy?: Record<string, string[]>;
  
  // Cross-Origin Policies
  crossOriginEmbedderPolicy?: 'require-corp' | 'unsafe-none';
  crossOriginOpenerPolicy?: 'same-origin' | 'same-origin-allow-popups' | 'unsafe-none';
  crossOriginResourcePolicy?: 'same-site' | 'same-origin' | 'cross-origin';
  
  // Additional headers
  additionalHeaders?: Record<string, string>;
}

/**
 * Default security headers configuration
 */
export const defaultSecurityConfig: SecurityHeadersConfig = {
  contentSecurityPolicy: {
    directives: {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-eval'",
        "'unsafe-inline'",
        'https://cdnjs.cloudflare.com',
        'https://cdn.jsdelivr.net',
        'https://unpkg.com'
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://cdnjs.cloudflare.com'
      ],
      'img-src': [
        "'self'",
        'data:',
        'blob:',
        'https:',
        'http:'
      ],
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com',
        'https://cdnjs.cloudflare.com',
        'data:'
      ],
      'connect-src': [
        "'self'",
        'https://api.openai.com',
        'https://api.anthropic.com',
        'wss:'
      ],
      'media-src': ["'self'", 'data:', 'blob:'],
      'object-src': ["'none'"],
      'child-src': ["'self'"],
      'worker-src': ["'self'", 'blob:'],
      'frame-ancestors': ["'none'"],
      'form-action': ["'self'"],
      'base-uri': ["'self'"],
      'manifest-src': ["'self'"]
    },
    reportOnly: process.env.NODE_ENV === 'development',
    reportUri: '/api/security/csp-report'
  },
  
  strictTransportSecurity: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  frameOptions: 'DENY',
  contentTypeOptions: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  
  permissionsPolicy: {
    'camera': ["'none'"],
    'microphone': ["'none'"],
    'geolocation': ["'none'"],
    'interest-cohort': ["'none'"],
    'payment': ["'self'"],
    'usb': ["'none'"],
    'xr-spatial-tracking': ["'none'"]
  },
  
  crossOriginEmbedderPolicy: 'unsafe-none',
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'same-origin',
  
  additionalHeaders: {
    'X-DNS-Prefetch-Control': 'off',
    'X-Download-Options': 'noopen',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'Vary': 'Origin, Accept-Encoding'
  }
};

/**
 * Build Content Security Policy header value
 */
function buildCSPHeader(csp: SecurityHeadersConfig['contentSecurityPolicy']): string {
  if (!csp) return '';
  
  const directives = Object.entries(csp.directives)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
  
  return directives;
}

/**
 * Build Strict Transport Security header value
 */
function buildHSTSHeader(hsts: SecurityHeadersConfig['strictTransportSecurity']): string {
  if (!hsts) return '';
  
  let header = `max-age=${hsts.maxAge}`;
  
  if (hsts.includeSubDomains) {
    header += '; includeSubDomains';
  }
  
  if (hsts.preload) {
    header += '; preload';
  }
  
  return header;
}

/**
 * Build Permissions Policy header value
 */
function buildPermissionsPolicyHeader(permissions: Record<string, string[]>): string {
  return Object.entries(permissions)
    .map(([directive, allowlist]) => `${directive}=(${allowlist.join(' ')})`)
    .join(', ');
}

/**
 * Apply security headers to a NextResponse
 */
export function applySecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig = defaultSecurityConfig
): NextResponse {
  // Content Security Policy
  if (config.contentSecurityPolicy) {
    const cspValue = buildCSPHeader(config.contentSecurityPolicy);
    const headerName = config.contentSecurityPolicy.reportOnly
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';
    
    response.headers.set(headerName, cspValue);
  }
  
  // HTTP Strict Transport Security (HTTPS only)
  if (config.strictTransportSecurity) {
    const hstsValue = buildHSTSHeader(config.strictTransportSecurity);
    response.headers.set('Strict-Transport-Security', hstsValue);
  }
  
  // X-Frame-Options
  if (config.frameOptions) {
    response.headers.set('X-Frame-Options', config.frameOptions);
  }
  
  // X-Content-Type-Options
  if (config.contentTypeOptions) {
    response.headers.set('X-Content-Type-Options', 'nosniff');
  }
  
  // Referrer-Policy
  if (config.referrerPolicy) {
    response.headers.set('Referrer-Policy', config.referrerPolicy);
  }
  
  // Permissions-Policy
  if (config.permissionsPolicy) {
    const permissionsValue = buildPermissionsPolicyHeader(config.permissionsPolicy);
    response.headers.set('Permissions-Policy', permissionsValue);
  }
  
  // Cross-Origin-Embedder-Policy
  if (config.crossOriginEmbedderPolicy) {
    response.headers.set('Cross-Origin-Embedder-Policy', config.crossOriginEmbedderPolicy);
  }
  
  // Cross-Origin-Opener-Policy
  if (config.crossOriginOpenerPolicy) {
    response.headers.set('Cross-Origin-Opener-Policy', config.crossOriginOpenerPolicy);
  }
  
  // Cross-Origin-Resource-Policy
  if (config.crossOriginResourcePolicy) {
    response.headers.set('Cross-Origin-Resource-Policy', config.crossOriginResourcePolicy);
  }
  
  // Additional headers
  if (config.additionalHeaders) {
    Object.entries(config.additionalHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  
  return response;
}

/**
 * Create a new response with security headers
 */
export function createSecureResponse(
  body?: BodyInit | null,
  init?: ResponseInit,
  config?: SecurityHeadersConfig
): NextResponse {
  const response = new NextResponse(body, init);
  return applySecurityHeaders(response, config);
}

/**
 * Middleware helper for applying security headers
 */
export function withSecurityHeaders(config?: SecurityHeadersConfig) {
  return (response: NextResponse): NextResponse => {
    return applySecurityHeaders(response, config);
  };
}

/**
 * Get environment-specific security configuration
 */
export function getSecurityConfig(): SecurityHeadersConfig {
  const isProd = process.env.NODE_ENV === 'production';
  const isDev = process.env.NODE_ENV === 'development';
  
  const config = { ...defaultSecurityConfig };
  
  if (isDev) {
    // Relax CSP in development
    config.contentSecurityPolicy!.directives['script-src'] = [
      "'self'",
      "'unsafe-eval'",
      "'unsafe-inline'",
      'https:',
      'http:',
      'ws:',
      'wss:'
    ];
    
    config.contentSecurityPolicy!.directives['connect-src'] = [
      "'self'",
      'https:',
      'http:',
      'ws:',
      'wss:'
    ];
    
    config.contentSecurityPolicy!.reportOnly = true;
  }
  
  if (isProd) {
    // Strict CSP in production
    config.contentSecurityPolicy!.reportOnly = false;
    config.strictTransportSecurity!.maxAge = 63072000; // 2 years
  }
  
  return config;
}

/**
 * Validate CSP violation reports
 */
export function validateCSPReport(report: any): boolean {
  return (
    typeof report === 'object' &&
    report !== null &&
    typeof report['document-uri'] === 'string' &&
    typeof report['violated-directive'] === 'string'
  );
}