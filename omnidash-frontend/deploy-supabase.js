#!/usr/bin/env node

/**
 * Supabase Deployment Script
 * Deploys the OmniDash database schema and configuration to Supabase
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

class SupabaseDeployer {
  constructor() {
    this.supabase = null;
    this.migrations = [];
  }

  async initialize() {
    log('🚀 Initializing Supabase Deployment...', 'bold');

    // Check environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      error('Missing required environment variables:');
      error('  - SUPABASE_URL');
      error('  - SUPABASE_SERVICE_ROLE_KEY');
      error('\nPlease add these to your .env file:');
      info('SUPABASE_URL=https://your-project.supabase.co');
      info('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
      process.exit(1);
    }

    // Create Supabase client with service role
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    success('Connected to Supabase');
  }

  async loadMigrations() {
    info('Loading migration files...');
    
    const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      error('Migrations directory not found');
      error('Please ensure supabase/migrations/ directory exists');
      process.exit(1);
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      this.migrations.push({
        name: file,
        path: filePath,
        content: content
      });
    }

    success(`Loaded ${this.migrations.length} migration files`);
  }

  async executeSQL(sql, migrationName = 'Unknown') {
    try {
      // Split SQL into individual statements for better error handling
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      let successCount = 0;
      let errors = [];

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        
        if (!statement || statement.startsWith('--')) continue;

        try {
          // Execute using raw SQL
          const { data, error } = await this.supabase.rpc('exec_sql', {
            sql_query: statement + ';'
          });

          if (error) {
            // Some errors are expected (like table already exists)
            if (error.message.includes('already exists') || 
                error.message.includes('duplicate') ||
                error.message.includes('does not exist')) {
              // Ignore these specific errors
            } else {
              errors.push(`Statement ${i + 1}: ${error.message}`);
            }
          } else {
            successCount++;
          }
          
        } catch (err) {
          errors.push(`Statement ${i + 1}: ${err.message}`);
        }
      }

      if (errors.length > 0) {
        warning(`${migrationName}: ${errors.length} errors occurred`);
        errors.forEach(err => warning(`  ${err}`));
      }

      return { success: successCount, errors: errors.length };
      
    } catch (err) {
      error(`Failed to execute SQL for ${migrationName}: ${err.message}`);
      return { success: 0, errors: 1 };
    }
  }

  async runMigrations() {
    info('Running database migrations...');

    let totalSuccess = 0;
    let totalErrors = 0;

    for (const migration of this.migrations) {
      info(`Running migration: ${migration.name}`);
      
      const result = await this.executeSQL(migration.content, migration.name);
      totalSuccess += result.success;
      totalErrors += result.errors;

      if (result.errors === 0) {
        success(`✓ ${migration.name} completed successfully`);
      } else {
        warning(`⚠ ${migration.name} completed with warnings`);
      }
    }

    log(`\n📊 Migration Summary:`, 'bold');
    success(`Successful statements: ${totalSuccess}`);
    if (totalErrors > 0) {
      warning(`Statements with errors: ${totalErrors}`);
    } else {
      success(`No errors encountered`);
    }

    return totalErrors === 0;
  }

  async testConnection() {
    info('Testing database connection and tables...');

    // Test basic table access
    const testQueries = [
      { name: 'workflows', query: 'workflows' },
      { name: 'workflow_executions', query: 'workflow_executions' },
      { name: 'social_posts', query: 'social_posts' },
      { name: 'users', query: 'users' }
    ];

    let passedTests = 0;

    for (const test of testQueries) {
      try {
        const { data, error } = await this.supabase
          .from(test.query)
          .select('id')
          .limit(1);

        if (error) {
          if (error.code === 'PGRST116') {
            warning(`Table ${test.name}: Does not exist`);
          } else {
            error(`Table ${test.name}: ${error.message}`);
          }
        } else {
          success(`Table ${test.name}: Accessible`);
          passedTests++;
        }
      } catch (err) {
        error(`Table ${test.name}: ${err.message}`);
      }
    }

    return passedTests === testQueries.length;
  }

  async setupStorageBuckets() {
    info('Setting up storage buckets...');

    const buckets = [
      { 
        name: 'uploads', 
        public: false,
        allowedMimeTypes: ['image/*', 'application/pdf', 'text/*']
      },
      { 
        name: 'public-assets', 
        public: true,
        allowedMimeTypes: ['image/*']
      }
    ];

    for (const bucket of buckets) {
      try {
        const { data, error } = await this.supabase.storage.createBucket(bucket.name, {
          public: bucket.public,
          allowedMimeTypes: bucket.allowedMimeTypes
        });

        if (error) {
          if (error.message.includes('already exists')) {
            warning(`Storage bucket '${bucket.name}' already exists`);
          } else {
            error(`Failed to create bucket '${bucket.name}': ${error.message}`);
          }
        } else {
          success(`Created storage bucket: ${bucket.name}`);
        }
      } catch (err) {
        warning(`Storage bucket '${bucket.name}': ${err.message}`);
      }
    }
  }

  async verifyData() {
    info('Verifying sample data...');

    try {
      // Check if sample workflows exist
      const { data: workflows, error: workflowsError } = await this.supabase
        .from('workflows')
        .select('id, name')
        .limit(5);

      if (workflowsError) {
        error(`Workflows verification failed: ${workflowsError.message}`);
        return false;
      }

      if (workflows && workflows.length > 0) {
        success(`Found ${workflows.length} sample workflows`);
        workflows.forEach(w => info(`  - ${w.name}`));
      } else {
        warning('No sample workflows found');
      }

      // Check social posts
      const { data: posts, error: postsError } = await this.supabase
        .from('social_posts')
        .select('id, platform, status')
        .limit(3);

      if (postsError) {
        warning(`Social posts verification: ${postsError.message}`);
      } else if (posts && posts.length > 0) {
        success(`Found ${posts.length} sample social posts`);
      }

      return true;

    } catch (err) {
      error(`Data verification failed: ${err.message}`);
      return false;
    }
  }

  async deploy() {
    try {
      await this.initialize();
      await this.loadMigrations();
      
      const migrationSuccess = await this.runMigrations();
      
      await this.setupStorageBuckets();
      
      const connectionTest = await this.testConnection();
      
      await this.verifyData();

      log('\n🎯 Deployment Summary:', 'bold');
      
      if (migrationSuccess && connectionTest) {
        success('✅ Supabase deployment completed successfully!');
        log('\n🚀 Next steps:', 'blue');
        log('  1. Update your .env file with the correct Supabase credentials');
        log('  2. Test the connection: node test-connections.js');
        log('  3. Start your development server: npm run dev');
        log('  4. Visit http://localhost:3000 to see your app');
        
        log('\n📱 Supabase Dashboard:', 'blue');
        log(`  Visit: ${process.env.SUPABASE_URL?.replace('https://', 'https://app.supabase.com/project/')}`);
        
        return true;
      } else {
        error('❌ Deployment completed with errors');
        log('\n🔧 Troubleshooting:', 'yellow');
        log('  1. Check your Supabase credentials');
        log('  2. Ensure you have the correct permissions');
        log('  3. Check the Supabase dashboard for more details');
        
        return false;
      }

    } catch (err) {
      error(`Deployment failed: ${err.message}`);
      return false;
    }
  }
}

// CLI interface
async function main() {
  const deployer = new SupabaseDeployer();
  
  try {
    const success = await deployer.deploy();
    process.exit(success ? 0 : 1);
  } catch (err) {
    error(`Unexpected error: ${err.message}`);
    process.exit(1);
  }
}

// Run deployment if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = SupabaseDeployer;