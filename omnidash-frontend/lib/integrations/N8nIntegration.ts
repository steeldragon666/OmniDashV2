import { Workflow, WorkflowNode, WorkflowExecution } from '../types/workflow';

export interface N8nWorkflow {
  id: string;
  name: string;
  nodes: N8nNode[];
  connections: Record<string, Record<string, N8nConnection[]>>;
  active: boolean;
  settings?: Record<string, any>;
  staticData?: Record<string, any>;
  tags?: string[];
  meta?: Record<string, any>;
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, string>;
  webhookId?: string;
  continueOnFail?: boolean;
  alwaysOutputData?: boolean;
  executeOnce?: boolean;
  retryOnFail?: boolean;
  maxTries?: number;
  waitBetween?: number;
  notes?: string;
  notesInFlow?: boolean;
  color?: string;
  disabled?: boolean;
}

export interface N8nConnection {
  node: string;
  type: string;
  index: number;
}

export interface N8nCredentials {
  id: string;
  name: string;
  type: string;
  data: Record<string, any>;
}

export interface N8nExecution {
  id: string;
  workflowId: string;
  mode: 'manual' | 'trigger' | 'webhook' | 'retry';
  startedAt: string;
  stoppedAt?: string;
  finished: boolean;
  status: 'running' | 'success' | 'failed' | 'canceled';
  data?: Record<string, any>;
  error?: any;
}

export class N8nIntegration {
  private baseUrl: string;
  private apiKey: string;
  private headers: Record<string, string>;

