#!/usr/bin/env node

/**
 * Backend-Frontend Connection Test Script
 * Verifies all API endpoints and database connections
 */

const { createClient } = require('@supabase/supabase-js');
const Redis = require('ioredis');
require('dotenv').config({ path: '.env' });

// Test configuration
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 10000;

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function testFetch(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TEST_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

class ConnectionTester {
  constructor() {
    this.results = {
      database: false,
      redis: false,
      apis: {},
      frontend: false
    };
  }

  async testDatabase() {
    info('Testing Database Connection...');
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      error('Database: Missing Supabase configuration');
      return false;
    }

    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );

      // Test connection
      const { data, error } = await supabase
        .from('workflows')
        .select('count')
        .limit(1);

      if (error) {
        if (error.code === 'PGRST116') {
          warning('Database: workflows table does not exist - run database setup');
          return false;
        }
        throw error;
      }

      success('Database: Connected successfully');
      this.results.database = true;
      return true;

    } catch (err) {
      error(`Database: Connection failed - ${err.message}`);
      return false;
    }
  }

  async testRedis() {
    info('Testing Redis Connection...');
    
    if (!process.env.REDIS_URL) {
      warning('Redis: REDIS_URL not configured - caching will use memory fallback');
      return true; // Not critical
    }

    try {
      const redis = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryDelayOnFailover: 100,
        connectTimeout: 5000
      });

      await redis.connect();
      await redis.ping();
      await redis.disconnect();

      success('Redis: Connected successfully');
      this.results.redis = true;
      return true;

    } catch (err) {
      warning(`Redis: Connection failed - ${err.message} (fallback to memory cache)`);
      return true; // Non-critical failure
    }
  }

  async testAPI(endpoint, expectedStatus = 200, options = {}) {
    try {
      const url = `${BASE_URL}${endpoint}`;
      const response = await testFetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      const isSuccess = response.status === expectedStatus;
      
      if (isSuccess) {
        success(`API ${endpoint}: Responding correctly (${response.status})`);
      } else {
        error(`API ${endpoint}: Expected ${expectedStatus}, got ${response.status}`);
      }

      this.results.apis[endpoint] = isSuccess;
      return isSuccess;

    } catch (err) {
      error(`API ${endpoint}: ${err.message}`);
      this.results.apis[endpoint] = false;
      return false;
    }
  }

  async testAPIs() {
    info('Testing API Endpoints...');

    const apiTests = [
      // Health check
      { endpoint: '/api/health', status: 200 },
      
      // Dashboard stats (might need auth, but should respond)
      { endpoint: '/api/dashboard/stats?test=true', status: 200 },
      
      // Metrics endpoint
      { endpoint: '/api/metrics', status: 200 },
      
      // Cache management
      { endpoint: '/api/cache?action=ping', status: 200 },
      
      // Workflows API (might be 401 without auth)
      { endpoint: '/api/automation/workflows', status: 401 },
    ];

    const results = await Promise.all(
      apiTests.map(({ endpoint, status }) => 
        this.testAPI(endpoint, status)
      )
    );

    return results.every(result => result === true);
  }

  async testFrontend() {
    info('Testing Frontend Pages...');

    const pageTests = [
      '/', // Landing page
      '/dashboard', // Dashboard (might redirect)
      '/workflows', // Workflows page (might redirect)
      '/auth/login' // Login page
    ];

    let successCount = 0;
    
    for (const page of pageTests) {
      try {
        const response = await testFetch(`${BASE_URL}${page}`);
        
        if (response.status === 200 || response.status === 302) {
          success(`Frontend ${page}: Loading correctly`);
          successCount++;
        } else {
          error(`Frontend ${page}: Status ${response.status}`);
        }

      } catch (err) {
        error(`Frontend ${page}: ${err.message}`);
      }
    }

    this.results.frontend = successCount === pageTests.length;
    return this.results.frontend;
  }

  async testAuthFlow() {
    info('Testing Authentication Configuration...');

    // Check NextAuth configuration
    const requiredEnvVars = [
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL'
    ];

    let configValid = true;
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        error(`Auth: Missing ${envVar} environment variable`);
        configValid = false;
      }
    }

    if (configValid) {
      success('Auth: Configuration valid');
    }

    // Test NextAuth endpoints
    try {
      const csrfResponse = await testFetch(`${BASE_URL}/api/auth/csrf`);
      if (csrfResponse.ok) {
        success('Auth: CSRF endpoint working');
      } else {
        error('Auth: CSRF endpoint not responding');
        configValid = false;
      }
    } catch (err) {
      error(`Auth: CSRF endpoint failed - ${err.message}`);
      configValid = false;
    }

    return configValid;
  }

  async runAllTests() {
    log('\n🚀 Starting Backend-Frontend Connection Tests\n', 'bold');
    
    const tests = [
      { name: 'Database', test: () => this.testDatabase() },
      { name: 'Redis Cache', test: () => this.testRedis() },
      { name: 'API Endpoints', test: () => this.testAPIs() },
      { name: 'Authentication', test: () => this.testAuthFlow() },
      { name: 'Frontend Pages', test: () => this.testFrontend() }
    ];

    const results = [];
    
    for (const { name, test } of tests) {
      log(`\n📋 Testing ${name}...`, 'blue');
      const result = await test();
      results.push({ name, success: result });
    }

    // Summary
    log('\n📊 Test Summary:', 'bold');
    
    let totalSuccess = 0;
    results.forEach(({ name, success }) => {
      if (success) {
        success(`${name}: PASSED`);
        totalSuccess++;
      } else {
        error(`${name}: FAILED`);
      }
    });

    const overallSuccess = totalSuccess === results.length;
    
    log(`\n🎯 Overall Result: ${totalSuccess}/${results.length} tests passed`, 
        overallSuccess ? 'green' : 'red');

    if (overallSuccess) {
      success('\n🎉 All connections are working! Backend and frontend are properly connected.');
    } else {
      error('\n❌ Some connections failed. Check the errors above.');
      
      // Provide specific fixes
      log('\n🔧 Suggested fixes:', 'yellow');
      
      if (!this.results.database) {
        log('   • Run: node setup-database.js or execute database-setup.sql');
      }
      
      if (Object.values(this.results.apis).includes(false)) {
        log('   • Ensure the Next.js server is running: npm run dev');
      }
      
      if (!this.results.frontend) {
        log('   • Check if the development server is running on the correct port');
      }
    }

    return overallSuccess;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new ConnectionTester();
  
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      error(`Test runner failed: ${err.message}`);
      process.exit(1);
    });
}

module.exports = ConnectionTester;