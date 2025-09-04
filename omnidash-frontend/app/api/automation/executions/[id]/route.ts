import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const executionId = params.id;
    
    // Mock execution data
    const execution = {
      id: executionId,
      workflowId: 'workflow-1',
      status: 'completed',
      startedAt: new Date(Date.now() - 30000).toISOString(),
      completedAt: new Date().toISOString(),
      duration: 30000,
      progress: 100,
      result: {
        success: true,
        output: 'Execution completed successfully'
      }
    };

    return NextResponse.json({ execution });
  } catch (error) {
    console.error('Error fetching execution:', error);
    return NextResponse.json(
      { error: 'Failed to fetch execution' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const executionId = params.id;
    
    // Mock deletion
    return NextResponse.json({
      message: `Execution ${executionId} cancelled successfully`
    });
  } catch (error) {
    console.error('Error cancelling execution:', error);
    return NextResponse.json(
      { error: 'Failed to cancel execution' },
      { status: 500 }
    );
  }
}