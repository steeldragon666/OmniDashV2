import { NextRequest, NextResponse } from 'next/server';
import { automationEngine } from '../../../automation-engine';

// GET /api/automation/executions - List executions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflowId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let executions = automationEngine.workflowEngine.getAllExecutions();

    // Filter by workflow if specified
    if (workflowId) {
      executions = executions.filter(exec => exec.workflowId === workflowId);
    }

    // Filter by status if specified
    if (status) {
      executions = executions.filter(exec => exec.status === status);
    }

    // Sort by start time (newest first) and limit
    executions = executions
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);

    return NextResponse.json({ executions });
  } catch (error) {
    console.error('Error fetching executions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch executions' },
      { status: 500 }
    );
  }
}