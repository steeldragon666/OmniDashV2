import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for E2E tests...');
  
  const { baseURL } = config.projects[0].use;
  
  if (!baseURL) {
    throw new Error('BaseURL is not configured');
  }
  
  // Launch browser for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for the server to be ready
    console.log(`⏳ Waiting for server at ${baseURL}...`);
    
    let retries = 0;
    const maxRetries = 30;
    
    while (retries < maxRetries) {
      try {
        const response = await page.goto(`${baseURL}/api/health`);
        if (response?.ok()) {
          console.log('✅ Server is ready!');
          break;
        }
      } catch (error) {
        // Server not ready yet
      }
      
      retries++;
      await page.waitForTimeout(2000);
      
      if (retries === maxRetries) {
        throw new Error(`Server at ${baseURL} is not ready after ${maxRetries * 2} seconds`);
      }
    }
    
    // Seed test data if needed
    console.log('🌱 Seeding test data...');
    
    // Create test user session for authenticated tests
    await page.route('/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user-123',
            email: 'test@omnidash.dev',
            name: 'Test User',
            image: null
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
      });
    });
    
    // Create test workflows
    await page.route('/api/automation/workflows', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            workflows: [
              {
                id: 'test-workflow-1',
                name: 'Test Email Workflow',
                description: 'Automated email notifications for testing',
                status: 'active',
                created_at: '2024-01-01T10:00:00Z',
                updated_at: '2024-01-01T10:00:00Z',
                last_run: '2024-01-15T09:00:00Z',
                next_run: '2024-01-16T09:00:00Z',
                executions: 25,
                success_rate: 0.96
              },
              {
                id: 'test-workflow-2',
                name: 'Test Data Backup',
                description: 'Automated data backup for testing',
                status: 'paused',
                created_at: '2024-01-02T14:00:00Z',
                updated_at: '2024-01-10T16:30:00Z',
                last_run: '2024-01-14T02:00:00Z',
                next_run: null,
                executions: 8,
                success_rate: 1.0
              }
            ],
            pagination: {
              page: 1,
              limit: 10,
              total: 2,
              totalPages: 1
            }
          })
        });
      }
    });
    
    // Set up dashboard stats mock
    await page.route('/api/dashboard/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalWorkflows: 15,
          activeWorkflows: 12,
          pausedWorkflows: 3,
          completedExecutions: 234,
          failedExecutions: 8,
          successRate: 0.967,
          recentActivity: [
            {
              id: 'activity-1',
              type: 'workflow_completed',
              message: 'Daily report workflow completed successfully',
              timestamp: '2024-01-15T10:30:00Z',
              workflowId: 'test-workflow-1'
            },
            {
              id: 'activity-2',
              type: 'workflow_started',
              message: 'Data sync workflow started',
              timestamp: '2024-01-15T10:15:00Z',
              workflowId: 'test-workflow-2'
            },
            {
              id: 'activity-3',
              type: 'workflow_failed',
              message: 'Email notification workflow failed',
              timestamp: '2024-01-15T09:45:00Z',
              workflowId: 'test-workflow-3'
            }
          ]
        })
      });
    });
    
    console.log('✅ Test data seeded successfully');
    
    // Verify critical pages load
    console.log('🔍 Verifying critical pages...');
    
    const criticalPages = ['/', '/dashboard', '/workflows', '/auth/login'];
    
    for (const pagePath of criticalPages) {
      try {
        const response = await page.goto(`${baseURL}${pagePath}`);
        if (!response?.ok()) {
          throw new Error(`Page ${pagePath} returned ${response?.status()}`);
        }
        console.log(`✅ ${pagePath} is accessible`);
      } catch (error) {
        console.error(`❌ Failed to load ${pagePath}:`, error);
        throw error;
      }
    }
    
    // Store authentication state for tests that need it
    await page.context().storageState({ path: 'tests/auth-state.json' });
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;