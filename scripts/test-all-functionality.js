#!/usr/bin/env node

/**
 * Comprehensive Test Runner for OmniDashV2 Enterprise AI Training Hub
 * Tests all button functionality and UI interactions
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Comprehensive Functionality Tests for OmniDashV2...\n');

// Test configuration
const testConfig = {
  unit: {
    command: 'npm run test:unit',
    description: 'Unit Tests',
    timeout: 30000
  },
  integration: {
    command: 'npm run test:integration', 
    description: 'Integration Tests',
    timeout: 60000
  },
  e2e: {
    command: 'npm run test:e2e',
    description: 'End-to-End Tests',
    timeout: 120000
  },
  lint: {
    command: 'npm run lint',
    description: 'Code Linting',
    timeout: 15000
  }
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

/**
 * Run a single test suite
 */
function runTest(testName, config) {
  console.log(`\n📋 Running ${config.description}...`);
  console.log(`⏱️  Timeout: ${config.timeout / 1000}s`);
  
  try {
    const startTime = Date.now();
    execSync(config.command, { 
      stdio: 'inherit', 
      timeout: config.timeout,
      cwd: process.cwd()
    });
    const duration = Date.now() - startTime;
    
    console.log(`✅ ${config.description} PASSED (${duration}ms)`);
    results.passed++;
    results.details.push({
      test: testName,
      status: 'PASSED',
      duration: duration
    });
    
  } catch (error) {
    console.log(`❌ ${config.description} FAILED`);
    console.log(`Error: ${error.message}`);
    results.failed++;
    results.details.push({
      test: testName,
      status: 'FAILED',
      error: error.message
    });
  }
  
  results.total++;
}

/**
 * Check if required files exist
 */
function checkRequiredFiles() {
  console.log('🔍 Checking required files...');
  
  const requiredFiles = [
    'components/toolsets/EnterpriseAITrainingHub.tsx',
    'lib/api/enterprise-ai.ts',
    'lib/types/enterprise-ai.ts',
    'lib/constants/enterprise-ai.ts',
    'app/api/training/optimize/route.ts',
    'app/api/training/start/route.ts',
    'app/api/training/status/[jobId]/route.ts',
    'tests/unit/EnterpriseAITrainingHub.test.tsx',
    'tests/integration/button-functionality.test.tsx',
    'tests/e2e/enterprise-ai-workflow.spec.ts'
  ];
  
  const missingFiles = [];
  
  requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      missingFiles.push(file);
    }
  });
  
  if (missingFiles.length > 0) {
    console.log('❌ Missing required files:');
    missingFiles.forEach(file => console.log(`   - ${file}`));
    return false;
  }
  
  console.log('✅ All required files present');
  return true;
}

/**
 * Check directory structure
 */
function checkDirectoryStructure() {
  console.log('📁 Checking directory structure...');
  
  const requiredDirs = [
    'public/images',
    'public/icons',
    'public/fonts',
    'public/assets',
    'components/layout',
    'components/modals',
    'components/forms',
    'components/navigation',
    'app/api/training',
    'app/api/analytics',
    'app/api/workflows',
    'tests/unit',
    'tests/integration',
    'tests/e2e',
    'tests/fixtures',
    'lib/api',
    'lib/utils',
    'lib/constants',
    'lib/types',
    'styles/components',
    'styles/pages',
    'styles/globals',
    'config',
    'middleware',
    'providers',
    'contexts',
    'data',
    'templates',
    'scripts',
    'docs/api'
  ];
  
  const missingDirs = [];
  
  requiredDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      missingDirs.push(dir);
    }
  });
  
  if (missingDirs.length > 0) {
    console.log('❌ Missing required directories:');
    missingDirs.forEach(dir => console.log(`   - ${dir}`));
    return false;
  }
  
  console.log('✅ All required directories present');
  return true;
}

/**
 * Generate test report
 */
function generateReport() {
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.details
      .filter(detail => detail.status === 'FAILED')
      .forEach(detail => {
        console.log(`   - ${detail.test}: ${detail.error}`);
      });
  }
  
  console.log('\n📋 DETAILED RESULTS:');
  results.details.forEach(detail => {
    const status = detail.status === 'PASSED' ? '✅' : '❌';
    const duration = detail.duration ? ` (${detail.duration}ms)` : '';
    console.log(`   ${status} ${detail.test}${duration}`);
  });
  
  // Save report to file
  const reportPath = 'test-results.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      successRate: (results.passed / results.total) * 100
    },
    details: results.details
  }, null, 2));
  
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
}

/**
 * Main test execution
 */
async function main() {
  try {
    // Pre-flight checks
    if (!checkRequiredFiles()) {
      console.log('\n❌ Pre-flight checks failed. Please ensure all required files exist.');
      process.exit(1);
    }
    
    if (!checkDirectoryStructure()) {
      console.log('\n❌ Directory structure check failed. Please ensure all required directories exist.');
      process.exit(1);
    }
    
    console.log('\n✅ Pre-flight checks passed. Starting tests...\n');
    
    // Run all test suites
    Object.entries(testConfig).forEach(([testName, config]) => {
      runTest(testName, config);
    });
    
    // Generate final report
    generateReport();
    
    // Exit with appropriate code
    if (results.failed > 0) {
      console.log('\n❌ Some tests failed. Please review the results above.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed! OmniDashV2 is ready for production.');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n💥 Test runner encountered an error:', error.message);
    process.exit(1);
  }
}

// Run the tests
main();