  constructor() {
    this.baseUrl = process.env.N8N_BASE_URL || 'http://localhost:5678';
    this.apiKey = process.env.N8N_API_KEY || '';
    this.headers = {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': this.apiKey
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1/${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`n8n API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getAllWorkflows(): Promise<N8nWorkflow[]> {
    const response = await this.makeRequest<{ data: N8nWorkflow[] }>('workflows');
    return response.data;
  }

  async getWorkflow(id: string): Promise<N8nWorkflow> {
    return this.makeRequest<N8nWorkflow>(`workflows/${id}`);
  }

  async createWorkflow(workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    return this.makeRequest<N8nWorkflow>('workflows', 'POST', workflow);
  }

  async updateWorkflow(id: string, workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    return this.makeRequest<N8nWorkflow>(`workflows/${id}`, 'PUT', workflow);
  }

  async deleteWorkflow(id: string): Promise<void> {
    await this.makeRequest(`workflows/${id}`, 'DELETE');
  }

  async activateWorkflow(id: string): Promise<N8nWorkflow> {
    return this.makeRequest<N8nWorkflow>(`workflows/${id}/activate`, 'POST');
  }

  async deactivateWorkflow(id: string): Promise<N8nWorkflow> {
    return this.makeRequest<N8nWorkflow>(`workflows/${id}/deactivate`, 'POST');
  }

  async executeWorkflow(id: string, data?: any): Promise<N8nExecution> {
    return this.makeRequest<N8nExecution>(`workflows/${id}/execute`, 'POST', data);
  }

  async getExecutions(workflowId: string, limit = 20): Promise<N8nExecution[]> {
    const response = await this.makeRequest<{ data: N8nExecution[] }>(
      `executions?workflowId=${workflowId}&limit=${limit}`
    );
    return response.data;
  }

  async getCredentials(): Promise<N8nCredentials[]> {
    const response = await this.makeRequest<{ data: N8nCredentials[] }>('credentials');
    return response.data;
  }

  convertN8nToOmniDash(n8nWorkflow: N8nWorkflow): Workflow {
    const nodes: WorkflowNode[] = n8nWorkflow.nodes.map(node => {
      const omnidashNode: WorkflowNode = {
        id: node.id,
        type: this.mapN8nNodeType(node.type),
        position: {
          x: node.position[0],
          y: node.position[1]
        },
        data: {
          label: node.name,
          config: {
            ...node.parameters,
            n8nType: node.type,
            n8nTypeVersion: node.typeVersion,
            disabled: node.disabled || false,
            continueOnFail: node.continueOnFail || false,
            retryOnFail: node.retryOnFail || false,
            maxTries: node.maxTries || 3,
            waitBetween: node.waitBetween || 0
          }
        }
      };

      if (node.notes) {
        omnidashNode.data.description = node.notes;
      }

      if (node.credentials) {
        omnidashNode.data.credentials = node.credentials;
      }

      return omnidashNode;
    });

    const edges = this.convertN8nConnections(n8nWorkflow.connections);

    return {
      id: n8nWorkflow.id,
      name: n8nWorkflow.name,
      description: `Imported from n8n workflow`,
      userId: '',
      status: n8nWorkflow.active ? 'active' : 'draft',
      definition: {
        nodes,
        edges,
        viewport: { x: 0, y: 0, zoom: 1 }
      },
      triggers: this.extractTriggers(nodes),
      variables: {},
      settings: {
        errorHandling: 'stop',
        timeout: 300000,
        retryOnFailure: false,
        maxRetries: 3,
        ...n8nWorkflow.settings
      },
      tags: n8nWorkflow.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  convertOmniDashToN8n(workflow: Workflow): N8nWorkflow {
    const nodes: N8nNode[] = workflow.definition.nodes.map(node => {
      const n8nNode: N8nNode = {
        id: node.id,
        name: node.data.label,
        type: this.mapOmniDashNodeType(node.type),
        typeVersion: (node.data.config as any)?.n8nTypeVersion || 1,
        position: [node.position.x, node.position.y],
        parameters: { ...(node.data.config || {}) },
        disabled: (node.data.config as any)?.disabled || false,
        continueOnFail: (node.data.config as any)?.continueOnFail || false,
        retryOnFail: (node.data.config as any)?.retryOnFail || false,
        maxTries: (node.data.config as any)?.maxTries || 3,
        waitBetween: (node.data.config as any)?.waitBetween || 0
      };

      if (node.data.description) {
        n8nNode.notes = node.data.description;
      }

      if (node.data.credentials) {
        n8nNode.credentials = node.data.credentials as Record<string, string>;
      }

      // Clean up OmniDash-specific properties
      delete n8nNode.parameters.n8nType;
      delete n8nNode.parameters.n8nTypeVersion;

      return n8nNode;
    });

    const connections = this.convertOmniDashConnections(workflow.definition.edges);

    return {
      id: workflow.id,
      name: workflow.name,
      nodes,
      connections,
      active: workflow.status === 'active',
      settings: workflow.settings,
      tags: workflow.tags
    };
  }

  private mapN8nNodeType(n8nType: string): string {
    const typeMapping: Record<string, string> = {
      'n8n-nodes-base.start': 'trigger',
      'n8n-nodes-base.webhook': 'webhook-trigger',
      'n8n-nodes-base.cron': 'schedule-trigger',
      'n8n-nodes-base.httpRequest': 'http-action',
      'n8n-nodes-base.sendEmail': 'email-action',
      'n8n-nodes-base.function': 'javascript-action',
      'n8n-nodes-base.code': 'javascript-action',
      'n8n-nodes-base.if': 'condition',
      'n8n-nodes-base.switch': 'condition',
      'n8n-nodes-base.wait': 'delay',
      'n8n-nodes-base.merge': 'merge',
      'n8n-nodes-base.set': 'data-transform',
      'n8n-nodes-base.twitter': 'social-action',
      'n8n-nodes-base.slack': 'notification-action',
      'n8n-nodes-base.discord': 'notification-action',
      'n8n-nodes-base.googleSheets': 'database-action',
      'n8n-nodes-base.notion': 'database-action',
      'n8n-nodes-base.airtable': 'database-action'
    };

    return typeMapping[n8nType] || 'custom-action';
  }

  private mapOmniDashNodeType(omnidashType: string): string {
    const typeMapping: Record<string, string> = {
      'trigger': 'n8n-nodes-base.start',
      'webhook-trigger': 'n8n-nodes-base.webhook',
      'schedule-trigger': 'n8n-nodes-base.cron',
      'http-action': 'n8n-nodes-base.httpRequest',
      'email-action': 'n8n-nodes-base.sendEmail',
      'javascript-action': 'n8n-nodes-base.function',
      'condition': 'n8n-nodes-base.if',
      'delay': 'n8n-nodes-base.wait',
      'merge': 'n8n-nodes-base.merge',
      'data-transform': 'n8n-nodes-base.set',
      'social-action': 'n8n-nodes-base.twitter',
      'notification-action': 'n8n-nodes-base.slack',
      'database-action': 'n8n-nodes-base.googleSheets'
    };

    return typeMapping[omnidashType] || 'n8n-nodes-base.function';
  }

  private convertN8nConnections(connections: Record<string, Record<string, N8nConnection[]>>) {
    const edges: any[] = [];

    Object.entries(connections).forEach(([sourceNodeId, outputs]) => {
      Object.entries(outputs).forEach(([outputIndex, targetConnections]) => {
        targetConnections.forEach((connection, index) => {
          edges.push({
            id: `${sourceNodeId}-${connection.node}-${outputIndex}-${index}`,
            source: sourceNodeId,
            target: connection.node,
            sourceHandle: outputIndex,
            targetHandle: connection.index.toString(),
            type: 'default'
          });
        });
      });
    });

    return edges;
  }

  private convertOmniDashConnections(edges: any[]) {
    const connections: Record<string, Record<string, N8nConnection[]>> = {};

    edges.forEach(edge => {
      const sourceNodeId = edge.source;
      const outputIndex = edge.sourceHandle || '0';
      
      if (!connections[sourceNodeId]) {
        connections[sourceNodeId] = {};
      }
      
      if (!connections[sourceNodeId][outputIndex]) {
        connections[sourceNodeId][outputIndex] = [];
      }

      connections[sourceNodeId][outputIndex].push({
        node: edge.target,
        type: 'main',
        index: parseInt(edge.targetHandle || '0')
      });
    });

    return connections;
  }

  private extractTriggers(nodes: WorkflowNode[]): string[] {
    return nodes
      .filter(node => node.type.includes('trigger'))
      .map(node => node.id);
  }

  async syncWorkflowFromN8n(n8nWorkflowId: string, userId: string): Promise<Workflow> {
    const n8nWorkflow = await this.getWorkflow(n8nWorkflowId);
    const omniDashWorkflow = this.convertN8nToOmniDash(n8nWorkflow);
    omniDashWorkflow.userId = userId;
    return omniDashWorkflow;
  }

  async syncWorkflowToN8n(workflow: Workflow): Promise<N8nWorkflow> {
    const n8nWorkflow = this.convertOmniDashToN8n(workflow);
    
    try {
      const existingWorkflow = await this.getWorkflow(workflow.id);
      return await this.updateWorkflow(workflow.id, n8nWorkflow);
    } catch (error) {
      return await this.createWorkflow(n8nWorkflow);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('workflows?limit=1');
      return true;
    } catch (error) {
      console.error('n8n connection test failed:', error);
      return false;
    }
  }

  async getNodeTypes(): Promise<any[]> {
    return this.makeRequest<any[]>('node-types');
  }
}

export const n8nIntegration = new N8nIntegration();