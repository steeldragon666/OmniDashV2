import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/AuthManager';
import { WorkflowRepository } from '@/lib/database/repositories/WorkflowRepository';
import { WorkflowFormatConverter } from '@/lib/integrations/WorkflowFormatConverter';
import { n8nIntegration } from '@/lib/integrations/N8nIntegration';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { workflowId, target, syncMode = 'export' } = body;

    if (!workflowId || !target) {
      return NextResponse.json(
        { error: 'workflowId and target are required' },
        { status: 400 }
      );
    }

    const workflowRepository = new WorkflowRepository();
    const workflow = await workflowRepository.getById(workflowId);

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    if (workflow.userId !== session.userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    let exportedData: any;
    let filename: string;
    let mimeType: string = 'application/json';

    switch (target) {
      case 'n8n':
        exportedData = WorkflowFormatConverter.toN8n(workflow);
        filename = `${workflow.name.replace(/[^a-zA-Z0-9]/g, '_')}_n8n.json`;
        
        if (syncMode === 'sync') {
          try {
            const syncedWorkflow = await n8nIntegration.syncWorkflowToN8n(workflow);
            return NextResponse.json({
              success: true,
              synced: true,
              n8nWorkflowId: syncedWorkflow.id,
              message: 'Workflow synchronized to n8n successfully'
            });
          } catch (error) {
            return NextResponse.json({
              success: false,
              error: `Failed to sync to n8n: ${(error as Error).message}`,
              exportData: exportedData,
              filename
            });
          }
        }
        break;

      case 'json':
        exportedData = workflow;
        filename = `${workflow.name.replace(/[^a-zA-Z0-9]/g, '_')}_omnidash.json`;
        break;

      case 'yaml':
        exportedData = convertToYaml(workflow);
        filename = `${workflow.name.replace(/[^a-zA-Z0-9]/g, '_')}_omnidash.yaml`;
        mimeType = 'application/x-yaml';
        break;

      default:
        return NextResponse.json(
          { error: 'Unsupported export target. Supported: n8n, json, yaml' },
          { status: 400 }
        );
    }

    const response = NextResponse.json({
      success: true,
      data: exportedData,
      filename,
      mimeType,
      workflow: {
        id: workflow.id,
        name: workflow.name,
        nodeCount: workflow.definition.nodes.length,
        edgeCount: workflow.definition.edges.length
      }
    });

    response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    response.headers.set('Content-Type', mimeType);

    return response;

  } catch (error) {
    console.error('Workflow export error:', error);
    return NextResponse.json(
      { error: `Export failed: ${(error as Error).message}` },
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
    const target = searchParams.get('target');

    switch (target) {
      case 'n8n':
        const isConnected = await n8nIntegration.testConnection();
        return NextResponse.json({
          target: 'n8n',
          connected: isConnected,
          supportedFeatures: {
            export: true,
            sync: isConnected,
            bidirectional: isConnected
          },
          status: isConnected ? 'ready' : 'connection_failed'
        });

      default:
        return NextResponse.json({
          supportedTargets: [
            {
              id: 'n8n',
              name: 'n8n',
              description: 'Export to n8n workflow format',
              features: ['export', 'sync', 'bidirectional']
            },
            {
              id: 'json',
              name: 'JSON',
              description: 'Export as OmniDash JSON format',
              features: ['export']
            },
            {
              id: 'yaml',
              name: 'YAML',
              description: 'Export as OmniDash YAML format',
              features: ['export']
            }
          ]
        });
    }

  } catch (error) {
    console.error('Export targets error:', error);
    return NextResponse.json(
      { error: `Failed to get export targets: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

function convertToYaml(workflow: any): string {
  const yamlLines: string[] = [];
  
  yamlLines.push(`# OmniDash Workflow Export`);
  yamlLines.push(`# Generated: ${new Date().toISOString()}`);
  yamlLines.push('');
  yamlLines.push(`name: "${workflow.name}"`);
  yamlLines.push(`description: "${workflow.description || ''}"`);
  yamlLines.push(`status: ${workflow.status}`);
  yamlLines.push('');
  
  yamlLines.push('definition:');
  yamlLines.push('  nodes:');
  
  workflow.definition.nodes.forEach((node: any) => {
    yamlLines.push(`    - id: "${node.id}"`);
    yamlLines.push(`      type: "${node.type}"`);
    yamlLines.push(`      position:`);
    yamlLines.push(`        x: ${node.position.x}`);
    yamlLines.push(`        y: ${node.position.y}`);
    yamlLines.push(`      data:`);
    yamlLines.push(`        label: "${node.data.label}"`);
    if (node.data.description) {
      yamlLines.push(`        description: "${node.data.description}"`);
    }
    yamlLines.push('');
  });
  
  yamlLines.push('  edges:');
  workflow.definition.edges.forEach((edge: any) => {
    yamlLines.push(`    - id: "${edge.id}"`);
    yamlLines.push(`      source: "${edge.source}"`);
    yamlLines.push(`      target: "${edge.target}"`);
    yamlLines.push(`      type: "${edge.type}"`);
    yamlLines.push('');
  });

  if (workflow.variables && Object.keys(workflow.variables).length > 0) {
    yamlLines.push('variables:');
    Object.entries(workflow.variables).forEach(([key, value]) => {
      yamlLines.push(`  ${key}: ${JSON.stringify(value)}`);
    });
    yamlLines.push('');
  }

  if (workflow.tags && workflow.tags.length > 0) {
    yamlLines.push('tags:');
    workflow.tags.forEach((tag: string) => {
      yamlLines.push(`  - "${tag}"`);
    });
  }

  return yamlLines.join('\n');
}