import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const workflowId = params.id;
    
    // Mock workflow data
    const workflow = {
      id: workflowId,
      name: 'Content Generation Pipeline',
      description: 'Automated content creation and social media posting',
      status: 'active',
      version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      definition: {
        nodes: [
          {
            id: 'trigger-1',
            type: 'webhook-trigger',
            position: { x: 100, y: 100 },
            data: { label: 'Content Request' }
          },
          {
            id: 'action-1', 
            type: 'ai-content-generation',
            position: { x: 300, y: 100 },
            data: { label: 'Generate Content' }
          },
          {
            id: 'action-2',
            type: 'social-post',
            position: { x: 500, y: 100 },
            data: { label: 'Post to Social' }
          }
        ],
        edges: [
          { id: 'e1-2', source: 'trigger-1', target: 'action-1' },
          { id: 'e2-3', source: 'action-1', target: 'action-2' }
        ]
      },
      executions: {
        total: 45,
        success: 43,
        failed: 2,
        success_rate: 95.6
      }
    };

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const workflowId = params.id;
    const updateData = await request.json();
    
    // Mock workflow update
    const workflow = {
      id: workflowId,
      ...updateData,
      updated_at: new Date().toISOString()
    };

    return NextResponse.json({
      workflow,
      message: 'Workflow updated successfully'
    });
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const workflowId = params.id;
    
    // Mock deletion
    return NextResponse.json({
      message: `Workflow ${workflowId} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      { error: 'Failed to delete workflow' },
      { status: 500 }
    );
  }
}