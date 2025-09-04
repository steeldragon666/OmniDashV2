import { NextRequest, NextResponse } from 'next/server';
import { automationEngine } from '../../../../automation-engine';

// GET /api/automation/executions/[id] - Get execution details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const execution = automationEngine.workflowEngine.getExecution(params.id);
    
    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ execution });
  } catch (error) {
    console.error('Error fetching execution:', error);
    return NextResponse.json(
      { error: 'Failed to fetch execution' },
      { status: 500 }
    );
  }
}

// POST /api/automation/executions/[id]/cancel - Cancel execution
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { action } = await request.json();

    switch (action) {
      case 'cancel':
        automationEngine.workflowEngine.cancelExecution(params.id);
        return NextResponse.json({ message: 'Execution cancelled' });
      
      case 'pause':
        automationEngine.workflowEngine.pauseExecution(params.id);
        return NextResponse.json({ message: 'Execution paused' });
      
      case 'resume':
        automationEngine.workflowEngine.resumeExecution(params.id);
        return NextResponse.json({ message: 'Execution resumed' });
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error performing execution action:', error);
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}