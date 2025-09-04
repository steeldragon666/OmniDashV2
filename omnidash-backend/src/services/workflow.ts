import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface WorkflowTrigger {
  type: 'schedule' | 'webhook' | 'manual' | 'event';
  config: {
    schedule?: string; // cron expression
    webhookUrl?: string;
    eventType?: string;
    conditions?: Record<string, any>;
  };
}

export interface WorkflowAction {
  type: 'ai_content_generation' | 'social_post' | 'email_send' | 'data_sync' | 'notification';
  config: {
    aiProvider?: string;
    platform?: string;
    template?: string;
    recipients?: string[];
    [key: string]: any;
  };
}

export interface WorkflowDefinition {
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  isActive: boolean;
}

export class WorkflowService {
  private n8nApiUrl: string;
  private n8nApiKey: string;

  constructor() {
    this.n8nApiUrl = process.env.N8N_API_URL || 'http://localhost:5678/api/v1';
    this.n8nApiKey = process.env.N8N_API_KEY || '';
  }

  async createWorkflow(brandId: string, workflow: WorkflowDefinition): Promise<string> {
    try {
      // Convert our workflow definition to N8N format
      const n8nWorkflow = this.convertToN8NFormat(workflow, brandId);

      // Create workflow in N8N
      const response = await axios.post(
        `${this.n8nApiUrl}/workflows`,
        n8nWorkflow,
        {
          headers: {
            'Authorization': `Bearer ${this.n8nApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const n8nWorkflowId = response.data.id;

      // Save workflow in our database
      const dbWorkflow = await prisma.workflow.create({
        data: {
          brandId,
          name: workflow.name,
          description: workflow.description,
          n8nWorkflowId,
          triggerConfig: workflow.trigger,
          actions: workflow.actions,
          status: workflow.isActive ? 'active' : 'inactive',
          isActive: workflow.isActive
        }
      });

      // Activate workflow in N8N if needed
      if (workflow.isActive) {
        await this.activateN8NWorkflow(n8nWorkflowId);
      }

      return dbWorkflow.id;
    } catch (error) {
      console.error('Create workflow error:', error);
      throw new Error('Failed to create workflow');
    }
  }

  async updateWorkflow(workflowId: string, updates: Partial<WorkflowDefinition>): Promise<void> {
    try {
      const existingWorkflow = await prisma.workflow.findUnique({
        where: { id: workflowId }
      });

      if (!existingWorkflow) {
        throw new Error('Workflow not found');
      }

      // Update in N8N if necessary
      if (updates.trigger || updates.actions) {
        const mergedWorkflow: WorkflowDefinition = {
          name: updates.name || existingWorkflow.name,
          description: updates.description || existingWorkflow.description || '',
          trigger: updates.trigger || existingWorkflow.triggerConfig as WorkflowTrigger,
          actions: updates.actions || existingWorkflow.actions as WorkflowAction[],
          isActive: updates.isActive !== undefined ? updates.isActive : existingWorkflow.isActive
        };

        const n8nWorkflow = this.convertToN8NFormat(mergedWorkflow, existingWorkflow.brandId);

        if (existingWorkflow.n8nWorkflowId) {
          await axios.put(
            `${this.n8nApiUrl}/workflows/${existingWorkflow.n8nWorkflowId}`,
            n8nWorkflow,
            {
              headers: {
                'Authorization': `Bearer ${this.n8nApiKey}`,
                'Content-Type': 'application/json'
              }
            }
          );
        }
      }

      // Update activation status if changed
      if (updates.isActive !== undefined && updates.isActive !== existingWorkflow.isActive) {
        if (existingWorkflow.n8nWorkflowId) {
          if (updates.isActive) {
            await this.activateN8NWorkflow(existingWorkflow.n8nWorkflowId);
          } else {
            await this.deactivateN8NWorkflow(existingWorkflow.n8nWorkflowId);
          }
        }
      }

      // Update in database
      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.trigger) updateData.triggerConfig = updates.trigger;
      if (updates.actions) updateData.actions = updates.actions;
      if (updates.isActive !== undefined) {
        updateData.isActive = updates.isActive;
        updateData.status = updates.isActive ? 'active' : 'inactive';
      }

      await prisma.workflow.update({
        where: { id: workflowId },
        data: updateData
      });
    } catch (error) {
      console.error('Update workflow error:', error);
      throw new Error('Failed to update workflow');
    }
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    try {
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId }
      });

      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // Delete from N8N
      if (workflow.n8nWorkflowId) {
        await axios.delete(
          `${this.n8nApiUrl}/workflows/${workflow.n8nWorkflowId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.n8nApiKey}`
            }
          }
        );
      }

      // Delete from database
      await prisma.workflow.delete({
        where: { id: workflowId }
      });
    } catch (error) {
      console.error('Delete workflow error:', error);
      throw new Error('Failed to delete workflow');
    }
  }

  async executeWorkflow(workflowId: string, inputData?: Record<string, any>): Promise<string> {
    try {
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId }
      });

      if (!workflow || !workflow.n8nWorkflowId) {
        throw new Error('Workflow not found or not properly configured');
      }

      // Execute workflow in N8N
      const response = await axios.post(
        `${this.n8nApiUrl}/workflows/${workflow.n8nWorkflowId}/execute`,
        inputData || {},
        {
          headers: {
            'Authorization': `Bearer ${this.n8nApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const executionId = response.data.executionId;

      // Log execution
      await prisma.automationLog.create({
        data: {
          workflowId,
          executionId,
          status: 'success',
          executionData: inputData || {}
        }
      });

      return executionId;
    } catch (error) {
      console.error('Execute workflow error:', error);
      
      // Log error
      await prisma.automationLog.create({
        data: {
          workflowId,
          status: 'failure',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          executionData: inputData || {}
        }
      });

      throw new Error('Failed to execute workflow');
    }
  }

  async getWorkflowStatus(workflowId: string): Promise<{
    status: string;
    lastExecution?: Date;
    successRate: number;
    totalExecutions: number;
  }> {
    try {
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: {
          logs: {
            orderBy: { executedAt: 'desc' },
            take: 100
          }
        }
      });

      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const totalExecutions = workflow.logs.length;
      const successfulExecutions = workflow.logs.filter(log => log.status === 'success').length;
      const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
      const lastExecution = workflow.logs[0]?.executedAt;

      return {
        status: workflow.status,
        lastExecution,
        successRate: parseFloat(successRate.toFixed(2)),
        totalExecutions
      };
    } catch (error) {
      console.error('Get workflow status error:', error);
      throw new Error('Failed to get workflow status');
    }
  }

  private async activateN8NWorkflow(n8nWorkflowId: string): Promise<void> {
    await axios.put(
      `${this.n8nApiUrl}/workflows/${n8nWorkflowId}/activate`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${this.n8nApiKey}`
        }
      }
    );
  }

  private async deactivateN8NWorkflow(n8nWorkflowId: string): Promise<void> {
    await axios.put(
      `${this.n8nApiUrl}/workflows/${n8nWorkflowId}/deactivate`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${this.n8nApiKey}`
        }
      }
    );
  }

