// Backend Connection Test Script
// Run this with: node test-backend.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n🔍 Testing Backend Connection...\n');
console.log('URL:', supabaseUrl ? '✅ Found' : '❌ Missing');
console.log('Service Key:', supabaseServiceKey && !supabaseServiceKey.includes('your-') ? '✅ Found' : '❌ Missing or placeholder');

if (!supabaseUrl || !supabaseServiceKey || supabaseServiceKey.includes('your-')) {
  console.error('\n❌ BACKEND NOT CONFIGURED!');
  console.error('Please add the real SUPABASE_SERVICE_ROLE_KEY to .env.local');
  console.error('Get it from: https://supabase.com/dashboard/project/nihtacdpxhthgscpqfsc/settings/api\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    console.log('\n📊 Testing Database Connection...\n');

    // Test 1: Check if workflows table exists
    const { data: workflows, error: workflowError } = await supabase
      .from('workflows')
      .select('count')
      .limit(1);

    if (workflowError) {
      if (workflowError.message.includes('relation') && workflowError.message.includes('does not exist')) {
        console.error('❌ Workflows table does not exist!');
        console.error('   Run the SQL script in: supabase/schema.sql');
      } else {
        console.error('❌ Database error:', workflowError.message);
      }
    } else {
      console.log('✅ Workflows table exists');
    }

    // Test 2: Count existing workflows
    const { count: workflowCount } = await supabase
      .from('workflows')
      .select('*', { count: 'exact', head: true });

    console.log(`📈 Current workflows in database: ${workflowCount || 0}`);

    // Test 3: Try to create a test workflow
    const testWorkflow = {
      name: 'Test Workflow - ' + new Date().toISOString(),
      description: 'Created by test script',
      user_id: 'test@example.com',
      status: 'draft',
      definition: {
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      },
      triggers: [],
      variables: {},
      settings: {
        errorHandling: 'stop',
        timeout: 30000,
        retryOnFailure: false,
        maxRetries: 3
      },
      tags: ['test']
    };

    const { data: newWorkflow, error: createError } = await supabase
      .from('workflows')
      .insert([testWorkflow])
      .select()
      .single();

    if (createError) {
      console.error('❌ Could not create test workflow:', createError.message);
    } else {
      console.log('✅ Successfully created test workflow with ID:', newWorkflow.id);
      
      // Clean up test workflow
      const { error: deleteError } = await supabase
        .from('workflows')
        .delete()
        .eq('id', newWorkflow.id);
      
      if (!deleteError) {
        console.log('🧹 Test workflow cleaned up');
      }
    }

    // Test 4: Check all tables
    const tables = ['user_profiles', 'workflow_executions', 'social_accounts', 'social_posts'];
    console.log('\n📋 Checking all tables:');
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (error) {
        console.log(`   ❌ ${table}: Not found`);
      } else {
        console.log(`   ✅ ${table}: Exists`);
      }
    }

    console.log('\n🎉 Backend connection test complete!\n');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error('Please check your configuration and try again.\n');
  }
}

testConnection();