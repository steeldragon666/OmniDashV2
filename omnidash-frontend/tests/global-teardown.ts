import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for E2E tests...');
  
  try {
    // Clean up authentication state file
    const authStatePath = 'tests/auth-state.json';
    if (fs.existsSync(authStatePath)) {
      fs.unlinkSync(authStatePath);
      console.log('✅ Authentication state cleaned up');
    }
    
    // Clean up any temporary test files
    const tempDir = 'tests/temp';
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('✅ Temporary files cleaned up');
    }
    
    // Clean up test artifacts if not in CI (to preserve for debugging)
    if (!process.env.CI) {
      const artifactsDir = 'test-results';
      if (fs.existsSync(artifactsDir)) {
        // Keep the latest test results but clean up older ones
        const entries = fs.readdirSync(artifactsDir, { withFileTypes: true });
        const directories = entries
          .filter(entry => entry.isDirectory())
          .map(entry => ({
            name: entry.name,
            path: path.join(artifactsDir, entry.name),
            time: fs.statSync(path.join(artifactsDir, entry.name)).mtime
          }))
          .sort((a, b) => b.time.getTime() - a.time.getTime());
        
        // Keep the 3 most recent test runs
        const toDelete = directories.slice(3);
        toDelete.forEach(dir => {
          fs.rmSync(dir.path, { recursive: true, force: true });
        });
        
        if (toDelete.length > 0) {
          console.log(`✅ Cleaned up ${toDelete.length} old test result directories`);
        }
      }
    }
    
    // Log test summary if available
    const resultsFile = 'test-results/results.json';
    if (fs.existsSync(resultsFile)) {
      try {
        const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
        console.log('📊 Test Summary:');
        console.log(`   Total tests: ${results.stats?.total || 'N/A'}`);
        console.log(`   Passed: ${results.stats?.passed || 'N/A'}`);
        console.log(`   Failed: ${results.stats?.failed || 'N/A'}`);
        console.log(`   Skipped: ${results.stats?.skipped || 'N/A'}`);
        console.log(`   Duration: ${results.stats?.duration || 'N/A'}ms`);
      } catch (error) {
        console.log('Could not parse test results for summary');
      }
    }
    
    // Reset any environment modifications
    delete process.env.PLAYWRIGHT_TEST_MODE;
    
    console.log('✅ Global teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw the error to avoid masking test failures
  }
}

export default globalTeardown;