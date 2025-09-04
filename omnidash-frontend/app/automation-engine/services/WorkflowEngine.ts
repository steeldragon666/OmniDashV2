import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay' | 'webhook' | 'email' | 'integration';
  service: string;
  name: string;
  description?: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  connections: string[];
  conditions?: WorkflowCondition[];
  isActive: boolean;
}

export interface WorkflowCondition {
  field: string;
  operator: 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'exists' | 'regex';
  value: unknown;
  logicalOperator?: 'AND' | 'OR';
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: number;
  isActive: boolean;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  variables: Record<string, unknown>;
  settings: {
    timeout: number;
    retryPolicy: RetryPolicy;
    errorHandling: 'stop' | 'continue' | 'retry';
    notifications: NotificationSettings;
  };
  stats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    lastExecuted?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface WorkflowConnection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  condition?: WorkflowCondition;
  label?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  triggerType: 'manual' | 'scheduled' | 'webhook' | 'event';
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  logs: ExecutionLog[];
  nodeExecutions: NodeExecution[];
  context: ExecutionContext;
  retryCount: number;
  maxRetries: number;
}

export interface NodeExecution {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  retryCount: number;
}

export interface ExecutionLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  nodeId?: string;
  data?: Record<string, unknown>;
}

export interface ExecutionContext {
  variables: Record<string, unknown>;
  metadata: Record<string, unknown>;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  environment: 'development' | 'staging' | 'production';
}

export interface RetryPolicy {
  enabled: boolean;
  maxRetries: number;
  backoffStrategy: 'fixed' | 'exponential' | 'linear';
  initialDelay: number;
  maxDelay?: number;
  retryOnErrors?: string[];
}

export interface NotificationSettings {
  onSuccess: boolean;
  onFailure: boolean;
  onTimeout: boolean;
  channels: ('email' | 'slack' | 'webhook')[];
  recipients: string[];
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'stats'>;
  isPublic: boolean;
  usageCount: number;
}

export class WorkflowEngine extends EventEmitter {
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private templates: Map<string, WorkflowTemplate> = new Map();
  private activeExecutions: Set<string> = new Set();
  private executionQueue: WorkflowExecution[] = [];
  private isProcessing = false;
  private maxConcurrentExecutions = 10;
  private services: Map<string, unknown> = new Map();

  constructor() {
    super();
    this.initialize();
  }

  private initialize() {
    this.startExecutionLoop();
    this.setupDefaultTemplates();
    console.log('🔄 WorkflowEngine initialized');
  }

  public createWorkflow(
    config: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'stats'>
  ): string {
    const workflowId = uuidv4();
    
    const workflow: Workflow = {
      ...config,
      id: workflowId,
      stats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.workflows.set(workflowId, workflow);
    this.emit('workflow:created', workflow);
    
    console.log(`🔧 Workflow created: ${config.name} (${workflowId})`);
    return workflowId;
  }

  public async executeWorkflow(
    workflowId: string,
    input: Record<string, unknown> = {},
    triggerType: WorkflowExecution['triggerType'] = 'manual',
    context: Partial<ExecutionContext> = {}
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (!workflow.isActive) {
      throw new Error(`Workflow is inactive: ${workflowId}`);
    }

    const executionId = uuidv4();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'pending',
      triggerType,
      startedAt: new Date(),
      input,
      logs: [],
      nodeExecutions: [],
      context: {
        variables: { ...workflow.variables, ...input },
        metadata: {},
        environment: 'development',
        ...context
      },
      retryCount: 0,
      maxRetries: workflow.settings.retryPolicy.maxRetries
    };

    this.executions.set(executionId, execution);
    this.executionQueue.push(execution);

    // Update workflow stats
    workflow.stats.totalExecutions++;
    workflow.stats.lastExecuted = new Date();
    this.workflows.set(workflowId, workflow);

    this.emit('execution:queued', execution);
    console.log(`⚡ Workflow execution queued: ${workflowId} (${executionId})`);

    return execution;
  }

  private async startExecutionLoop() {
    this.isProcessing = true;

    while (this.isProcessing) {
      // Process queued executions
      if (this.executionQueue.length > 0 && this.activeExecutions.size < this.maxConcurrentExecutions) {
        const execution = this.executionQueue.shift();
        if (execution) {
          this.processExecution(execution).catch(error => {
            console.error('Error processing execution:', error);
            this.handleExecutionError(execution, error);
          });
        }
      }

      await this.delay(1000); // Check every second
    }
  }

