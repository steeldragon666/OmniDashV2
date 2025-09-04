import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/AuthManager';
import { WorkflowRepository } from '@/lib/database/repositories/WorkflowRepository';
import { WorkflowFormatConverter } from '@/lib/integrations/WorkflowFormatConverter';
import { n8nIntegration } from '@/lib/integrations/N8nIntegration';
import { realtimeManager } from '@/lib/realtime/RealtimeManager';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { source, data, syncMode = 'import' } = body;

    if (!data) {
      return NextResponse.json({ error: 'No workflow data provided' }, { status: 400 });
    }

    const workflowRepository = new WorkflowRepository();
    let workflow;

    switch (source) {
      case 'n8n':
        if (syncMode === 'sync' && data.n8nWorkflowId) {
          workflow = await n8nIntegration.syncWorkflowFromN8n(data.n8nWorkflowId, session.userId);
        } else {
          workflow = WorkflowFormatConverter.fromN8n(data);
          workflow.userId = session.userId;
        }
        break;

      case 'zapier':
        workflow = WorkflowFormatConverter.fromZapier(data);
        workflow.userId = session.userId;
        break;

      case 'make':
        workflow = WorkflowFormatConverter.fromMake(data);
        workflow.userId = session.userId;
        break;

      case 'powerautomate':
        workflow = WorkflowFormatConverter.fromPowerAutomate(data);
        workflow.userId = session.userId;
        break;

      case 'auto':
        workflow = WorkflowFormatConverter.convertToOmniDash(data);
        if (!workflow) {
          return NextResponse.json(
            { error: 'Unable to detect or convert workflow format' },
            { status: 400 }
          );
        }
        workflow.userId = session.userId;
        break;

      default:
        return NextResponse.json(
          { error: 'Unsupported import source. Supported: n8n, zapier, make, powerautomate, auto' },
          { status: 400 }
        );
    }

    const savedWorkflow = await workflowRepository.create(session.userId, {
      name: workflow.name,
      description: workflow.description,
      definition: workflow.definition,
      triggers: workflow.triggers,
      variables: workflow.variables,
      settings: workflow.settings,
      tags: workflow.tags,
      status: 'draft'
    });

    realtimeManager.sendToUser(session.userId, {
      type: 'workflow:imported',
      data: {
        workflowId: savedWorkflow.id,
        source,
        name: savedWorkflow.name
      },
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      workflow: savedWorkflow,
      message: `Workflow imported successfully from ${source}`
    });

  } catch (error) {
    console.error('Workflow import error:', error);
    return NextResponse.json(
      { error: `Import failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');

    switch (source) {
      case 'n8n':
        const isN8nConnected = await n8nIntegration.testConnection();
        if (!isN8nConnected) {
          return NextResponse.json({
            connected: false,
            error: 'Unable to connect to n8n instance',
            workflows: []
          });
        }

        const n8nWorkflows = await n8nIntegration.getAllWorkflows();
        return NextResponse.json({
          connected: true,
          workflows: n8nWorkflows.map(w => ({
            id: w.id,
            name: w.name,
            active: w.active,
            nodeCount: w.nodes?.length || 0,
            tags: w.tags || []
          }))
        });

      default:
        return NextResponse.json({
          supportedSources: ['n8n', 'zapier', 'make', 'powerautomate'],
          message: 'Specify a source parameter to list available workflows'
        });
    }

  } catch (error) {
    console.error('Import source error:', error);
    return NextResponse.json(
      { error: `Failed to fetch import sources: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}