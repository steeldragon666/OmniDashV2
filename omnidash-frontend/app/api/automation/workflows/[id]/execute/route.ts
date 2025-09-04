import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const workflowId = params.id;
    const body = await request.json();
    
    // Mock execution
    const execution = {
      id: `exec-${Date.now()}`,
      workflowId,
      status: 'running',
      startedAt: new Date().toISOString(),
      progress: 0,
      input: body.input || {}
    };

    return NextResponse.json({
      execution,
      message: 'Workflow execution started'
    });
  } catch (error) {
    console.error('Error executing workflow:', error);
    return NextResponse.json(
      { error: 'Failed to execute workflow' },
      { status: 500 }
    );
  }
}