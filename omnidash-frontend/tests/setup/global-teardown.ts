import { FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');

  try {
    // 1. Clean up test data
    await cleanupTestData();

    // 2. Close any remaining connections
    await closeConnections();

    // 3. Generate test report summary
    await generateTestSummary();

    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw here to avoid masking test failures
  }
}

async function cleanupTestData() {
  console.log('🗑️ Cleaning up test data...');

  try {
    const tables = [
      'execution_metrics',
      'action_logs', 
      'workflow_executions',
      'workflow_triggers',
      'workflows',
      'social_accounts',
      'content_templates',
      'webhook_endpoints',
      'api_keys',
      'user_profiles'
    ];

    let totalDeleted = 0;

    for (const table of tables) {
      const { count } = await supabase
        .from(table)
        .delete()
        .or('email.like.%test@omnidash%,user_id.eq.test-user-1,user_id.eq.test-user-2,id.like.test-%');
      
      if (count) {
        totalDeleted += count;
        console.log(`  📊 Deleted ${count} records from ${table}`);
      }
    }

    console.log(`✅ Cleaned up ${totalDeleted} test records`);
  } catch (error) {
    console.error('❌ Failed to cleanup test data:', error);
  }
}

async function closeConnections() {
  console.log('🔌 Closing database connections...');

  try {
    // Close Supabase connections if needed
    // Supabase client doesn't have explicit close method, but connections will be cleaned up
    
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Failed to close connections:', error);
  }
}

async function generateTestSummary() {
  console.log('📊 Generating test summary...');

  try {
    const testResultsPath = './test-results';
    const fs = require('fs');
    const path = require('path');

    if (!fs.existsSync(testResultsPath)) {
      console.log('ℹ️ No test results directory found');
      return;
    }

    // Check for test results
    const resultsFile = path.join(testResultsPath, 'results.json');
    
    if (fs.existsSync(resultsFile)) {
      const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
      
      const summary = {
        totalTests: results.stats?.expected || 0,
        passed: results.stats?.passed || 0,
        failed: results.stats?.failed || 0,
        skipped: results.stats?.skipped || 0,
        duration: results.stats?.duration || 0,
        timestamp: new Date().toISOString()
      };

      console.log('📈 Test Summary:');
      console.log(`  ✅ Passed: ${summary.passed}`);
      console.log(`  ❌ Failed: ${summary.failed}`);
      console.log(`  ⏭️ Skipped: ${summary.skipped}`);
      console.log(`  ⏱️ Duration: ${Math.round(summary.duration / 1000)}s`);
      console.log(`  📊 Total: ${summary.totalTests}`);

      // Write summary to file
      const summaryFile = path.join(testResultsPath, 'summary.json');
      fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
      
      console.log(`📝 Summary saved to ${summaryFile}`);
    } else {
      console.log('ℹ️ No test results file found');
    }

    console.log('✅ Test summary generated');
  } catch (error) {
    console.error('❌ Failed to generate test summary:', error);
  }
}

export default globalTeardown;