  private async processExecution(execution: WorkflowExecution): Promise<void> {
    this.activeExecutions.add(execution.id);
    execution.status = 'running';
    this.executions.set(execution.id, execution);

    const workflow = this.workflows.get(execution.workflowId)!;
    
    this.addExecutionLog(execution, 'info', `Starting workflow execution: ${workflow.name}`);
    this.emit('execution:started', execution);

    try {
      // Find trigger nodes
      const triggerNodes = workflow.nodes.filter(node => node.type === 'trigger');
      if (triggerNodes.length === 0) {
        throw new Error('No trigger nodes found in workflow');
      }

      // Execute workflow starting from trigger nodes
      for (const triggerNode of triggerNodes) {
        await this.executeNode(execution, workflow, triggerNode);
      }

      // Mark as completed
      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();

      // Update workflow stats
      workflow.stats.successfulExecutions++;
      this.updateAverageExecutionTime(workflow, execution.duration);

      this.addExecutionLog(execution, 'info', `Workflow execution completed successfully`);
      this.emit('execution:completed', execution);

      console.log(`✅ Workflow execution completed: ${execution.id}`);

    } catch (error) {
      this.handleExecutionError(execution, error);
    } finally {
      this.activeExecutions.delete(execution.id);
      this.executions.set(execution.id, execution);
    }
  }

