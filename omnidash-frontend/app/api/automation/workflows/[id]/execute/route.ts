import { NextRequest, NextResponse } from 'next/server';
import { automationEngine } from '../../../../../automation-engine';

// POST /api/automation/workflows/[id]/execute - Execute workflow
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { input, triggerType } = await request.json();
    
    const workflow = automationEngine.workflowEngine.getWorkflow(params.id);
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const execution = await automationEngine.executeWorkflow(
      params.id,
      input || {},
      triggerType || 'manual'
    );

    return NextResponse.json({ 
      execution: {
        id: execution.id,
        workflowId: execution.workflowId,
        status: execution.status,
        startedAt: execution.startedAt,
        progress: execution.progress
      },
      message: 'Workflow execution started' 
    });
  } catch (error) {
    console.error('Error executing workflow:', error);
    return NextResponse.json(
      { error: 'Failed to execute workflow', details: (error as Error).message },
      { status: 500 }
    );
  }
}