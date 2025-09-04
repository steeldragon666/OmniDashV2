import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth/AuthManager';
import { WorkflowRepository } from '../../../lib/database/repositories/WorkflowRepository';
import { automationEngine } from '../../../automation-engine';

const workflowRepo = new WorkflowRepository();

// GET /api/automation/workflows - List all workflows
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session as any).userId || session.user.id;
    const { searchParams } = new URL(request.url);
    
    const options = {
      status: searchParams.get('status') as any,
      tags: searchParams.get('tags')?.split(','),
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined
    };

    const workflows = await workflowRepo.findAll(userId, options);
    
    return NextResponse.json({ workflows });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}

// POST /api/automation/workflows - Create new workflow
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session as any).userId || session.user.id;
    const workflowData = await request.json();
    
    // Validate required fields
    if (!workflowData.name || !workflowData.definition) {
      return NextResponse.json(
        { error: 'Missing required fields: name, definition' },
        { status: 400 }
      );
    }

    // Create workflow in database
    const workflow = await workflowRepo.create(userId, {
      name: workflowData.name,
      description: workflowData.description,
      definition: workflowData.definition,
      status: workflowData.status || 'draft',
      version: workflowData.version || '1.0.0',
      tags: workflowData.tags || []
    });

    // Register with automation engine if active
    if (workflow.status === 'active') {
      try {
        await automationEngine.createWorkflow({
          id: workflow.id,
          name: workflow.name,
          definition: workflow.definition,
          userId: userId
        });
        console.log(`✅ Workflow ${workflow.id} registered with automation engine`);
      } catch (engineError) {
        console.error('Failed to register workflow with engine:', engineError);
        // Don't fail the whole request, just log the error
      }
    }
    
    return NextResponse.json({ 
      workflow,
      message: 'Workflow created successfully' 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT /api/automation/workflows - Update existing workflow
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session as any).userId || session.user.id;
    const { id, ...updateData } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Workflow ID is required' },
        { status: 400 }
      );
    }

    // Update workflow in database
    const workflow = await workflowRepo.update(id, userId, updateData);

    // Update in automation engine if active
    if (workflow.status === 'active') {
      try {
        await automationEngine.createWorkflow({
          id: workflow.id,
          name: workflow.name,
          definition: workflow.definition,
          userId: userId
        });
        console.log(`✅ Workflow ${workflow.id} updated in automation engine`);
      } catch (engineError) {
        console.error('Failed to update workflow in engine:', engineError);
      }
    }
    
    return NextResponse.json({ 
      workflow,
      message: 'Workflow updated successfully' 
    });
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/automation/workflows - Delete workflow
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session as any).userId || session.user.id;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Workflow ID is required' },
        { status: 400 }
      );
    }

    // Delete from database
    await workflowRepo.delete(id, userId);
    
    return NextResponse.json({ 
      message: 'Workflow deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      { error: 'Failed to delete workflow', details: (error as Error).message },
      { status: 500 }
    );
  }
}