import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  );
}

// Client-side Supabase client (with RLS)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Admin Supabase client (bypasses RLS - use carefully!)
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Connection health check
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection error:', error);
    return false;
  }
}

// Real-time subscription helper
export function subscribeToTable<T = any>(
  table: string,
  callback: (payload: any) => void,
  filter?: string
) {
  const subscription = supabase
    .channel(`${table}-changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter
      },
      callback
    )
    .subscribe();

  return subscription;
}

// Batch operations helper
export async function batchInsert<T>(
  table: string,
  data: T[],
  chunkSize: number = 1000
): Promise<{ success: boolean; errors: any[] }> {
  const errors: any[] = [];
  
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    
    try {
      const { error } = await supabaseAdmin
        .from(table)
        .insert(chunk);
      
      if (error) {
        errors.push({ chunk: i / chunkSize + 1, error });
      }
    } catch (error) {
      errors.push({ chunk: i / chunkSize + 1, error });
    }
  }
  
  return {
    success: errors.length === 0,
    errors
  };
}

// Database analytics helper
export async function getDatabaseStats() {
  try {
    const [
      { count: workflowCount },
      { count: executionCount }, 
      { count: userCount },
      { count: socialAccountCount }
    ] = await Promise.all([
      supabaseAdmin.from('workflows').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('workflow_executions').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('user_profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('social_accounts').select('*', { count: 'exact', head: true })
    ]);

    return {
      workflows: workflowCount || 0,
      executions: executionCount || 0, 
      users: userCount || 0,
      socialAccounts: socialAccountCount || 0,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return {
      workflows: 0,
      executions: 0,
      users: 0,
      socialAccounts: 0,
      timestamp: new Date().toISOString()
    };
  }
}