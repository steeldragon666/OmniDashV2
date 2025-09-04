import { Workflow, WorkflowNode, WorkflowEdge } from '../types/workflow';
import { N8nWorkflow, N8nNode } from './N8nIntegration';

export interface ZapierWorkflow {
  id: string;
  name: string;
  description?: string;
  status: 'on' | 'off' | 'draft';
  steps: ZapierStep[];
}

export interface ZapierStep {
  id: string;
  type: 'trigger' | 'action';
  app: string;
  event: string;
  params: Record<string, any>;
  position: number;
}

export interface MakeScenario {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'incomplete';
  modules: MakeModule[];
  connections: MakeConnection[];
}

export interface MakeModule {
  id: string;
  app: string;
  module: string;
  version: number;
  parameters: Record<string, any>;
  mapper: Record<string, any>;
  metadata: {
    designer: {
      x: number;
      y: number;
    };
  };
}

export interface MakeConnection {
  id: string;
  src: {
    moduleId: string;
    portName: string;
  };
  dst: {
    moduleId: string;
    portName: string;
  };
}

export interface PowerAutomateFlow {
  id: string;
  name: string;
  displayName: string;
  state: 'Started' | 'Stopped' | 'Suspended';
  definition: {
    $schema: string;
    contentVersion: string;
    parameters: Record<string, any>;
    triggers: Record<string, any>;
    actions: Record<string, any>;
  };
}