  private async executeNode(
    execution: WorkflowExecution,
    workflow: Workflow,
    node: WorkflowNode
  ): Promise<Record<string, unknown>> {
    const nodeExecution: NodeExecution = {
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      status: 'running',
      startedAt: new Date(),
      input: { ...execution.context.variables },
      retryCount: 0
    };

    execution.nodeExecutions.push(nodeExecution);
    this.addExecutionLog(execution, 'info', `Executing node: ${node.name} (${node.type})`);

    try {
      // Check node conditions
      if (node.conditions && !this.evaluateConditions(node.conditions, execution.context.variables)) {
        nodeExecution.status = 'skipped';
        nodeExecution.completedAt = new Date();
        this.addExecutionLog(execution, 'info', `Node skipped due to conditions: ${node.name}`);
        return {};
      }

      let output: Record<string, unknown> = {};

      // Execute based on node type
      switch (node.type) {
        case 'trigger':
          output = await this.executeTriggerNode(execution, node);
          break;
        case 'action':
          output = await this.executeActionNode(execution, node);
          break;
        case 'condition':
          output = await this.executeConditionNode(execution, node);
          break;
        case 'delay':
          output = await this.executeDelayNode(execution, node);
          break;
        case 'webhook':
          output = await this.executeWebhookNode(execution, node);
          break;
        case 'email':
          output = await this.executeEmailNode(execution, node);
          break;
        case 'integration':
          output = await this.executeIntegrationNode(execution, node);
          break;
        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      nodeExecution.status = 'completed';
      nodeExecution.completedAt = new Date();
      nodeExecution.duration = nodeExecution.completedAt.getTime() - nodeExecution.startedAt.getTime();
      nodeExecution.output = output;

      // Update execution context with output
      execution.context.variables = { ...execution.context.variables, ...output };

      this.addExecutionLog(execution, 'info', `Node completed: ${node.name}`, output);

      // Execute connected nodes
      const connectedNodes = this.getConnectedNodes(workflow, node);
      for (const connectedNode of connectedNodes) {
        await this.executeNode(execution, workflow, connectedNode);
      }

      return output;

    } catch (error) {
      nodeExecution.status = 'failed';
      nodeExecution.completedAt = new Date();
      nodeExecution.error = (error as Error).message;

      this.addExecutionLog(execution, 'error', `Node failed: ${node.name}`, { error: (error as Error).message });
      throw error;
    }
  }

  private async executeTriggerNode(execution: WorkflowExecution, node: WorkflowNode): Promise<Record<string, unknown>> {
    // Trigger nodes typically just pass through the input data
    return {
      triggeredBy: execution.triggerType,
      triggeredAt: execution.startedAt,
      triggerData: execution.input
    };
  }

  private async executeActionNode(execution: WorkflowExecution, node: WorkflowNode): Promise<Record<string, unknown>> {
    const service = this.services.get(node.service);
    if (!service) {
      throw new Error(`Service not found: ${node.service}`);
    }

    // Simulate action execution
    await this.delay(100);
    
    return {
      actionResult: `Action ${node.name} executed successfully`,
      timestamp: new Date(),
      nodeData: node.data
    };
  }

  private async executeConditionNode(execution: WorkflowExecution, node: WorkflowNode): Promise<Record<string, unknown>> {
    const conditions = node.conditions || [];
    const result = this.evaluateConditions(conditions, execution.context.variables);
    
    return {
      conditionResult: result,
      evaluatedAt: new Date()
    };
  }

  private async executeDelayNode(execution: WorkflowExecution, node: WorkflowNode): Promise<Record<string, unknown>> {
    const delayMs = Number(node.data.delay) || 1000;
    await this.delay(delayMs);
    
    return {
      delayCompleted: true,
      delayDuration: delayMs
    };
  }

  private async executeWebhookNode(execution: WorkflowExecution, node: WorkflowNode): Promise<Record<string, unknown>> {
    const webhookUrl = node.data.url as string;
    const method = (node.data.method as string) || 'POST';
    const payload = node.data.payload || execution.context.variables;

    // Simulate webhook call
    await this.delay(500);
    
    return {
      webhookSent: true,
      url: webhookUrl,
      method,
      status: 200
    };
  }

  private async executeEmailNode(execution: WorkflowExecution, node: WorkflowNode): Promise<Record<string, unknown>> {
    const to = node.data.to as string;
    const subject = node.data.subject as string;
    const body = node.data.body as string;

    // Simulate email sending
    await this.delay(300);
    
    return {
      emailSent: true,
      to,
      subject,
      messageId: `email_${Date.now()}`
    };
  }

  private async executeIntegrationNode(execution: WorkflowExecution, node: WorkflowNode): Promise<Record<string, unknown>> {
    const integration = node.data.integration as string;
    const action = node.data.action as string;

    // Simulate integration call
    await this.delay(800);
    
    return {
      integrationResult: `${integration} ${action} completed`,
      integration,
      action
    };
  }

  private evaluateConditions(conditions: WorkflowCondition[], variables: Record<string, unknown>): boolean {
    if (conditions.length === 0) return true;

    let result = true;
    let currentLogical: 'AND' | 'OR' = 'AND';

    for (const condition of conditions) {
      const value = variables[condition.field];
      const conditionResult = this.evaluateCondition(value, condition);

      if (currentLogical === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }

      currentLogical = condition.logicalOperator || 'AND';
    }

    return result;
  }

  private evaluateCondition(value: unknown, condition: WorkflowCondition): boolean {
    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'neq':
        return value !== condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'gt':
        return Number(value) > Number(condition.value);
      case 'lt':
        return Number(value) < Number(condition.value);
      case 'exists':
        return value !== undefined && value !== null;
      case 'regex':
        try {
          const regex = new RegExp(String(condition.value));
          return regex.test(String(value));
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  private getConnectedNodes(workflow: Workflow, node: WorkflowNode): WorkflowNode[] {
    const connections = workflow.connections.filter(conn => conn.source === node.id);
    return connections
      .map(conn => workflow.nodes.find(n => n.id === conn.target))
      .filter((n): n is WorkflowNode => n !== undefined);
  }

  private handleExecutionError(execution: WorkflowExecution, error: unknown): void {
    const errorMessage = (error as Error).message;
    execution.status = 'failed';
    execution.completedAt = new Date();
    execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
    execution.error = errorMessage;

    const workflow = this.workflows.get(execution.workflowId)!;
    workflow.stats.failedExecutions++;

    this.addExecutionLog(execution, 'error', `Workflow execution failed: ${errorMessage}`);
    this.emit('execution:failed', execution);

    console.error(`❌ Workflow execution failed: ${execution.id}`, error);
  }

  private addExecutionLog(
    execution: WorkflowExecution,
    level: ExecutionLog['level'],
    message: string,
    data?: Record<string, unknown>
  ): void {
    const log: ExecutionLog = {
      id: uuidv4(),
      timestamp: new Date(),
      level,
      message,
      data
    };
    
    execution.logs.push(log);
  }

  private updateAverageExecutionTime(workflow: Workflow, duration: number): void {
    const total = workflow.stats.averageExecutionTime * (workflow.stats.successfulExecutions - 1) + duration;
    workflow.stats.averageExecutionTime = total / workflow.stats.successfulExecutions;
  }

  private setupDefaultTemplates(): void {
    const socialMediaTemplate: WorkflowTemplate = {
      id: 'social-media-publisher',
      name: 'Social Media Publisher',
      description: 'Automatically publish content to multiple social media platforms',
      category: 'Social Media',
      tags: ['automation', 'social', 'publishing'],
      isPublic: true,
      usageCount: 0,
      workflow: {
        name: 'Social Media Publisher',
        description: 'Publish content across social platforms',
        version: 1,
        isActive: true,
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            service: 'webhook',
            name: 'Content Trigger',
            position: { x: 100, y: 100 },
            data: {},
            connections: ['action-1'],
            isActive: true
          },
          {
            id: 'action-1',
            type: 'action',
            service: 'social-media',
            name: 'Publish to Platforms',
            position: { x: 300, y: 100 },
            data: { platforms: ['twitter', 'facebook', 'linkedin'] },
            connections: [],
            isActive: true
          }
        ],
        connections: [
          {
            id: 'conn-1',
            source: 'trigger-1',
            target: 'action-1'
          }
        ],
        variables: {},
        settings: {
          timeout: 300000,
          retryPolicy: {
            enabled: true,
            maxRetries: 3,
            backoffStrategy: 'exponential',
            initialDelay: 1000
          },
          errorHandling: 'retry',
          notifications: {
            onSuccess: true,
            onFailure: true,
            onTimeout: true,
            channels: ['email'],
            recipients: []
          }
        },
        createdBy: 'system'
      }
    };

    this.templates.set(socialMediaTemplate.id, socialMediaTemplate);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API methods
  public getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  public getWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  public getActiveWorkflows(): Workflow[] {
    return this.getWorkflows().filter(workflow => workflow.isActive);
  }

  public getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  public getExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values());
  }

