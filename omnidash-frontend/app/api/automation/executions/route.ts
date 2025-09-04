import { NextRequest, NextResponse } from 'next/server';

// GET /api/automation/executions - List executions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflowId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Mock data for now - will be replaced with real database queries
    const mockExecutions = [
      {
        id: '1',
        workflowId: 'workflow-1',
        status: 'completed',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: 5000,
        progress: 100,
        result: { success: true, message: 'Execution completed successfully' }
      },
      {
        id: '2',
        workflowId: 'workflow-2', 
        status: 'running',
        startedAt: new Date().toISOString(),
        progress: 65,
        result: null
      },
      {
        id: '3',
        workflowId: 'workflow-1',
        status: 'failed',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: 2000,
        progress: 30,
        error: 'Connection timeout',
        result: null
      }
    ];

    let executions = mockExecutions;

    // Filter by workflow if specified
    if (workflowId) {
      executions = executions.filter(exec => exec.workflowId === workflowId);
    }

    // Filter by status if specified
    if (status) {
      executions = executions.filter(exec => exec.status === status);
    }

    // Limit results
    executions = executions.slice(0, limit);

    return NextResponse.json({ executions });
  } catch (error) {
    console.error('Error fetching executions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch executions' },
      { status: 500 }
    );
  }
}

// POST /api/automation/executions - Start new execution
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflowId, input = {}, triggerType = 'manual' } = body;

    if (!workflowId) {
      return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 });
    }

    // Mock execution creation
    const execution = {
      id: `execution-${Date.now()}`,
      workflowId,
      status: 'running',
      startedAt: new Date().toISOString(),
      progress: 0,
      triggerType,
      input,
      result: null
    };

    return NextResponse.json({ 
      execution,
      message: 'Execution started successfully' 
    }, { status: 201 });
  } catch (error) {
    console.error('Error starting execution:', error);
    return NextResponse.json(
      { error: 'Failed to start execution' },
      { status: 500 }
    );
  }
}