export class WorkflowFormatConverter {
  static fromN8n(n8nWorkflow: N8nWorkflow): Workflow {
    const nodes: WorkflowNode[] = n8nWorkflow.nodes.map(node => {
      return {
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
            originalType: node.type,
            typeVersion: node.typeVersion,
            disabled: node.disabled,
            continueOnFail: node.continueOnFail,
            retryOnFail: node.retryOnFail,
            maxTries: node.maxTries,
            waitBetween: node.waitBetween
          },
          credentials: node.credentials,
          description: node.notes
        }
      };
    });

    const edges: WorkflowEdge[] = this.convertN8nConnections(n8nWorkflow.connections);

    return {
      id: n8nWorkflow.id,
      name: n8nWorkflow.name,
      description: `Imported from n8n - ${new Date().toISOString()}`,
      userId: '',
      status: n8nWorkflow.active ? 'active' : 'draft',
      definition: {
        nodes,
        edges,
        viewport: { x: 0, y: 0, zoom: 1 }
      },
      triggers: nodes.filter(n => n.type.includes('trigger')).map(n => n.id),
      variables: n8nWorkflow.staticData || {},
      settings: {
        errorHandling: 'stop',
        timeout: 300000,
        retryOnFailure: false,
        maxRetries: 3,
        ...n8nWorkflow.settings
      },
      tags: n8nWorkflow.tags || ['imported', 'n8n'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  static toN8n(workflow: Workflow): N8nWorkflow {
    const nodes: N8nNode[] = workflow.definition.nodes.map(node => {
      const config = node.data.config as any || {};
      
      return {
        id: node.id,
        name: node.data.label,
        type: config.originalType || this.mapOmniDashNodeType(node.type),
        typeVersion: config.typeVersion || 1,
        position: [node.position.x, node.position.y],
        parameters: { ...config },
        credentials: node.data.credentials as Record<string, string>,
        notes: node.data.description,
        disabled: config.disabled,
        continueOnFail: config.continueOnFail,
        retryOnFail: config.retryOnFail,
        maxTries: config.maxTries,
        waitBetween: config.waitBetween
      };
    });

    return {
      id: workflow.id,
      name: workflow.name,
      nodes,
      connections: this.convertOmniDashConnections(workflow.definition.edges),
      active: workflow.status === 'active',
      settings: workflow.settings,
      staticData: workflow.variables,
      tags: workflow.tags,
      meta: {
        exportedFrom: 'omnidash',
        exportedAt: new Date().toISOString()
      }
    };
  }

  static fromZapier(zapierWorkflow: ZapierWorkflow): Workflow {
    const nodes: WorkflowNode[] = zapierWorkflow.steps.map((step, index) => ({
      id: step.id,
      type: step.type === 'trigger' ? 'webhook-trigger' : this.mapZapierAppToNodeType(step.app),
      position: { x: index * 200, y: 100 },
      data: {
        label: `${step.app} - ${step.event}`,
        config: {
          app: step.app,
          event: step.event,
          ...step.params,
          originalPlatform: 'zapier'
        },
        description: `Step ${step.position}: ${step.app} ${step.event}`
      }
    }));

    const edges: WorkflowEdge[] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        id: `edge-${i}`,
        source: nodes[i].id,
        target: nodes[i + 1].id,
        type: 'default'
      });
    }

    return {
      id: zapierWorkflow.id,
      name: zapierWorkflow.name,
      description: zapierWorkflow.description || `Imported from Zapier - ${new Date().toISOString()}`,
      userId: '',
      status: zapierWorkflow.status === 'on' ? 'active' : 'draft',
      definition: { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } },
      triggers: nodes.filter(n => n.type.includes('trigger')).map(n => n.id),
      variables: {},
      settings: {
        errorHandling: 'stop',
        timeout: 300000,
        retryOnFailure: true,
        maxRetries: 3
      },
      tags: ['imported', 'zapier'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  static fromMake(makeScenario: MakeScenario): Workflow {
    const nodes: WorkflowNode[] = makeScenario.modules.map(module => ({
      id: module.id,
      type: this.mapMakeAppToNodeType(module.app, module.module),
      position: {
        x: module.metadata.designer.x,
        y: module.metadata.designer.y
      },
      data: {
        label: `${module.app} - ${module.module}`,
        config: {
          ...module.parameters,
          ...module.mapper,
          app: module.app,
          module: module.module,
          version: module.version,
          originalPlatform: 'make'
        }
      }
    }));

    const edges: WorkflowEdge[] = makeScenario.connections.map(conn => ({
      id: conn.id,
      source: conn.src.moduleId,
      target: conn.dst.moduleId,
      sourceHandle: conn.src.portName,
      targetHandle: conn.dst.portName,
      type: 'default'
    }));

    return {
      id: makeScenario.id,
      name: makeScenario.name,
      description: makeScenario.description || `Imported from Make - ${new Date().toISOString()}`,
      userId: '',
      status: makeScenario.status === 'active' ? 'active' : 'draft',
      definition: { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } },
      triggers: nodes.filter(n => n.type.includes('trigger')).map(n => n.id),
      variables: {},
      settings: {
        errorHandling: 'stop',
        timeout: 300000,
        retryOnFailure: true,
        maxRetries: 3
      },
      tags: ['imported', 'make'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  static fromPowerAutomate(flow: PowerAutomateFlow): Workflow {
    const nodes: WorkflowNode[] = [];
    const edges: WorkflowEdge[] = [];
    let nodeCount = 0;

    Object.entries(flow.definition.triggers).forEach(([key, trigger]) => {
      nodes.push({
        id: key,
        type: 'webhook-trigger',
        position: { x: 100, y: 50 },
        data: {
          label: key,
          config: {
            ...trigger,
            originalPlatform: 'powerautomate'
          }
        }
      });
    });

    Object.entries(flow.definition.actions).forEach(([key, action]) => {
      nodeCount++;
      nodes.push({
        id: key,
        type: this.mapPowerAutomateActionType(key, action as any),
        position: { x: 100 + (nodeCount * 200), y: 200 },
        data: {
          label: key,
          config: {
            ...action,
            originalPlatform: 'powerautomate'
          }
        }
      });

      if (nodeCount === 1 && nodes.length > 1) {
        edges.push({
          id: `trigger-${key}`,
          source: nodes[0].id,
          target: key,
          type: 'default'
        });
      } else if (nodeCount > 1) {
        const prevActionKey = Object.keys(flow.definition.actions)[nodeCount - 2];
        edges.push({
          id: `${prevActionKey}-${key}`,
          source: prevActionKey,
          target: key,
          type: 'default'
        });
      }
    });

    return {
      id: flow.id,
      name: flow.displayName || flow.name,
      description: `Imported from Power Automate - ${new Date().toISOString()}`,
      userId: '',
      status: flow.state === 'Started' ? 'active' : 'draft',
      definition: { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } },
      triggers: nodes.filter(n => n.type.includes('trigger')).map(n => n.id),
      variables: flow.definition.parameters || {},
      settings: {
        errorHandling: 'stop',
        timeout: 300000,
        retryOnFailure: true,
        maxRetries: 3
      },
      tags: ['imported', 'powerautomate'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private static mapN8nNodeType(n8nType: string): string {
    const mapping: Record<string, string> = {
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
      'n8n-nodes-base.googleSheets': 'database-action'
    };
    return mapping[n8nType] || 'custom-action';
  }

  private static mapOmniDashNodeType(omnidashType: string): string {
    const mapping: Record<string, string> = {
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
    return mapping[omnidashType] || 'n8n-nodes-base.function';
  }

  private static mapZapierAppToNodeType(app: string): string {
    const mapping: Record<string, string> = {
      'webhook': 'webhook-action',
      'email': 'email-action',
      'gmail': 'email-action',
      'twitter': 'social-action',
      'facebook': 'social-action',
      'slack': 'notification-action',
      'discord': 'notification-action',
      'google-sheets': 'database-action',
      'airtable': 'database-action',
      'notion': 'database-action'
    };
    return mapping[app.toLowerCase()] || 'custom-action';
  }

  private static mapMakeAppToNodeType(app: string, module: string): string {
    if (module.includes('trigger') || module.includes('watch')) {
      return app.toLowerCase().includes('webhook') ? 'webhook-trigger' : 'schedule-trigger';
    }
    
    const mapping: Record<string, string> = {
      'http': 'http-action',
      'email': 'email-action',
      'twitter': 'social-action',
      'facebook': 'social-action',
      'slack': 'notification-action',
      'google-sheets': 'database-action'
    };
    return mapping[app.toLowerCase()] || 'custom-action';
  }

  private static mapPowerAutomateActionType(key: string, action: any): string {
    const type = action.type?.toLowerCase() || key.toLowerCase();
    
    if (type.includes('http')) return 'http-action';
    if (type.includes('mail') || type.includes('email')) return 'email-action';
    if (type.includes('twitter') || type.includes('social')) return 'social-action';
    if (type.includes('slack') || type.includes('teams')) return 'notification-action';
    if (type.includes('excel') || type.includes('sharepoint')) return 'database-action';
    if (type.includes('condition') || type.includes('if')) return 'condition';
    if (type.includes('delay') || type.includes('wait')) return 'delay';
    
    return 'custom-action';
  }

  private static convertN8nConnections(connections: Record<string, Record<string, Array<{node: string, type: string, index: number}>>>): WorkflowEdge[] {
    const edges: WorkflowEdge[] = [];
    let edgeId = 0;

    Object.entries(connections).forEach(([sourceId, outputs]) => {
      Object.entries(outputs).forEach(([outputIndex, targets]) => {
        targets.forEach((target) => {
          edges.push({
            id: `edge-${edgeId++}`,
            source: sourceId,
            target: target.node,
            sourceHandle: outputIndex,
            targetHandle: target.index.toString(),
            type: 'default'
          });
        });
      });
    });

    return edges;
  }

  private static convertOmniDashConnections(edges: WorkflowEdge[]): Record<string, Record<string, Array<{node: string, type: string, index: number}>>> {
    const connections: Record<string, Record<string, Array<{node: string, type: string, index: number}>>> = {};

    edges.forEach(edge => {
      const sourceHandle = edge.sourceHandle || '0';
      const targetHandle = parseInt(edge.targetHandle || '0');

      if (!connections[edge.source]) {
        connections[edge.source] = {};
      }
      if (!connections[edge.source][sourceHandle]) {
        connections[edge.source][sourceHandle] = [];
      }

      connections[edge.source][sourceHandle].push({
        node: edge.target,
        type: 'main',
        index: targetHandle
      });
    });

    return connections;
  }

  static detectWorkflowFormat(data: any): 'n8n' | 'zapier' | 'make' | 'powerautomate' | 'omnidash' | 'unknown' {
    if (data.nodes && data.connections && typeof data.active !== 'undefined') {
      return 'n8n';
    }
    
    if (data.steps && Array.isArray(data.steps)) {
      return 'zapier';
    }
    
    if (data.modules && data.connections && Array.isArray(data.modules)) {
      return 'make';
    }
    
    if (data.definition && data.definition.triggers && data.definition.actions) {
      return 'powerautomate';
    }
    
    if (data.definition && data.definition.nodes && data.definition.edges) {
      return 'omnidash';
    }
    
    return 'unknown';
  }

  static convertToOmniDash(data: any): Workflow | null {
    const format = this.detectWorkflowFormat(data);
    
    switch (format) {
      case 'n8n':
        return this.fromN8n(data);
      case 'zapier':
        return this.fromZapier(data);
      case 'make':
        return this.fromMake(data);
      case 'powerautomate':
        return this.fromPowerAutomate(data);
      case 'omnidash':
        return data as Workflow;
      default:
        return null;
    }
  }
}