  private convertToN8NFormat(workflow: WorkflowDefinition, brandId: string): any {
    // Convert our workflow definition to N8N's format
    const nodes = [];
    let nodeIndex = 0;

    // Start node
    nodes.push({
      id: `start-${nodeIndex++}`,
      name: 'Start',
      type: 'n8n-nodes-base.start',
      typeVersion: 1,
      position: [100, 100]
    });

    // Trigger node based on type
    let triggerNode;
    switch (workflow.trigger.type) {
      case 'schedule':
        triggerNode = {
          id: `trigger-${nodeIndex++}`,
          name: 'Schedule Trigger',
          type: 'n8n-nodes-base.cron',
          typeVersion: 1,
          position: [300, 100],
          parameters: {
            rule: {
              interval: [{
                field: 'cronExpression',
                cronExpression: workflow.trigger.config.schedule || '0 9 * * 1-5'
              }]
            }
          }
        };
        break;

      case 'webhook':
        triggerNode = {
          id: `trigger-${nodeIndex++}`,
          name: 'Webhook Trigger',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [300, 100],
          parameters: {
            httpMethod: 'POST',
            path: `omnidash-${brandId}-${Date.now()}`
          }
        };
        break;

      default:
        triggerNode = {
          id: `trigger-${nodeIndex++}`,
          name: 'Manual Trigger',
          type: 'n8n-nodes-base.manualTrigger',
          typeVersion: 1,
          position: [300, 100]
        };
    }

    nodes.push(triggerNode);

    // Action nodes
    let yPosition = 100;
    workflow.actions.forEach((action, index) => {
      yPosition += 200;
      
      let actionNode;
      switch (action.type) {
        case 'ai_content_generation':
          actionNode = {
            id: `action-${nodeIndex++}`,
            name: `AI Content ${index + 1}`,
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 1,
            position: [500 + (index * 200), yPosition],
            parameters: {
              method: 'POST',
              url: `${process.env.API_URL || 'http://localhost:3000'}/api/ai/generate-content`,
              authentication: 'headerAuth',
              headers: {
                parameters: [{
                  name: 'Authorization',
                  value: '={{ $json.authToken }}'
                }]
              },
              body: {
                mode: 'json',
                json: JSON.stringify({
                  brandId,
                  provider: action.config.aiProvider || 'openai',
                  platform: action.config.platform,
                  template: action.config.template
                })
              }
            }
          };
          break;

        case 'social_post':
          actionNode = {
            id: `action-${nodeIndex++}`,
            name: `Social Post ${index + 1}`,
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 1,
            position: [500 + (index * 200), yPosition],
            parameters: {
              method: 'POST',
              url: `${process.env.API_URL || 'http://localhost:3000'}/api/posts`,
              authentication: 'headerAuth',
              body: {
                mode: 'json',
                json: JSON.stringify({
                  brandId,
                  platform: action.config.platform,
                  content: '={{ $json.content }}'
                })
              }
            }
          };
          break;

        default:
          actionNode = {
            id: `action-${nodeIndex++}`,
            name: `Custom Action ${index + 1}`,
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 1,
            position: [500 + (index * 200), yPosition],
            parameters: {
              method: 'POST',
              url: action.config.url || 'https://httpbin.org/post'
            }
          };
      }

      nodes.push(actionNode);
    });

    return {
      name: workflow.name,
      nodes,
      connections: this.generateConnections(nodes),
      active: workflow.isActive,
      settings: {
        executionOrder: 'v1'
      }
    };
  }

