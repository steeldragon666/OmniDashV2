import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/AuthManager';
import { supabase } from '@/lib/database/supabase';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const workflowId = searchParams.get('workflowId');

    let query = supabase
      .from('workflow_executions')
      .select(`
        *,
        workflows!inner (
          name,
          user_id
        )
      `)
      .eq('workflows.user_id', session.userId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    if (workflowId) {
      query = query.eq('workflow_id', workflowId);
    }

    const { data: executions, error } = await query;

    if (error) {
      console.error('Error fetching executions:', error);
      return NextResponse.json({ error: 'Failed to fetch executions' }, { status: 500 });
    }

    // Transform executions to frontend format
    const transformedExecutions = executions?.map(execution => ({
      id: execution.id,
      workflow_id: execution.workflow_id,
      workflow_name: execution.workflows.name,
      status: execution.status,
      started_at: execution.started_at,
      completed_at: execution.completed_at,
      duration: execution.completed_at && execution.started_at 
        ? new Date(execution.completed_at).getTime() - new Date(execution.started_at).getTime()
        : null,
      progress: execution.status === 'running' ? 
        Math.floor(Math.random() * 80) + 10 : // Mock progress for running executions
        execution.status === 'completed' ? 100 : 0,
      trigger_type: execution.trigger_type || 'manual',
      input_data: execution.input_data,
      output_data: execution.output_data,
      error_message: execution.error_message,
      user_id: execution.user_id
    })) || [];

    return NextResponse.json({
      success: true,
      executions: transformedExecutions,
      total: transformedExecutions.length
    });

  } catch (error) {
    console.error('Dashboard executions error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch executions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}