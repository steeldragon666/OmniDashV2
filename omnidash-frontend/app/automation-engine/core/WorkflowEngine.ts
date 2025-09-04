import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

// Workflow Types
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  triggers: WorkflowTrigger[];
  actions: WorkflowAction[];
  conditions?: WorkflowCondition[];
  version: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface WorkflowTrigger {
  id: string;
  type: 'webhook' | 'schedule' | 'event' | 'manual' | 'chain';
  config: TriggerConfig;
  enabled: boolean;
}

export interface TriggerConfig {
  webhookUrl?: string;
  cronExpression?: string;
  eventName?: string;
  chainFromWorkflowId?: string;
  conditions?: Record<string, any>;
}

export interface WorkflowAction {
  id: string;
  type: 'ai' | 'social' | 'data' | 'integration' | 'condition' | 'delay' | 'loop';
  name: string;
  config: ActionConfig;
  nextActions?: string[]; // IDs of next actions
  errorHandling?: ErrorHandlingConfig;
  retryPolicy?: RetryPolicy;
}

export interface ActionConfig {
  provider?: string;
  method?: string;
  parameters?: Record<string, any>;
  timeout?: number;
  dependencies?: string[];
}

export interface WorkflowCondition {
  id: string;
  type: 'if' | 'switch' | 'loop' | 'parallel';
  conditions: ConditionRule[];
  trueBranch?: string[];
  falseBranch?: string[];
}

export interface ConditionRule {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'regex';
  value: any;
  combineWith?: 'and' | 'or';
}

export interface ErrorHandlingConfig {
  strategy: 'retry' | 'fallback' | 'ignore' | 'alert';
  maxRetries?: number;
  fallbackAction?: string;
  alertChannels?: string[];
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'fixed' | 'exponential' | 'linear';
  initialDelay: number;
  maxDelay?: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  context: WorkflowContext;
  results: ExecutionResult[];
  error?: Error;
  currentAction?: string;
  progress: number;
}

export interface WorkflowContext {
  variables: Record<string, any>;
  input: Record<string, any>;
  output: Record<string, any>;
  metadata: Record<string, any>;
  secrets?: Record<string, string>;
}

export interface ExecutionResult {
  actionId: string;
  status: 'success' | 'failure' | 'skipped';
  output?: any;
  error?: Error;
  startedAt: Date;
  completedAt: Date;
  duration: number;
}

// Main Workflow Engine Class
export class WorkflowEngine extends EventEmitter {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private actionHandlers: Map<string, ActionHandler> = new Map();
  private isRunning: boolean = false;
  private executionQueue: WorkflowExecution[] = [];

  constructor() {
    super();
    this.initialize();
  }

  private initialize() {
    // Register default action handlers
    this.registerDefaultHandlers();
    
    // Start execution loop
    this.startExecutionLoop();
  }

  // Register a workflow
  public registerWorkflow(workflow: WorkflowDefinition): void {
    if (this.workflows.has(workflow.id)) {
      throw new Error(`Workflow ${workflow.id} already registered`);
    }
    
    // Validate workflow structure
    this.validateWorkflow(workflow);
    
    this.workflows.set(workflow.id, workflow);
    this.emit('workflow:registered', workflow);
    
    console.log(`✅ Workflow registered: ${workflow.name}`);
  }

  // Execute a workflow
  public async executeWorkflow(
    workflowId: string, 
    input: Record<string, any> = {},
    triggerType?: string
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (!workflow.isActive) {
      throw new Error(`Workflow ${workflow.name} is not active`);
    }

    // Create execution instance
    const execution: WorkflowExecution = {
      id: uuidv4(),
      workflowId,
      status: 'pending',
      startedAt: new Date(),
      context: {
        variables: {},
        input,
        output: {},
        metadata: {
          triggerType,
          workflowName: workflow.name,
          version: workflow.version
        }
      },
      results: [],
      progress: 0
    };

    this.executions.set(execution.id, execution);
    this.executionQueue.push(execution);
    
    this.emit('workflow:started', execution);
    
    return execution;
  }