  private generateConnections(nodes: any[]): any {
    const connections: any = {};
    
    for (let i = 0; i < nodes.length - 1; i++) {
      const currentNode = nodes[i];
      const nextNode = nodes[i + 1];
      
      connections[currentNode.name] = {
        main: [[{
          node: nextNode.name,
          type: 'main',
          index: 0
        }]]
      };
    }

    return connections;
  }

  // Predefined workflow templates
  async getWorkflowTemplates(): Promise<any[]> {
    return [
      {
        id: 'daily-content-generation',
        name: 'Daily Content Generation',
        description: 'Generate and queue content for all social platforms daily',
        trigger: {
          type: 'schedule',
          config: {
            schedule: '0 9 * * 1-5' // 9 AM, Monday to Friday
          }
        },
        actions: [
          {
            type: 'ai_content_generation',
            config: {
              aiProvider: 'openai',
              platform: 'twitter',
              template: 'daily-tip'
            }
          },
          {
            type: 'ai_content_generation',
            config: {
              aiProvider: 'claude',
              platform: 'linkedin',
              template: 'professional-insight'
            }
          }
        ]
      },
      {
        id: 'social-monitoring',
        name: 'Social Media Monitoring',
        description: 'Monitor mentions and respond to interactions',
        trigger: {
          type: 'schedule',
          config: {
            schedule: '0 */4 * * *' // Every 4 hours
          }
        },
        actions: [
          {
            type: 'data_sync',
            config: {
              source: 'social_platforms',
              action: 'fetch_mentions'
            }
          },
          {
            type: 'notification',
            config: {
              type: 'email',
              recipients: ['admin@brand.com'],
              template: 'mention-summary'
            }
          }
        ]
      },
      {
        id: 'weekly-analytics',
        name: 'Weekly Analytics Report',
        description: 'Generate and send weekly performance reports',
        trigger: {
          type: 'schedule',
          config: {
            schedule: '0 10 * * 1' // 10 AM every Monday
          }
        },
        actions: [
          {
            type: 'data_sync',
            config: {
              source: 'analytics',
              action: 'generate_report',
              period: 'week'
            }
          },
          {
            type: 'email_send',
            config: {
              template: 'weekly-report',
              recipients: ['team@brand.com']
            }
          }
        ]
      }
    ];
  }
}