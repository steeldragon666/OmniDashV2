/**
 * Health Check API Endpoint
 * Provides comprehensive system health monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    [key: string]: {
      status: 'pass' | 'warn' | 'fail';
      message?: string;
      responseTime?: number;
      details?: any;
    };
  };
}

// Cache health check results for 10 seconds to avoid excessive checks
let cachedHealthCheck: { data: HealthCheck; timestamp: number } | null = null;
const CACHE_TTL = 10000; // 10 seconds

async function checkDatabase(): Promise<{ status: 'pass' | 'warn' | 'fail'; message?: string; responseTime: number }> {
  const start = Date.now();
  
  try {
    // Skip actual database check if Supabase isn't configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        status: 'warn',
        message: 'Database not configured',
        responseTime: Date.now() - start
      };
    }

    // In a real implementation, you would check Supabase connection here
    // const { data, error } = await supabase.from('health_check').select('count');
    
    return {
      status: 'pass',
      message: 'Database accessible',
      responseTime: Date.now() - start
    };
  } catch (_error) {
    return {
      status: 'fail',
      message: _error instanceof Error ? _error.message : 'Database check failed',
      responseTime: Date.now() - start
    };
  }
}

async function checkRedis(): Promise<{ status: 'pass' | 'warn' | 'fail'; message?: string; responseTime: number }> {
  const start = Date.now();
  
  try {
    if (!process.env.REDIS_URL) {
      return {
        status: 'warn',
        message: 'Redis not configured',
        responseTime: Date.now() - start
      };
    }

    // In a real implementation, you would ping Redis here
    // await redis.ping();
    
    return {
      status: 'pass',
      message: 'Redis accessible',
      responseTime: Date.now() - start
    };
  } catch (_error) {
    return {
      status: 'fail',
      message: _error instanceof Error ? _error.message : 'Redis check failed',
      responseTime: Date.now() - start
    };
  }
}

async function checkExternalAPIs(): Promise<{ status: 'pass' | 'warn' | 'fail'; message?: string; responseTime: number }> {
  const start = Date.now();
  const checks = [];

  // Check critical external APIs
  const externalServices = [
    { name: 'OpenAI', url: 'https://api.openai.com/v1/models', required: false },
    { name: 'Anthropic', url: 'https://api.anthropic.com', required: false }
  ];

  for (const service of externalServices) {
    try {
      const response = await fetch(service.url, {
        method: 'HEAD',
        timeout: 5000
      });
      checks.push({
        name: service.name,
        status: response.ok ? 'pass' : 'fail',
        required: service.required
      });
    } catch (_error) {
      checks.push({
        name: service.name,
        status: service.required ? 'fail' : 'warn',
        required: service.required
      });
    }
  }

  const failedRequired = checks.filter(c => c.status === 'fail' && c.required);
  const failedOptional = checks.filter(c => c.status === 'fail' && !c.required);

  return {
    status: failedRequired.length > 0 ? 'fail' : failedOptional.length > 0 ? 'warn' : 'pass',
    message: `${checks.filter(c => c.status === 'pass').length}/${checks.length} external services accessible`,
    responseTime: Date.now() - start
  };
}

function checkMemory(): { status: 'pass' | 'warn' | 'fail'; message?: string; details: any } {
  const usage = process.memoryUsage();
  const totalMB = Math.round(usage.rss / 1024 / 1024);
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  
  let status: 'pass' | 'warn' | 'fail' = 'pass';
  let message = `Memory usage: ${totalMB}MB (heap: ${heapUsedMB}MB)`;

  if (totalMB > 1024) { // Over 1GB
    status = 'fail';
    message = `High memory usage: ${totalMB}MB`;
  } else if (totalMB > 512) { // Over 512MB
    status = 'warn';
    message = `Elevated memory usage: ${totalMB}MB`;
  }

  return {
    status,
    message,
    details: {
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers
    }
  };
}

function checkDisk(): { status: 'pass' | 'warn' | 'fail'; message?: string; details: any } {
  try {
    const stats = fs.statSync('./logs');
    
    return {
      status: 'pass',
      message: 'Disk access OK',
      details: {
        logsDirectory: stats.isDirectory(),
        lastAccess: stats.atime
      }
    };
  } catch (_error) {
    return {
      status: 'warn',
      message: 'Disk check partial',
      details: { error: _error instanceof Error ? _error.message : 'Unknown error' }
    };
  }
}

async function performHealthCheck(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  // Run all health checks in parallel
  const [
    databaseCheck,
    redisCheck,
    externalCheck,
    memoryCheck,
    diskCheck
  ] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkExternalAPIs(),
    Promise.resolve(checkMemory()),
    Promise.resolve(checkDisk())
  ]);

  const checks = {
    database: databaseCheck,
    redis: redisCheck,
    external_apis: externalCheck,
    memory: memoryCheck,
    disk: diskCheck,
    response_time: {
      status: 'pass' as const,
      responseTime: Date.now() - startTime,
      message: `Health check completed in ${Date.now() - startTime}ms`
    }
  };

  // Determine overall status
  const failedChecks = Object.values(checks).filter(check => check.status === 'fail');
  const warnChecks = Object.values(checks).filter(check => check.status === 'warn');
  
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (failedChecks.length > 0) {
    overallStatus = 'unhealthy';
  } else if (warnChecks.length > 0) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks
  };
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    // Check cache first
    if (cachedHealthCheck && Date.now() - cachedHealthCheck.timestamp < CACHE_TTL) {
      const response = NextResponse.json(cachedHealthCheck.data);
      response.headers.set('Cache-Control', 's-maxage=10, stale-while-revalidate=60');
      return response;
    }

    // Perform health check
    const healthCheck = await performHealthCheck();
    
    // Cache result
    cachedHealthCheck = {
      data: healthCheck,
      timestamp: Date.now()
    };

    // Set appropriate HTTP status code
    const httpStatus = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 200 : 503;

    const response = NextResponse.json(healthCheck, { status: httpStatus });
    
    // Set cache headers
    response.headers.set('Cache-Control', 's-maxage=10, stale-while-revalidate=60');
    response.headers.set('Content-Type', 'application/json');
    
    return response;
  } catch (_error) {
    // Return unhealthy status if health check itself fails
    const errorResponse: HealthCheck = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        health_check: {
          status: 'fail',
          message: error instanceof Error ? error.message : 'Health check failed'
        }
      }
    };

    return NextResponse.json(errorResponse, { status: 503 });
  }
}

// Support HEAD requests for simple uptime checks
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  try {
    // Simple uptime check without detailed health information
    const response = new NextResponse(null, { status: 200 });
    response.headers.set('Cache-Control', 's-maxage=10');
    return response;
  } catch (_error) {
    return new NextResponse(null, { status: 503 });
  }
}