  // Process execution queue
  private async startExecutionLoop() {
    this.isRunning = true;
    
    while (this.isRunning) {
      if (this.executionQueue.length > 0) {
        const execution = this.executionQueue.shift();
        if (execution) {
          await this.processExecution(execution);
        }
      }
      
      // Small delay to prevent CPU overload
      await this.delay(100);
    }
  }

  // Process a single execution
  private async processExecution(execution: WorkflowExecution) {
    try {
      execution.status = 'running';
      this.emit('execution:running', execution);

      const workflow = this.workflows.get(execution.workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // Execute actions in sequence
      for (let i = 0; i < workflow.actions.length; i++) {
        const action = workflow.actions[i];
        execution.currentAction = action.id;
        execution.progress = ((i + 1) / workflow.actions.length) * 100;

        // Check conditions if any
        if (await this.shouldExecuteAction(action, execution)) {
          const result = await this.executeAction(action, execution);
          execution.results.push(result);

          if (result.status === 'failure' && action.errorHandling?.strategy !== 'ignore') {
            await this.handleActionError(action, result, execution);
            if (execution.status === 'failed') break;
          }
        } else {
          execution.results.push({
            actionId: action.id,
            status: 'skipped',
            startedAt: new Date(),
            completedAt: new Date(),
            duration: 0
          });
        }

        this.emit('execution:progress', execution);
      }

      if (execution.status !== 'failed') {
        execution.status = 'completed';
        execution.completedAt = new Date();
        this.emit('workflow:completed', execution);
      }

    } catch (error) {
      execution.status = 'failed';
      execution.error = error as Error;
      execution.completedAt = new Date();
      this.emit('workflow:failed', execution);
    }

    this.executions.set(execution.id, execution);
  }

  // Execute a single action
  private async executeAction(
    action: WorkflowAction,
    execution: WorkflowExecution
  ): Promise<ExecutionResult> {
    const startedAt = new Date();
    let result: ExecutionResult;

    try {
      const handler = this.actionHandlers.get(action.type);
      if (!handler) {
        throw new Error(`No handler for action type: ${action.type}`);
      }

      // Execute with timeout
      const output = await this.executeWithTimeout(
        handler.execute(action, execution.context),
        action.config.timeout || 30000
      );

      result = {
        actionId: action.id,
        status: 'success',
        output,
        startedAt,
        completedAt: new Date(),
        duration: Date.now() - startedAt.getTime()
      };

      // Store output in context for next actions
      execution.context.variables[action.id] = output;

      this.emit('action:success', { action, result, execution });

    } catch (error) {
      result = {
        actionId: action.id,
        status: 'failure',
        error: error as Error,
        startedAt,
        completedAt: new Date(),
        duration: Date.now() - startedAt.getTime()
      };

      this.emit('action:failure', { action, result, execution });
    }

    return result;
  }

  // Handle action errors with retry logic
  private async handleActionError(
    action: WorkflowAction,
    result: ExecutionResult,
    execution: WorkflowExecution
  ): Promise<void> {
    if (!action.errorHandling) return;

    switch (action.errorHandling.strategy) {
      case 'retry':
        const retryPolicy = action.retryPolicy || {
          maxAttempts: 3,
          backoffStrategy: 'exponential',
          initialDelay: 1000
        };

        let attempts = 0;
        let delay = retryPolicy.initialDelay;

        while (attempts < retryPolicy.maxAttempts) {
          attempts++;
          await this.delay(delay);

          const retryResult = await this.executeAction(action, execution);
          if (retryResult.status === 'success') {
            execution.results[execution.results.length - 1] = retryResult;
            return;
          }

          // Calculate next delay
          if (retryPolicy.backoffStrategy === 'exponential') {
            delay *= 2;
          } else if (retryPolicy.backoffStrategy === 'linear') {
            delay += retryPolicy.initialDelay;
          }

          if (retryPolicy.maxDelay && delay > retryPolicy.maxDelay) {
            delay = retryPolicy.maxDelay;
          }
        }

        execution.status = 'failed';
        break;

      case 'fallback':
        if (action.errorHandling.fallbackAction) {
          // Execute fallback action
          const fallbackAction = this.findActionById(
            execution.workflowId,
            action.errorHandling.fallbackAction
          );
          if (fallbackAction) {
            await this.executeAction(fallbackAction, execution);
          }
        }
        break;

      case 'alert':
        // Send alerts to configured channels
        this.emit('alert:error', {
          action,
          error: result.error,
          execution,
          channels: action.errorHandling.alertChannels
        });
        break;

      case 'ignore':
        // Continue execution
        break;
    }
  }

  // Check if action should be executed based on conditions
  private async shouldExecuteAction(
    action: WorkflowAction,
    execution: WorkflowExecution
  ): Promise<boolean> {
    if (action.type !== 'condition') return true;

    // Evaluate conditions
    // This is simplified - in production, you'd have more complex logic
    return true;
  }

  // Register default action handlers
  private registerDefaultHandlers() {
    // AI Action Handler
    this.registerActionHandler('ai', {
      execute: async (action, context) => {
        // AI content generation logic
        return { generated: 'AI content here' };
      }
    });

    // Social Media Action Handler
    this.registerActionHandler('social', {
      execute: async (action, context) => {
        // Social media posting logic
        return { posted: true, postId: 'abc123' };
      }
    });

    // Data Action Handler
    this.registerActionHandler('data', {
      execute: async (action, context) => {
        // Data operations logic
        return { data: 'processed' };
      }
    });

    // Delay Action Handler
    this.registerActionHandler('delay', {
      execute: async (action, context) => {
        const delay = action.config.parameters?.delay || 1000;
        await this.delay(delay);
        return { delayed: delay };
      }
    });
  }

  // Register custom action handler
  public registerActionHandler(type: string, handler: ActionHandler) {
    this.actionHandlers.set(type, handler);
  }

  // Helper methods
  private validateWorkflow(workflow: WorkflowDefinition): void {
    if (!workflow.id || !workflow.name) {
      throw new Error('Workflow must have id and name');
    }
    if (!workflow.actions || workflow.actions.length === 0) {
      throw new Error('Workflow must have at least one action');
    }
  }

  private findActionById(workflowId: string, actionId: string): WorkflowAction | undefined {
    const workflow = this.workflows.get(workflowId);
    return workflow?.actions.find(a => a.id === actionId);
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Action timeout')), timeout)
      )
    ]);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public methods for workflow management
  public getWorkflow(id: string): WorkflowDefinition | undefined {
    return this.workflows.get(id);
  }

  public getExecution(id: string): WorkflowExecution | undefined {
    return this.executions.get(id);
  }

  public getAllWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  public getAllExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values());
  }

  public pauseExecution(executionId: string): void {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'paused';
      this.emit('execution:paused', execution);
    }
  }

  public resumeExecution(executionId: string): void {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'paused') {
      execution.status = 'pending';
      this.executionQueue.push(execution);
      this.emit('execution:resumed', execution);
    }
  }

  public cancelExecution(executionId: string): void {
    const execution = this.executions.get(executionId);
    if (execution && (execution.status === 'running' || execution.status === 'paused')) {
      execution.status = 'cancelled';
      execution.completedAt = new Date();
      this.emit('execution:cancelled', execution);
    }
  }

  public stop(): void {
    this.isRunning = false;
  }
}

// Action Handler Interface
export interface ActionHandler {
  execute: (action: WorkflowAction, context: WorkflowContext) => Promise<any>;
}

// Export singleton instance
export const workflowEngine = new WorkflowEngine();