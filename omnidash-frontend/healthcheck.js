#!/usr/bin/env node

/**
 * Health Check Script for Docker Container
 * Validates that the OmniDash application is running properly
 */

const http = require('http');
const fs = require('fs');

const healthCheck = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  checks: {}
};

async function checkEndpoint(path, expectedStatus = 200) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:3000${path}`, (res) => {
      resolve({
        status: res.statusCode === expectedStatus ? 'pass' : 'fail',
        statusCode: res.statusCode,
        responseTime: Date.now() - startTime
      });
    });

    const startTime = Date.now();
    
    req.on('error', (error) => {
      resolve({
        status: 'fail',
        error: error.message,
        responseTime: Date.now() - startTime
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        status: 'fail',
        error: 'Timeout',
        responseTime: 5000
      });
    });
  });
}

async function checkFileSystem() {
  try {
    // Check if logs directory is writable
    const testFile = '/app/logs/health-test.txt';
    fs.writeFileSync(testFile, 'health check');
    fs.unlinkSync(testFile);
    
    return { status: 'pass', message: 'Filesystem writable' };
  } catch (error) {
    return { status: 'fail', error: error.message };
  }
}

async function checkMemory() {
  const usage = process.memoryUsage();
  const totalMB = Math.round(usage.rss / 1024 / 1024);
  
  return {
    status: totalMB < 512 ? 'pass' : 'warn',
    memoryUsageMB: totalMB,
    heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024)
  };
}

async function runHealthChecks() {
  try {
    // Check main health endpoint
    healthCheck.checks.api = await checkEndpoint('/api/health');
    
    // Check if Next.js is responding
    healthCheck.checks.nextjs = await checkEndpoint('/');
    
    // Check filesystem
    healthCheck.checks.filesystem = await checkFileSystem();
    
    // Check memory usage
    healthCheck.checks.memory = await checkMemory();
    
    // Determine overall health
    const failedChecks = Object.values(healthCheck.checks).filter(check => check.status === 'fail');
    
    if (failedChecks.length > 0) {
      healthCheck.status = 'unhealthy';
      console.error('Health check failed:', JSON.stringify(healthCheck, null, 2));
      process.exit(1);
    } else {
      const warnChecks = Object.values(healthCheck.checks).filter(check => check.status === 'warn');
      if (warnChecks.length > 0) {
        healthCheck.status = 'degraded';
      }
      
      console.log('Health check passed:', JSON.stringify(healthCheck, null, 2));
      process.exit(0);
    }
  } catch (error) {
    console.error('Health check error:', error.message);
    process.exit(1);
  }
}

// Run health checks
runHealthChecks();