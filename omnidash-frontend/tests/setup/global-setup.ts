import { chromium, FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function globalSetup(config: FullConfig) {
  console.log('🔧 Starting global test setup...');

  try {
    // 1. Setup test database
    await setupTestDatabase();

    // 2. Create test user accounts
    await createTestUsers();

    // 3. Setup test data
    await seedTestData();

    // 4. Verify application is running
    await verifyAppRunning(config.projects[0].use.baseURL || 'http://localhost:3001');

    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

async function setupTestDatabase() {
  console.log('📊 Setting up test database...');

  try {
    // Clean up existing test data
    const tables = [
      'workflow_executions',
      'workflow_triggers', 
      'workflows',
      'social_accounts',
      'content_templates',
      'webhook_endpoints',
      'api_keys',
      'user_profiles'
    ];

    for (const table of tables) {
      await supabase
        .from(table)
        .delete()
        .like('email', '%test@omnidash%');
    }

    console.log('✅ Test database cleaned');
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  }
}

async function createTestUsers() {
  console.log('👤 Creating test users...');

  const testUsers = [
    {
      id: 'test-user-1',
      email: 'testuser1@omnidash.test',
      full_name: 'Test User One',
      workspace_name: 'Test Workspace 1'
    },
    {
      id: 'test-user-2', 
      email: 'testuser2@omnidash.test',
      full_name: 'Test User Two',
      workspace_name: 'Test Workspace 2'
    }
  ];

  try {
    for (const user of testUsers) {
      await supabase
        .from('user_profiles')
        .upsert(user, { onConflict: 'id' });
    }

    console.log('✅ Test users created');
  } catch (error) {
    console.error('❌ Failed to create test users:', error);
    throw error;
  }
}

async function seedTestData() {
  console.log('🌱 Seeding test data...');

  try {
    // Create test workflows
    const testWorkflows = [
      {
        id: 'test-workflow-1',
        user_id: 'test-user-1',
        name: 'Test Daily Social Post',
        description: 'Test workflow for daily social media posting',
        definition: {
          nodes: [
            {
              id: 'trigger-1',
              type: 'time_trigger',
              data: { cron: '0 9 * * *' },
              position: { x: 100, y: 100 }
            },
            {
              id: 'action-1', 
              type: 'social_post',
              data: { platforms: ['twitter'], content: 'Good morning!' },
              position: { x: 400, y: 100 }
            }
          ],
          connections: [
            {
              id: 'conn-1',
              sourceNodeId: 'trigger-1',
              targetNodeId: 'action-1'
            }
          ]
        },
        status: 'active'
      },
      {
        id: 'test-workflow-2',
        user_id: 'test-user-1', 
        name: 'Test Email Notification',
        description: 'Test workflow for email notifications',
        definition: {
          nodes: [
            {
              id: 'webhook-1',
              type: 'webhook_trigger',
              data: { path: '/test-webhook' },
              position: { x: 100, y: 100 }
            },
            {
              id: 'email-1',
              type: 'send_email', 
              data: { 
                to: 'test@example.com',
                subject: 'Test Notification',
                body: 'This is a test email'
              },
              position: { x: 400, y: 100 }
            }
          ],
          connections: [
            {
              id: 'conn-1',
              sourceNodeId: 'webhook-1',
              targetNodeId: 'email-1'
            }
          ]
        },
        status: 'draft'
      }
    ];

    for (const workflow of testWorkflows) {
      await supabase
        .from('workflows')
        .upsert(workflow, { onConflict: 'id' });
    }

    // Create test social accounts
    const testSocialAccounts = [
      {
        id: 'test-social-1',
        user_id: 'test-user-1',
        platform: 'twitter',
        account_name: 'testtwitteruser',
        account_id: 'twitter123',
        status: 'active'
      },
      {
        id: 'test-social-2',
        user_id: 'test-user-1',
        platform: 'facebook', 
        account_name: 'Test Facebook Page',
        account_id: 'facebook456',
        status: 'active'
      }
    ];

    for (const account of testSocialAccounts) {
      await supabase
        .from('social_accounts')
        .upsert(account, { onConflict: 'id' });
    }

    // Create test executions
    const testExecutions = [
      {
        id: 'test-execution-1',
        workflow_id: 'test-workflow-1',
        user_id: 'test-user-1',
        status: 'completed',
        trigger_type: 'time',
        context: {},
        result: { success: true, message: 'Post published successfully' },
        started_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        completed_at: new Date(Date.now() - 3540000).toISOString(), // 59 minutes ago
        duration_ms: 60000,
        nodes_executed: 2,
        nodes_total: 2
      },
      {
        id: 'test-execution-2',
        workflow_id: 'test-workflow-1',
        user_id: 'test-user-1',
        status: 'running',
        trigger_type: 'time',
        context: {},
        started_at: new Date().toISOString(),
        nodes_executed: 1,
        nodes_total: 2
      }
    ];

    for (const execution of testExecutions) {
      await supabase
        .from('workflow_executions')
        .upsert(execution, { onConflict: 'id' });
    }

    console.log('✅ Test data seeded');
  } catch (error) {
    console.error('❌ Failed to seed test data:', error);
    throw error;
  }
}

async function verifyAppRunning(baseURL: string) {
  console.log(`🌐 Verifying application is running at ${baseURL}...`);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the app to be ready
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    
    // Check if the app loads correctly
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Verify basic functionality
    const title = await page.title();
    console.log(`📄 App title: ${title}`);

    console.log('✅ Application is running');
  } catch (error) {
    console.error('❌ Application verification failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;