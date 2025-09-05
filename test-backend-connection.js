#!/usr/bin/env node

/**
 * OmniDash Backend Connection Test
 * Tests if the frontend is properly connected to the backend/database
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  // Test URLs - update these to match your deployment
  local: {
    frontend: 'http://localhost:3000',
    backend: 'http://localhost:3001'
  },
  production: {
    frontend: 'https://omnidash-frontend.vercel.app',
    backend: 'https://omnidash-backend.vercel.app'
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData,
            headers: res.headers
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers,
            parseError: error.message
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testEndpoint(name, url, expectedData = null) {
  try {
    log(`\n🔍 Testing ${name}...`, 'cyan');
    log(`   URL: ${url}`, 'blue');
    
    const response = await makeRequest(url);
    
    if (response.status >= 200 && response.status < 300) {
      log(`   ✅ Status: ${response.status}`, 'green');
      
      if (expectedData) {
        const hasExpectedData = checkForExpectedData(response.data, expectedData);
        if (hasExpectedData) {
          log(`   ✅ Contains expected data`, 'green');
        } else {
          log(`   ⚠️  Using fallback/mock data`, 'yellow');
        }
      }
      
      return { success: true, response };
    } else {
      log(`   ❌ Status: ${response.status}`, 'red');
      return { success: false, response };
    }
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

function checkForExpectedData(data, expectedData) {
  // Check if the response contains real data vs mock data
  if (expectedData === 'dashboard-stats') {
    // Check for signs of mock data
    const stats = data.stats;
    if (stats && stats.workflows && stats.workflows.total === 12) {
      return false; // This is likely mock data
    }
    return true;
  }
  
  if (expectedData === 'workflows') {
    // Check if workflows array exists and has real data
    return Array.isArray(data.workflows) && data.workflows.length > 0;
  }
  
  return true;
}

async function testBackendConnection(environment = 'local') {
  const env = config[environment];
  
  log(`\n🚀 Testing OmniDash Backend Connection (${environment.toUpperCase()})`, 'bright');
  log('=' .repeat(60), 'cyan');
  
  const tests = [
    {
      name: 'Frontend Health Check',
      url: `${env.frontend}/api/health`,
      expectedData: null
    },
    {
      name: 'Dashboard Stats (Real Data Test)',
      url: `${env.frontend}/api/dashboard/stats?test=true`,
      expectedData: 'dashboard-stats'
    },
    {
      name: 'Workflows API',
      url: `${env.frontend}/api/automation/workflows`,
      expectedData: 'workflows'
    },
    {
      name: 'Social Accounts API',
      url: `${env.frontend}/api/social/accounts`,
      expectedData: null
    },
    {
      name: 'AI Claude API',
      url: `${env.frontend}/api/ai/claude`,
      expectedData: null
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await testEndpoint(test.name, test.url, test.expectedData);
    results.push({ ...test, result });
  }
  
  // Summary
  log('\n📊 Test Results Summary', 'bright');
  log('=' .repeat(40), 'cyan');
  
  const successful = results.filter(r => r.result.success).length;
  const total = results.length;
  
  results.forEach(test => {
    const status = test.result.success ? '✅' : '❌';
    const dataStatus = test.expectedData && test.result.success ? 
      (checkForExpectedData(test.result.response?.data, test.expectedData) ? '📊' : '🎭') : '';
    
    log(`${status} ${test.name} ${dataStatus}`, test.result.success ? 'green' : 'red');
  });
  
  log(`\n🎯 Overall: ${successful}/${total} tests passed`, successful === total ? 'green' : 'yellow');
  
  // Backend Connection Status
  log('\n🔗 Backend Connection Status', 'bright');
  log('=' .repeat(30), 'cyan');
  
  const dashboardTest = results.find(r => r.name.includes('Dashboard Stats'));
  if (dashboardTest && dashboardTest.result.success) {
    const isRealData = checkForExpectedData(dashboardTest.result.response.data, 'dashboard-stats');
    if (isRealData) {
      log('✅ Backend is CONNECTED - Using real database data', 'green');
    } else {
      log('⚠️  Backend is PARTIALLY CONNECTED - Using fallback data', 'yellow');
      log('   This means the API is working but database connection may be limited', 'yellow');
    }
  } else {
    log('❌ Backend is NOT CONNECTED - API endpoints failing', 'red');
  }
  
  // Recommendations
  log('\n💡 Recommendations', 'bright');
  log('=' .repeat(20), 'cyan');
  
  if (successful < total) {
    log('🔧 To fix connection issues:', 'yellow');
    log('   1. Check if services are running (pnpm dev:all)', 'blue');
    log('   2. Verify environment variables are set', 'blue');
    log('   3. Check database connection (Supabase)', 'blue');
    log('   4. Review API endpoint implementations', 'blue');
  }
  
  if (dashboardTest && dashboardTest.result.success && 
      !checkForExpectedData(dashboardTest.result.response.data, 'dashboard-stats')) {
    log('🔑 To enable real data:', 'yellow');
    log('   1. Set SUPABASE_SERVICE_ROLE_KEY in environment', 'blue');
    log('   2. Create database tables in Supabase', 'blue');
    log('   3. Deploy with correct environment variables', 'blue');
  }
  
  return results;
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const environment = args[0] || 'local';
  
  if (!config[environment]) {
    log(`❌ Invalid environment: ${environment}`, 'red');
    log('Available environments: local, production', 'yellow');
    process.exit(1);
  }
  
  try {
    await testBackendConnection(environment);
  } catch (error) {
    log(`❌ Test failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { testBackendConnection, makeRequest };
