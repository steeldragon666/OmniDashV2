// Direct Supabase Database Setup
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  console.log('🔧 Setting up database with direct inserts...\n');
  
  try {
    // First, let's try to insert data directly to test if tables exist
    console.log('1. Testing workflows table...');
    
    // Try to create a test workflow
    const { data: testWorkflow, error: workflowError } = await supabase
      .from('workflows')
      .insert([{
        name: 'Test Workflow',
        description: 'A test workflow to verify database setup',
        user_id: 'test@example.com',
        status: 'active',
        definition: {
          nodes: [
            { id: '1', type: 'trigger', position: { x: 100, y: 100 }, data: { label: 'Start' } }
          ],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 }
        },
        triggers: ['manual'],
        tags: ['test']
      }])
      .select()
      .single();

    if (workflowError) {
      console.log('❌ Workflows table error:', workflowError.message);
      console.log('💡 Please run the SQL schema manually in Supabase dashboard');
      console.log('📝 Go to: https://supabase.com/dashboard/project/nihtacdpxhthgscpqfsc/editor');
      console.log('📋 Copy and paste the contents of supabase/schema.sql');
      return;
    } else {
      console.log('✅ Workflows table working! Created test workflow:', testWorkflow.id);
      
      // Clean up test workflow
      await supabase.from('workflows').delete().eq('id', testWorkflow.id);
      console.log('🧹 Test workflow cleaned up');
    }

    // Create sample data
    console.log('\n2. Creating sample workflows...');
    const { data: workflows, error: insertError } = await supabase
      .from('workflows')
      .insert([
        {
          name: 'Content Generation Pipeline',
          description: 'Automated content creation and social media posting',
          user_id: 'demo@example.com',
          status: 'active',
          definition: {
            nodes: [
              { id: '1', type: 'trigger', position: { x: 100, y: 100 }, data: { label: 'Schedule Trigger' }},
              { id: '2', type: 'action', position: { x: 300, y: 100 }, data: { label: 'Generate Content' }},
              { id: '3', type: 'action', position: { x: 500, y: 100 }, data: { label: 'Post to Social' }}
            ],
            edges: [
              { id: 'e1-2', source: '1', target: '2' },
              { id: 'e2-3', source: '2', target: '3' }
            ],
            viewport: { x: 0, y: 0, zoom: 1 }
          },
          triggers: ['schedule'],
          tags: ['content', 'social', 'automation']
        },
        {
          name: 'Social Media Scheduler',
          description: 'Schedule and post content across multiple platforms',
          user_id: 'demo@example.com',
          status: 'draft',
          definition: {
            nodes: [
              { id: '1', type: 'trigger', position: { x: 100, y: 100 }, data: { label: 'Manual Trigger' }},
              { id: '2', type: 'action', position: { x: 300, y: 100 }, data: { label: 'Schedule Post' }}
            ],
            edges: [{ id: 'e1-2', source: '1', target: '2' }],
            viewport: { x: 0, y: 0, zoom: 1 }
          },
          triggers: ['manual'],
          tags: ['social', 'scheduling']
        },
        {
          name: 'Email Campaign Automation',
          description: 'Automated email campaigns with analytics tracking',
          user_id: 'demo@example.com',
          status: 'active',
          definition: {
            nodes: [
              { id: '1', type: 'trigger', position: { x: 100, y: 100 }, data: { label: 'Email Trigger' }},
              { id: '2', type: 'action', position: { x: 300, y: 100 }, data: { label: 'Send Campaign' }},
              { id: '3', type: 'action', position: { x: 500, y: 100 }, data: { label: 'Track Analytics' }}
            ],
            edges: [
              { id: 'e1-2', source: '1', target: '2' },
              { id: 'e2-3', source: '2', target: '3' }
            ],
            viewport: { x: 0, y: 0, zoom: 1 }
          },
          triggers: ['email', 'schedule'],
          tags: ['email', 'automation', 'analytics']
        },
        {
          name: 'Lead Generation Bot',
          description: 'Automated lead generation and qualification system',
          user_id: 'demo@example.com',
          status: 'paused',
          definition: {
            nodes: [
              { id: '1', type: 'trigger', position: { x: 100, y: 100 }, data: { label: 'Webhook Trigger' }},
              { id: '2', type: 'action', position: { x: 300, y: 100 }, data: { label: 'Qualify Lead' }},
              { id: '3', type: 'condition', position: { x: 500, y: 100 }, data: { label: 'Check Score' }},
              { id: '4', type: 'action', position: { x: 700, y: 50 }, data: { label: 'Send to Sales' }},
              { id: '5', type: 'action', position: { x: 700, y: 150 }, data: { label: 'Nurture Campaign' }}
            ],
            edges: [
              { id: 'e1-2', source: '1', target: '2' },
              { id: 'e2-3', source: '2', target: '3' },
              { id: 'e3-4', source: '3', target: '4', label: 'High Score' },
              { id: 'e3-5', source: '3', target: '5', label: 'Low Score' }
            ],
            viewport: { x: 0, y: 0, zoom: 0.8 }
          },
          triggers: ['webhook'],
          tags: ['leads', 'sales', 'crm']
        },
        {
          name: 'Customer Onboarding Flow',
          description: 'Automated customer onboarding with personalized touchpoints',
          user_id: 'demo@example.com',
          status: 'active',
          definition: {
            nodes: [
              { id: '1', type: 'trigger', position: { x: 100, y: 100 }, data: { label: 'New User Signup' }},
              { id: '2', type: 'action', position: { x: 300, y: 100 }, data: { label: 'Welcome Email' }},
              { id: '3', type: 'delay', position: { x: 500, y: 100 }, data: { label: 'Wait 1 Day' }},
              { id: '4', type: 'action', position: { x: 700, y: 100 }, data: { label: 'Tutorial Email' }},
              { id: '5', type: 'delay', position: { x: 900, y: 100 }, data: { label: 'Wait 3 Days' }},
              { id: '6', type: 'action', position: { x: 1100, y: 100 }, data: { label: 'Follow-up Survey' }}
            ],
            edges: [
              { id: 'e1-2', source: '1', target: '2' },
              { id: 'e2-3', source: '2', target: '3' },
              { id: 'e3-4', source: '3', target: '4' },
              { id: 'e4-5', source: '4', target: '5' },
              { id: 'e5-6', source: '5', target: '6' }
            ],
            viewport: { x: 0, y: 0, zoom: 0.6 }
          },
          triggers: ['user_signup'],
          tags: ['onboarding', 'email', 'customer-success']
        }
      ])
      .select();

    if (insertError) {
      console.log('❌ Failed to insert workflows:', insertError.message);
    } else {
      console.log(`✅ Created ${workflows.length} sample workflows`);

      // Create workflow executions for the first workflow
      if (workflows.length > 0) {
        console.log('\n3. Creating sample executions...');
        const { error: execError } = await supabase
          .from('workflow_executions')
          .insert([
            {
              workflow_id: workflows[0].id,
              user_id: 'demo@example.com',
              status: 'completed',
              input_data: { trigger: 'schedule', posts_to_create: 5 },
              output_data: { posts_created: 5, platforms: ['twitter', 'linkedin'], success_rate: 100 },
              started_at: new Date(Date.now() - 7200000).toISOString(),
              completed_at: new Date(Date.now() - 6900000).toISOString(),
              duration_ms: 300000,
              trigger_type: 'schedule'
            },
            {
              workflow_id: workflows[0].id,
              user_id: 'demo@example.com',
              status: 'completed',
              input_data: { trigger: 'schedule', posts_to_create: 3 },
              output_data: { posts_created: 3, platforms: ['twitter', 'facebook'], success_rate: 100 },
              started_at: new Date(Date.now() - 3600000).toISOString(),
              completed_at: new Date(Date.now() - 3300000).toISOString(),
              duration_ms: 300000,
              trigger_type: 'schedule'
            },
            {
              workflow_id: workflows[1].id,
              user_id: 'demo@example.com',
              status: 'failed',
              input_data: { content: 'Manual post test' },
              error_message: 'Twitter API rate limit exceeded',
              started_at: new Date(Date.now() - 1800000).toISOString(),
              completed_at: new Date(Date.now() - 1500000).toISOString(),
              duration_ms: 300000,
              trigger_type: 'manual'
            },
            {
              workflow_id: workflows[2].id,
              user_id: 'demo@example.com',
              status: 'completed',
              input_data: { campaign: 'newsletter_signup' },
              output_data: { emails_sent: 1250, open_rate: 24.5, click_rate: 3.2 },
              started_at: new Date(Date.now() - 86400000).toISOString(),
              completed_at: new Date(Date.now() - 86100000).toISOString(),
              duration_ms: 300000,
              trigger_type: 'schedule'
            }
          ]);

        if (execError) {
          console.log('⚠️ Failed to insert executions:', execError.message);
        } else {
          console.log('✅ Created sample executions');
        }
      }
    }

    // Create social posts
    console.log('\n4. Creating sample social posts...');
    const { error: socialError } = await supabase
      .from('social_posts')
      .insert([
        {
          user_id: 'demo@example.com',
          content: '🚀 Excited to announce our new automation platform! Streamline your workflows and boost productivity. #automation #productivity',
          platforms: ['twitter', 'linkedin'],
          status: 'published',
          published_at: new Date(Date.now() - 86400000).toISOString(),
          engagement_data: { likes: 45, shares: 12, comments: 8, reach: 2340 }
        },
        {
          user_id: 'demo@example.com',
          content: '📊 Our latest report shows 40% increase in efficiency when using automated workflows. What\'s your experience with automation?',
          platforms: ['linkedin', 'facebook'],
          status: 'published',
          published_at: new Date(Date.now() - 172800000).toISOString(),
          engagement_data: { likes: 67, shares: 23, comments: 15, reach: 4560 }
        },
        {
          user_id: 'demo@example.com',
          content: '🎯 Pro tip: Start small with automation. Pick one repetitive task and automate it first. Then gradually expand your automated processes.',
          platforms: ['twitter'],
          status: 'published',
          published_at: new Date(Date.now() - 259200000).toISOString(),
          engagement_data: { likes: 78, shares: 34, comments: 12, reach: 3240 }
        },
        {
          user_id: 'demo@example.com',
          content: '🔔 Upcoming webinar: "Advanced Workflow Automation Strategies" - Join us next Tuesday at 2 PM EST. Register now!',
          platforms: ['linkedin', 'facebook', 'twitter'],
          status: 'scheduled',
          scheduled_at: new Date(Date.now() + 43200000).toISOString()
        },
        {
          user_id: 'demo@example.com',
          content: '💡 Feature spotlight: Our new AI-powered content generation can create personalized posts for multiple platforms simultaneously.',
          platforms: ['linkedin'],
          status: 'draft'
        }
      ]);

    if (socialError) {
      console.log('⚠️ Failed to insert social posts:', socialError.message);
    } else {
      console.log('✅ Created sample social posts');
    }

    // Create social accounts
    console.log('\n5. Creating sample social accounts...');
    const { error: accountError } = await supabase
      .from('social_accounts')
      .insert([
        {
          user_id: 'demo@example.com',
          platform: 'twitter',
          account_name: '@OmniDashAI',
          account_id: 'omnidash_ai',
          is_active: true,
          profile_data: { followers: 8420, following: 234, verified: false }
        },
        {
          user_id: 'demo@example.com',
          platform: 'linkedin',
          account_name: 'OmniDash Automation',
          account_id: 'omnidash-automation',
          is_active: true,
          profile_data: { connections: 2340, followers: 5670, company: 'OmniDash Inc.' }
        },
        {
          user_id: 'demo@example.com',
          platform: 'facebook',
          account_name: 'OmniDash',
          account_id: 'omnidash.official',
          is_active: true,
          profile_data: { likes: 1560, followers: 1890 }
        }
      ]);

    if (accountError) {
      console.log('⚠️ Failed to insert social accounts:', accountError.message);
    } else {
      console.log('✅ Created sample social accounts');
    }

    console.log('\n🎉 Database setup completed successfully!');
    
    // Show summary
    const { count: workflowCount } = await supabase.from('workflows').select('*', { count: 'exact', head: true });
    const { count: executionCount } = await supabase.from('workflow_executions').select('*', { count: 'exact', head: true });
    const { count: postCount } = await supabase.from('social_posts').select('*', { count: 'exact', head: true });
    const { count: accountCount } = await supabase.from('social_accounts').select('*', { count: 'exact', head: true });

    console.log('\n📊 Database Summary:');
    console.log(`   Workflows: ${workflowCount || 0}`);
    console.log(`   Executions: ${executionCount || 0}`);
    console.log(`   Social Posts: ${postCount || 0}`);
    console.log(`   Social Accounts: ${accountCount || 0}`);

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\n💡 If tables don\'t exist, please:');
    console.log('1. Go to https://supabase.com/dashboard/project/nihtacdpxhthgscpqfsc/editor');
    console.log('2. Copy and paste the contents of supabase/schema.sql');
    console.log('3. Run this script again');
  }
}

setupDatabase();