  public getExecutionsByWorkflow(workflowId: string): WorkflowExecution[] {
    return this.getExecutions().filter(exec => exec.workflowId === workflowId);
  }

  public getActiveExecutions(): WorkflowExecution[] {
    return this.getExecutions().filter(exec => exec.status === 'running');
  }

  public getTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }

  public createWorkflowFromTemplate(templateId: string, overrides: Partial<Workflow> = {}): string {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    template.usageCount++;
    
    return this.createWorkflow({
      ...template.workflow,
      ...overrides,
      createdBy: overrides.createdBy || 'user'
    });
  }

  public updateWorkflow(workflowId: string, updates: Partial<Workflow>): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    const updatedWorkflow = { ...workflow, ...updates, updatedAt: new Date() };
    this.workflows.set(workflowId, updatedWorkflow);

    this.emit('workflow:updated', updatedWorkflow);
    return true;
  }

  public deleteWorkflow(workflowId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    // Cancel active executions
    const activeExecutions = this.getExecutionsByWorkflow(workflowId)
      .filter(exec => exec.status === 'running' || exec.status === 'pending');
    
    activeExecutions.forEach(exec => this.cancelExecution(exec.id));

    this.workflows.delete(workflowId);
    this.emit('workflow:deleted', workflow);

    return true;
  }

  public cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status === 'completed' || execution.status === 'failed') {
      return false;
    }

    execution.status = 'cancelled';
    execution.completedAt = new Date();
    execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();

    this.addExecutionLog(execution, 'info', 'Execution cancelled by user');
    this.activeExecutions.delete(executionId);
    this.executions.set(executionId, execution);

    this.emit('execution:cancelled', execution);
    return true;
  }

  public registerService(name: string, service: unknown): void {
    this.services.set(name, service);
    console.log(`🔌 Service registered: ${name}`);
  }

  public getStats(): {
    totalWorkflows: number;
    activeWorkflows: number;
    totalExecutions: number;
    activeExecutions: number;
    queuedExecutions: number;
    successRate: number;
  } {
    const workflows = this.getWorkflows();
    const executions = this.getExecutions();
    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(exec => exec.status === 'completed').length;

    return {
      totalWorkflows: workflows.length,
      activeWorkflows: this.getActiveWorkflows().length,
      totalExecutions,
      activeExecutions: this.getActiveExecutions().length,
      queuedExecutions: this.executionQueue.length,
      successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0
    };
  }

  public shutdown(): void {
    this.isProcessing = false;
    
    // Cancel all active executions
    const activeExecutions = this.getActiveExecutions();
    activeExecutions.forEach(exec => this.cancelExecution(exec.id));

    this.removeAllListeners();
    console.log('🛑 WorkflowEngine shutdown complete');
  }
}

export const workflowEngine = new WorkflowEngine();