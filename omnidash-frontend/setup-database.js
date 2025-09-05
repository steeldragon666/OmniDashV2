#!/usr/bin/env node

/**
 * Database Setup Script
 * Creates all required tables and initial data for OmniDash
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

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

async function setupDatabase() {
  log('🚀 Setting up OmniDash Database...', 'bold');
  
  // Check environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    error('Missing required environment variables:');
    error('  - SUPABASE_URL');
    error('  - SUPABASE_SERVICE_ROLE_KEY');
    error('Please check your .env file');
    process.exit(1);
  }

  // Create Supabase client with service role key for admin operations
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  info('Connected to Supabase');

  try {
    // Read and execute the SQL setup file
    const sqlFile = path.join(__dirname, 'database-setup.sql');
    
    if (!fs.existsSync(sqlFile)) {
      error('database-setup.sql file not found');
      process.exit(1);
    }

    info('Reading database setup SQL...');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Split SQL into individual statements (basic splitting)
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    info(`Executing ${statements.length} SQL statements...`);

    // Execute statements one by one for better error handling
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty statements and comments
      if (!statement || statement.startsWith('--')) continue;

      try {
        info(`Executing statement ${i + 1}/${statements.length}`);
        
        // Use rpc to execute raw SQL
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement + ';'
        });

        if (error) {
          // Some errors are expected (like table already exists)
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate key')) {
            warning(`Statement ${i + 1}: ${error.message}`);
          } else {
            throw error;
          }
        }
        
      } catch (err) {
        warning(`Statement ${i + 1} failed: ${err.message}`);
        // Continue with other statements
      }
    }

    success('Database schema setup completed');

    // Test basic operations
    info('Testing database operations...');

    // Test workflows table
    try {
      const { data: workflows, error: workflowError } = await supabase
        .from('workflows')
        .select('count')
        .limit(1);

      if (workflowError) {
        throw workflowError;
      }

      success('Workflows table is accessible');
    } catch (err) {
      error(`Workflows table test failed: ${err.message}`);
    }

    // Test social_posts table
    try {
      const { data: posts, error: postsError } = await supabase
        .from('social_posts')
        .select('count')
        .limit(1);

      if (postsError) {
        throw postsError;
      }

      success('Social posts table is accessible');
    } catch (err) {
      error(`Social posts table test failed: ${err.message}`);
    }

    // Insert test data if tables are empty
    info('Checking for existing data...');
    
    const { data: existingWorkflows } = await supabase
      .from('workflows')
      .select('id')
      .limit(1);

    if (!existingWorkflows || existingWorkflows.length === 0) {
      info('Inserting sample data...');
      
      const sampleWorkflow = {
        name: 'Welcome Workflow',
        description: 'A sample workflow to get you started',
        user_id: 'system',
        status: 'draft',
        definition: {
          nodes: [
            {
              id: '1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: { 
                label: 'Manual Trigger',
                description: 'Manually trigger this workflow'
              }
            },
            {
              id: '2',
              type: 'action',
              position: { x: 300, y: 100 },
              data: { 
                label: 'Send Welcome Email',
                description: 'Send a welcome email to new users'
              }
            }
          ],
          edges: [
            { id: 'e1-2', source: '1', target: '2' }
          ],
          viewport: { x: 0, y: 0, zoom: 1 }
        },
        triggers: ['manual'],
        variables: {},
        settings: {
          errorHandling: 'stop',
          timeout: 30000,
          retryOnFailure: false,
          maxRetries: 3
        },
        tags: ['welcome', 'email']
      };

      const { error: insertError } = await supabase
        .from('workflows')
        .insert([sampleWorkflow]);

      if (insertError) {
        warning(`Failed to insert sample workflow: ${insertError.message}`);
      } else {
        success('Sample workflow created');
      }
    }

    log('\n🎉 Database setup completed successfully!', 'green');
    log('\nNext steps:', 'blue');
    log('  1. Start the development server: npm run dev');
    log('  2. Visit http://localhost:3000 to see your app');
    log('  3. Run connection tests: node test-connections.js');

  } catch (err) {
    error(`Database setup failed: ${err.message}`);
    error('This might be because:');
    error('  1. Database credentials are incorrect');
    error('  2. Database is not accessible');
    error('  3. Insufficient permissions');
    error('\nPlease check your Supabase configuration and try again.');
    process.exit(1);
  }
}

// Alternative setup using direct SQL execution
async function setupWithDirectSQL() {
  log('📋 Alternative setup: Creating tables manually...', 'yellow');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Core tables with simplified schemas
  const tables = [
    {
      name: 'workflows',
      sql: `
        CREATE TABLE IF NOT EXISTS workflows (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          description TEXT,
          user_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'draft',
          definition JSONB NOT NULL DEFAULT '{}',
          triggers TEXT[] DEFAULT '{}',
          variables JSONB DEFAULT '{}',
          settings JSONB DEFAULT '{}',
          tags TEXT[] DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `
    },
    {
      name: 'workflow_executions',
      sql: `
        CREATE TABLE IF NOT EXISTS workflow_executions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workflow_id UUID,
          user_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'running',
          started_at TIMESTAMPTZ DEFAULT NOW(),
          completed_at TIMESTAMPTZ,
          execution_time INTEGER,
          input_data JSONB DEFAULT '{}',
          output_data JSONB DEFAULT '{}',
          error_message TEXT,
          logs JSONB DEFAULT '[]'
        )
      `
    },
    {
      name: 'social_posts',
      sql: `
        CREATE TABLE IF NOT EXISTS social_posts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL,
          platform TEXT NOT NULL,
          content TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'draft',
          scheduled_at TIMESTAMPTZ,
          published_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `
    }
  ];

  for (const table of tables) {
    try {
      info(`Creating table: ${table.name}`);
      
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: table.sql
      });

      if (error && !error.message.includes('already exists')) {
        throw error;
      }
      
      success(`Table ${table.name} ready`);
      
    } catch (err) {
      warning(`Table ${table.name}: ${err.message}`);
    }
  }

  success('Basic tables created');
}

// Run setup
if (require.main === module) {
  setupDatabase()
    .catch(async (err) => {
      error('Primary setup failed, trying alternative...');
      try {
        await setupWithDirectSQL();
      } catch (altErr) {
        error('Alternative setup also failed');
        error('Please set up tables manually using Supabase dashboard');
        process.exit(1);
      }
    });
}

module.exports = { setupDatabase };