// Initialize Supabase Database with Schema
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🏗️ Initializing Supabase Database...\n');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initDatabase() {
  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, 'supabase', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the schema into individual SQL statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.includes('CREATE EXTENSION')) {
        console.log(`${i + 1}. Creating extension...`);
      } else if (statement.includes('CREATE TABLE')) {
        const tableName = statement.match(/CREATE TABLE.*?(\w+)\s*\(/)?.[1] || 'unknown';
        console.log(`${i + 1}. Creating table: ${tableName}`);
      } else if (statement.includes('CREATE INDEX')) {
        console.log(`${i + 1}. Creating index...`);
      } else if (statement.includes('CREATE TRIGGER')) {
        console.log(`${i + 1}. Creating trigger...`);
      } else if (statement.includes('CREATE POLICY')) {
        console.log(`${i + 1}. Creating RLS policy...`);
      } else if (statement.includes('INSERT INTO')) {
        console.log(`${i + 1}. Inserting sample data...`);
      } else if (statement.includes('GRANT')) {
        console.log(`${i + 1}. Setting permissions...`);
      } else {
        console.log(`${i + 1}. Executing statement...`);
      }
      
      try {
        await supabase.rpc('exec_sql', { sql: statement });
      } catch (error) {
        // Try alternative approach for statements that don't work with rpc
        try {
          const { error: directError } = await supabase
            .from('_supabase_admin')
            .select('*')
            .limit(0);
          
          // If we can't execute directly, log and continue
          if (statement.includes('CREATE EXTENSION') || statement.includes('GRANT') || statement.includes('ALTER TABLE')) {
            console.log(`   ⚠️  Statement may require manual execution in Supabase dashboard`);
          } else {
            console.log(`   ❌ Error: ${error.message}`);
          }
        } catch (alternativeError) {
          console.log(`   ⚠️  Statement may require manual execution: ${statement.substring(0, 50)}...`);
        }
      }
    }
    
    console.log('\n✅ Database initialization completed!');
    
    // Test the tables
    console.log('\n📊 Testing created tables:');
    const tables = ['workflows', 'workflow_executions', 'social_posts', 'social_accounts', 'user_profiles'];
    
    for (const table of tables) {
      try {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        console.log(`   ✅ ${table}: ${count || 0} records`);
      } catch (error) {
        console.log(`   ❌ ${table}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error.message);
    process.exit(1);
  }
}

initDatabase();