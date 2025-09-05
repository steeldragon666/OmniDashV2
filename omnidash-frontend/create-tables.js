// Create Supabase Tables Manually
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTables() {
  console.log('🏗️ Creating database tables...\n');
  
  try {
    // Create user_profiles table
    console.log('1. Creating user_profiles table...');
    const userProfilesSQL = `
      CREATE TABLE IF NOT EXISTS public.user_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        avatar_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    await supabase.rpc('exec_sql', { sql: userProfilesSQL });

    // Create workflows table
    console.log('2. Creating workflows table...');
    const workflowsSQL = `
      CREATE TABLE IF NOT EXISTS public.workflows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        user_id TEXT NOT NULL,
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
        definition JSONB NOT NULL DEFAULT '{"nodes": [], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 1}}',
        triggers TEXT[] DEFAULT ARRAY[]::TEXT[],
        variables JSONB DEFAULT '{}',
        settings JSONB DEFAULT '{"errorHandling": "stop", "timeout": 30000, "retryOnFailure": false, "maxRetries": 3}',
        tags TEXT[] DEFAULT ARRAY[]::TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    await supabase.rpc('exec_sql', { sql: workflowsSQL });

    // Create workflow_executions table
    console.log('3. Creating workflow_executions table...');
    const executionsSQL = `
      CREATE TABLE IF NOT EXISTS public.workflow_executions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
        input_data JSONB DEFAULT '{}',
        output_data JSONB DEFAULT '{}',
        error_message TEXT,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE,
        duration_ms INTEGER,
        trigger_type TEXT,
        trigger_data JSONB DEFAULT '{}',
        execution_logs JSONB[] DEFAULT ARRAY[]::JSONB[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    await supabase.rpc('exec_sql', { sql: executionsSQL });

    // Create social_accounts table
    console.log('4. Creating social_accounts table...');
    const socialAccountsSQL = `
      CREATE TABLE IF NOT EXISTS public.social_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        platform TEXT NOT NULL CHECK (platform IN ('twitter', 'linkedin', 'instagram', 'facebook', 'youtube', 'tiktok')),
        account_name TEXT NOT NULL,
        account_id TEXT,
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true,
        profile_data JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, platform, account_id)
      );
    `;
    await supabase.rpc('exec_sql', { sql: socialAccountsSQL });

    // Create social_posts table
    console.log('5. Creating social_posts table...');
    const socialPostsSQL = `
      CREATE TABLE IF NOT EXISTS public.social_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        media_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
        platforms TEXT[] NOT NULL,
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
        scheduled_at TIMESTAMP WITH TIME ZONE,
        published_at TIMESTAMP WITH TIME ZONE,
        engagement_data JSONB DEFAULT '{}',
        workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    await supabase.rpc('exec_sql', { sql: socialPostsSQL });

    // Insert sample data
    console.log('6. Inserting sample data...');
    const { error: insertError } = await supabase
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
              { id: '2', type: 'action', position: { x: 300, y: 100 }, data: { label: 'Generate Content' }}
            ],
            edges: [{ id: 'e1-2', source: '1', target: '2' }],
            viewport: { x: 0, y: 0, zoom: 1 }
          },
          triggers: ['schedule'],
          tags: ['content', 'social']
        },
        {
          name: 'Social Media Scheduler',
          description: 'Schedule and post content across multiple platforms',
          user_id: 'demo@example.com',
          status: 'draft',
          definition: {
            nodes: [{ id: '1', type: 'trigger', position: { x: 100, y: 100 }, data: { label: 'Manual Trigger' }}],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 }
          },
          triggers: ['manual'],
          tags: ['social', 'scheduling']
        },
        {
          name: 'Email Automation',
          description: 'Automated email campaigns and responses',
          user_id: 'demo@example.com',
          status: 'active',
          definition: {
            nodes: [{ id: '1', type: 'trigger', position: { x: 100, y: 100 }, data: { label: 'Email Trigger' }}],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 }
          },
          triggers: ['email'],
          tags: ['email', 'automation']
        }
      ]);

    if (insertError) {
      console.log('⚠️ Sample data insertion failed:', insertError.message);
    } else {
      console.log('✅ Sample workflows inserted');
    }

    // Add some workflow executions
    const { data: workflows } = await supabase.from('workflows').select('id').limit(1);
    if (workflows && workflows.length > 0) {
      await supabase.from('workflow_executions').insert([
        {
          workflow_id: workflows[0].id,
          user_id: 'demo@example.com',
          status: 'completed',
          input_data: {},
          output_data: { posts_created: 3 },
          started_at: new Date(Date.now() - 3600000).toISOString(),
          completed_at: new Date(Date.now() - 3300000).toISOString(),
          duration_ms: 300000,
          trigger_type: 'schedule'
        },
        {
          workflow_id: workflows[0].id,
          user_id: 'demo@example.com',
          status: 'failed',
          input_data: {},
          error_message: 'API rate limit exceeded',
          started_at: new Date(Date.now() - 7200000).toISOString(),
          completed_at: new Date(Date.now() - 7000000).toISOString(),
          duration_ms: 200000,
          trigger_type: 'manual'
        }
      ]);
      console.log('✅ Sample executions added');
    }

    // Add social posts
    await supabase.from('social_posts').insert([
      {
        user_id: 'demo@example.com',
        content: 'Excited to share our latest product update! 🚀',
        platforms: ['twitter', 'linkedin'],
        status: 'published',
        published_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        user_id: 'demo@example.com',
        content: 'Join us for our upcoming webinar on automation best practices',
        platforms: ['linkedin', 'facebook'],
        status: 'scheduled',
        scheduled_at: new Date(Date.now() + 86400000).toISOString()
      }
    ]);
    console.log('✅ Sample social posts added');

    console.log('\n🎉 All tables created and populated successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTables();