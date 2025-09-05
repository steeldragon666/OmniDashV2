import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Workflow, WorkflowNode, WorkflowEdge, NodeExecutionResult } from '@/lib/types/workflow';
import { supabase } from '@/lib/database/supabase';
import { BullMQManager } from '@/lib/queue/BullMQManager';
import { SocketIOServer } from '@/lib/realtime/SocketManager';

// Enhanced Workflow Types for React Flow Integration
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  triggers: WorkflowTrigger[];
  version: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
  settings: {
    errorHandling: 'stop' | 'continue' | 'retry';
    timeout: number;
    retryOnFailure: boolean;
    maxRetries: number;
  };
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
  type: string; // Support all React Flow node types
  name: string;
  config: ActionConfig;
  nextActions?: string[];
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

          // Execute nodes using React Flow definition
      const nodes = workflow.nodes || [];
      const edges = workflow.edges || [];
      
      if (nodes.length === 0) {
        throw new Error('Workflow has no nodes to execute');
      }

      // Find starting nodes (nodes without incoming edges)
      const startNodes = this.findStartingNodes(nodes, edges);
      
      if (startNodes.length === 0) {
        throw new Error('No starting nodes found in workflow');
      }

      // Execute nodes in topological order
      const executionOrder = this.calculateExecutionOrder(nodes, edges);
      const nodeResults = new Map<string, NodeExecutionResult>();

      for (let i = 0; i < executionOrder.length; i++) {
        const node = executionOrder[i];
        execution.currentAction = node.id;
        execution.progress = ((i + 1) / executionOrder.length) * 100;

        // Check if node dependencies are satisfied
        const dependencies = this.getNodeDependencies(node.id, edges, nodeResults);
        const canExecute = dependencies.every(dep => 
          nodeResults.has(dep) && nodeResults.get(dep)!.status === 'success'
        );

        if (!canExecute && dependencies.length > 0) {
          const result: NodeExecutionResult = {
            nodeId: node.id,
            status: 'skipped',
            error: 'Dependencies not satisfied',
            duration: 0,
            timestamp: new Date().toISOString()
          };
          nodeResults.set(node.id, result);
          continue;
        }

        try {
          // Convert node to action format for execution
          const action = this.convertNodeToAction(node);
          const result = await this.executeNodeAction(action, execution, nodeResults);
          
          const nodeResult: NodeExecutionResult = {
            nodeId: node.id,
            status: result.status === 'success' ? 'success' : 'error',
            output: result.output,
            error: result.error?.message,
            duration: result.duration,
            timestamp: new Date().toISOString()
          };

          nodeResults.set(node.id, nodeResult);
          execution.results.push(result);

          // Handle node failure based on workflow settings
          if (nodeResult.status === 'error' && workflow.settings?.errorHandling === 'stop') {
            execution.status = 'failed';
            execution.error = new Error(`Node ${node.data.label} failed: ${nodeResult.error}`);
            break;
          }

          // Emit progress update with node-specific data
          this.emit('execution:progress', {
            ...execution,
            currentNode: node,
            nodeResult,
            completedNodes: Array.from(nodeResults.values())
          });

        } catch (error) {
          const nodeResult: NodeExecutionResult = {
            nodeId: node.id,
            status: 'error',
            error: (error as Error).message,
            duration: 0,
            timestamp: new Date().toISOString()
          };
          
          nodeResults.set(node.id, nodeResult);
          
          if (workflow.settings?.errorHandling === 'stop') {
            execution.status = 'failed';
            execution.error = error as Error;
            break;
          }
        }
      }

      // Store final node results in execution context
      execution.context.output.nodeResults = Array.from(nodeResults.values());

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

  // Register default node handlers for React Flow nodes
  private registerDefaultHandlers() {
    // Manual Trigger Handler
    this.registerActionHandler('manual-trigger', {
      execute: async (action, context) => {
        return {
          triggered: true,
          timestamp: new Date().toISOString(),
          data: context.input
        };
      }
    });

    // Webhook Trigger Handler
    this.registerActionHandler('webhook-trigger', {
      execute: async (action, context) => {
        const { method, path } = action.config.parameters || {};
        return {
          webhook: true,
          method: method || 'POST',
          path: path || '/webhook',
          receivedData: context.input
        };
      }
    });

    // Schedule Trigger Handler
    this.registerActionHandler('schedule-trigger', {
      execute: async (action, context) => {
        const { cron, timezone } = action.config.parameters || {};
        return {
          scheduled: true,
          cron: cron || '0 9 * * *',
          timezone: timezone || 'UTC',
          nextRun: this.calculateNextCronRun(cron || '0 9 * * *')
        };
      }
    });

    // Email Trigger Handler
    this.registerActionHandler('email-trigger', {
      execute: async (action, context) => {
        const { folder, filters } = action.config.parameters || {};
        // This would integrate with Gmail API
        return {
          emailReceived: true,
          folder: folder || 'INBOX',
          filters: filters || {},
          mockEmail: {
            from: 'test@example.com',
            subject: 'Test Email',
            body: 'This is a test email for workflow execution.'
          }
        };
      }
    });

    // HTTP Request Action Handler
    this.registerActionHandler('http-action', {
      execute: async (action, context) => {
        const { url, method, headers, body } = action.config.parameters || {};
        
        try {
          const response = await fetch(url, {
            method: method || 'GET',
            headers: { 'Content-Type': 'application/json', ...(headers || {}) },
            body: body ? JSON.stringify(body) : undefined
          });
          
          const data = await response.json();
          
          return {
            success: true,
            status: response.status,
            data,
            url,
            method: method || 'GET'
          };
        } catch (error) {
          throw new Error(`HTTP request failed: ${error}`);
        }
      }
    });

    // Social Media Post Handler
    this.registerActionHandler('social-action', {
      execute: async (action, context) => {
        const { platform, content, imageUrl } = action.config.parameters || {};
        
        // This would integrate with actual social media APIs
        const platforms = ['twitter', 'facebook', 'instagram', 'linkedin'];
        
        if (!platforms.includes(platform)) {
          throw new Error(`Unsupported platform: ${platform}`);
        }
        
        return {
          posted: true,
          platform,
          content,
          imageUrl,
          postId: `${platform}_${uuidv4()}`,
          url: `https://${platform}.com/post/${uuidv4()}`,
          timestamp: new Date().toISOString()
        };
      }
    });

    // Email Action Handler
    this.registerActionHandler('email-action', {
      execute: async (action, context) => {
        const { to, subject, body, attachments } = action.config.parameters || {};
        
        // This would integrate with email service (Gmail, SendGrid, etc.)
        return {
          sent: true,
          to,
          subject,
          body,
          attachments: attachments || [],
          messageId: `msg_${uuidv4()}`,
          timestamp: new Date().toISOString()
        };
      }
    });

    // Database Action Handler
    this.registerActionHandler('database-action', {
      execute: async (action, context) => {
        const { operation, table, data, query } = action.config.parameters || {};
        
        try {
          let result;
          
          switch (operation) {
            case 'insert':
              result = await supabase.from(table).insert(data).select();
              break;
            case 'update':
              result = await supabase.from(table).update(data).match(query || {}).select();
              break;
            case 'delete':
              result = await supabase.from(table).delete().match(query || {}).select();
              break;
            case 'select':
            default:
              result = await supabase.from(table).select('*').match(query || {});
              break;
          }
          
          if (result.error) {
            throw new Error(result.error.message);
          }
          
          return {
            success: true,
            operation,
            table,
            data: result.data,
            count: result.data?.length || 0
          };
        } catch (error) {
          throw new Error(`Database operation failed: ${error}`);
        }
      }
    });

    // JavaScript Code Action Handler
    this.registerActionHandler('javascript-action', {
      execute: async (action, context) => {
        const { code } = action.config.parameters || {};
        
        if (!code) {
          throw new Error('JavaScript code is required');
        }
        
        try {
          // Create a safe execution environment
          const func = new Function('context', 'require', `
            "use strict";
            ${code}
          `);
          
          const result = await func(context, null); // Disable require for security
          
          return {
            executed: true,
            result,
            code: code.substring(0, 100) + (code.length > 100 ? '...' : '')
          };
        } catch (error) {
          throw new Error(`JavaScript execution failed: ${error}`);
        }
      }
    });

    // File Operations Handler
    this.registerActionHandler('file-action', {
      execute: async (action, context) => {
        const { operation, fileName, content, encoding } = action.config.parameters || {};
        
        // This would integrate with file storage service
        return {
          success: true,
          operation,
          fileName,
          fileSize: content?.length || 0,
          encoding: encoding || 'utf8',
          timestamp: new Date().toISOString()
        };
      }
    });

    // Condition/If-Else Handler
    this.registerActionHandler('condition', {
      execute: async (action, context) => {
        const { conditions, operator } = action.config.parameters || {};
        
        if (!conditions || conditions.length === 0) {
          return { result: true, message: 'No conditions specified' };
        }
        
        let result = operator === 'or' ? false : true;
        
        for (const condition of conditions) {
          const { field, comparison, value } = condition;
          const contextValue = this.getValueFromContext(field, context);
          const conditionResult = this.evaluateCondition(contextValue, comparison, value);
          
          if (operator === 'or') {
            result = result || conditionResult;
          } else {
            result = result && conditionResult;
          }
        }
        
        return {
          result,
          conditions,
          operator: operator || 'and',
          evaluation: conditions.map(c => ({
            field: c.field,
            actual: this.getValueFromContext(c.field, context),
            expected: c.value,
            comparison: c.comparison,
            result: this.evaluateCondition(
              this.getValueFromContext(c.field, context), 
              c.comparison, 
              c.value
            )
          }))
        };
      }
    });

    // Switch/Multiple Conditions Handler
    this.registerActionHandler('switch-condition', {
      execute: async (action, context) => {
        const { field, cases, defaultCase } = action.config.parameters || {};
        const value = this.getValueFromContext(field, context);
        
        for (const caseItem of cases || []) {
          if (caseItem.value === value) {
            return {
              matched: true,
              field,
              value,
              matchedCase: caseItem,
              result: caseItem.result
            };
          }
        }
        
        return {
          matched: false,
          field,
          value,
          defaultCase,
          result: defaultCase
        };
      }
    });

    // Delay/Wait Handler
    this.registerActionHandler('delay', {
      execute: async (action, context) => {
        const { duration, unit } = action.config.parameters || {};
        const delay = this.convertToMilliseconds(duration || 1000, unit || 'ms');
        
        await this.delay(delay);
        
        return {
          delayed: true,
          duration: delay,
          unit: unit || 'ms',
          startTime: new Date().toISOString()
        };
      }
    });

    // Data Transform Handler
    this.registerActionHandler('data-transform', {
      execute: async (action, context) => {
        const { transformations } = action.config.parameters || {};
        const data = { ...context.variables };
        
        for (const transform of transformations || []) {
          switch (transform.type) {
            case 'map':
              if (Array.isArray(data[transform.source])) {
                data[transform.target] = data[transform.source].map(
                  item => transform.mapping(item)
                );
              }
              break;
            case 'filter':
              if (Array.isArray(data[transform.source])) {
                data[transform.target] = data[transform.source].filter(
                  item => transform.condition(item)
                );
              }
              break;
            case 'format':
              data[transform.target] = this.formatValue(
                data[transform.source], 
                transform.format
              );
              break;
          }
        }
        
        return {
          transformed: true,
          transformations: transformations?.length || 0,
          data
        };
      }
    });

    // Variable Setter Handler
    this.registerActionHandler('variable-setter', {
      execute: async (action, context) => {
        const { variables } = action.config.parameters || {};
        
        for (const [key, value] of Object.entries(variables || {})) {
          context.variables[key] = value;
        }
        
        return {
          set: true,
          variables: Object.keys(variables || {}),
          count: Object.keys(variables || {}).length
        };
      }
    });

    // Logger Handler
    this.registerActionHandler('logger', {
      execute: async (action, context) => {
        const { message, level, data } = action.config.parameters || {};
        
        const logEntry = {
          timestamp: new Date().toISOString(),
          level: level || 'info',
          message: message || 'Log entry',
          data: data || {},
          context: {
            variables: Object.keys(context.variables),
            input: Object.keys(context.input),
            output: Object.keys(context.output)
          }
        };
        
        console.log(`[${logEntry.level.toUpperCase()}] ${logEntry.message}`, logEntry);
        
        return {
          logged: true,
          entry: logEntry
        };
      }
    });

    // Notification Handler
    this.registerActionHandler('notification-action', {
      execute: async (action, context) => {
        const { title, message, channels, priority } = action.config.parameters || {};
        
        // This would integrate with notification services
        const notification = {
          id: uuidv4(),
          title: title || 'Workflow Notification',
          message: message || 'A workflow step has completed',
          channels: channels || ['email'],
          priority: priority || 'normal',
          timestamp: new Date().toISOString(),
          delivered: true
        };
        
        return {
          sent: true,
          notification
        };
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

  // Helper methods for node-based execution
  private findStartingNodes(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
    const nodesWithIncoming = new Set(edges.map(edge => edge.target));
    return nodes.filter(node => !nodesWithIncoming.has(node.id));
  }

  private calculateExecutionOrder(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: WorkflowNode[] = [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    const visit = (nodeId: string) => {
      if (visiting.has(nodeId)) {
        throw new Error(`Circular dependency detected involving node ${nodeId}`);
      }
      
      if (visited.has(nodeId)) {
        return;
      }

      visiting.add(nodeId);
      
      // Visit dependencies first
      const dependencies = edges
        .filter(edge => edge.target === nodeId)
        .map(edge => edge.source);
      
      for (const depId of dependencies) {
        visit(depId);
      }
      
      visiting.delete(nodeId);
      visited.add(nodeId);
      
      const node = nodeMap.get(nodeId);
      if (node) {
        order.push(node);
      }
    };

    // Start with nodes that have no dependencies
    const startNodes = this.findStartingNodes(nodes, edges);
    for (const startNode of startNodes) {
      visit(startNode.id);
    }

    // Visit any remaining nodes (in case of disconnected components)
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        visit(node.id);
      }
    }

    return order;
  }

  private getNodeDependencies(nodeId: string, edges: WorkflowEdge[], results: Map<string, NodeExecutionResult>): string[] {
    return edges
      .filter(edge => edge.target === nodeId)
      .map(edge => edge.source);
  }

  private convertNodeToAction(node: WorkflowNode): WorkflowAction {
    return {
      id: node.id,
      type: node.type,
      name: node.data.label,
      config: {
        parameters: node.data.config || {},
        timeout: 30000
      }
    };
  }

  private async executeNodeAction(
    action: WorkflowAction,
    execution: WorkflowExecution,
    nodeResults: Map<string, NodeExecutionResult>
  ): Promise<ExecutionResult> {
    const startedAt = new Date();
    
    try {
      // Enhance context with previous node outputs
      const enhancedContext = {
        ...execution.context,
        nodeResults: Object.fromEntries(nodeResults),
        previousOutputs: Array.from(nodeResults.values())
          .filter(result => result.output)
          .reduce((acc, result) => ({ ...acc, [result.nodeId]: result.output }), {})
      };

      const handler = this.actionHandlers.get(action.type);
      if (!handler) {
        throw new Error(`No handler for node type: ${action.type}`);
      }

      const output = await this.executeWithTimeout(
        handler.execute(action, enhancedContext),
        action.config.timeout || 30000
      );

      const result: ExecutionResult = {
        actionId: action.id,
        status: 'success',
        output,
        startedAt,
        completedAt: new Date(),
        duration: Date.now() - startedAt.getTime()
      };

      // Store output for dependent nodes
      execution.context.variables[action.id] = output;
      
      this.emit('node:success', { node: action, result, execution });
      return result;

    } catch (error) {
      const result: ExecutionResult = {
        actionId: action.id,
        status: 'failure',
        error: error as Error,
        startedAt,
        completedAt: new Date(),
        duration: Date.now() - startedAt.getTime()
      };

      this.emit('node:failure', { node: action, result, execution });
      return result;
    }
  }

  private calculateNextCronRun(cron: string): string {
    // Simple cron calculation - in production use a proper cron library
    const now = new Date();
    const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next day
    return nextRun.toISOString();
  }

  private getValueFromContext(path: string, context: WorkflowContext): any {
    const parts = path.split('.');
    let value: any = context;
    
    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) break;
    }
    
    return value;
  }

  private evaluateCondition(actual: any, comparison: string, expected: any): boolean {
    switch (comparison) {
      case 'equals':
      case '==':
        return actual == expected;
      case 'not_equals':
      case '!=':
        return actual != expected;
      case 'greater_than':
      case '>':
        return actual > expected;
      case 'less_than':
      case '<':
        return actual < expected;
      case 'greater_equal':
      case '>=':
        return actual >= expected;
      case 'less_equal':
      case '<=':
        return actual <= expected;
      case 'contains':
        return String(actual).includes(String(expected));
      case 'starts_with':
        return String(actual).startsWith(String(expected));
      case 'ends_with':
        return String(actual).endsWith(String(expected));
      case 'regex':
        return new RegExp(expected).test(String(actual));
      case 'is_empty':
        return !actual || actual === '' || (Array.isArray(actual) && actual.length === 0);
      case 'is_not_empty':
        return actual && actual !== '' && (!Array.isArray(actual) || actual.length > 0);
      default:
        return false;
    }
  }

  private convertToMilliseconds(duration: number, unit: string): number {
    switch (unit) {
      case 'ms':
      case 'milliseconds':
        return duration;
      case 's':
      case 'seconds':
        return duration * 1000;
      case 'm':
      case 'minutes':
        return duration * 60 * 1000;
      case 'h':
      case 'hours':
        return duration * 60 * 60 * 1000;
      case 'd':
      case 'days':
        return duration * 24 * 60 * 60 * 1000;
      default:
        return duration;
    }
  }

  private formatValue(value: any, format: string): any {
    if (!value) return value;
    
    switch (format) {
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'capitalize':
        return String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase();
      case 'json':
        return JSON.stringify(value, null, 2);
      case 'csv':
        if (Array.isArray(value)) {
          return value.map(item => 
            typeof item === 'object' ? Object.values(item).join(',') : String(item)
          ).join('\n');
        }
        return String(value);
      case 'date_iso':
        return new Date(value).toISOString();
      case 'date_local':
        return new Date(value).toLocaleString();
      default:
        return value;
    }
  }

  // Enhanced workflow validation for React Flow
  public validateWorkflowDefinition(workflow: WorkflowDefinition): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push('Workflow must contain at least one node');
    }
    
    // Check for orphaned nodes
    const startNodes = this.findStartingNodes(workflow.nodes || [], workflow.edges || []);
    if (startNodes.length === 0 && (workflow.nodes?.length || 0) > 0) {
      errors.push('Workflow must have at least one starting node (node without incoming connections)');
    }
    
    // Check for circular dependencies
    try {
      this.calculateExecutionOrder(workflow.nodes || [], workflow.edges || []);
    } catch (error) {
      errors.push(`Circular dependency detected: ${(error as Error).message}`);
    }
    
    // Validate node configurations
    for (const node of workflow.nodes || []) {
      if (!node.id || !node.type) {
        errors.push(`Node ${node.data?.label || 'unknown'} is missing id or type`);
      }
      
      if (!this.actionHandlers.has(node.type)) {
        errors.push(`No handler available for node type: ${node.type}`);
      }
    }
    
    // Validate edges
    const nodeIds = new Set((workflow.nodes || []).map(n => n.id));
    for (const edge of workflow.edges || []) {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge references non-existent source node: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge references non-existent target node: ${edge.target}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Real-time execution methods
  public async executeWorkflowRealTime(
    workflowId: string,
    input: Record<string, any> = {},
    socketManager?: SocketIOServer
  ): Promise<WorkflowExecution> {
    const execution = await this.executeWorkflow(workflowId, input);
    
    // Set up real-time progress updates
    if (socketManager) {
      this.on('execution:progress', (data) => {
        if (data.id === execution.id) {
          socketManager.sendToWorkflow(workflowId, 'execution:progress', data);
        }
      });
      
      this.on('node:success', (data) => {
        if (data.execution.id === execution.id) {
          socketManager.sendToWorkflow(workflowId, 'node:completed', {
            nodeId: data.node.id,
            result: data.result,
            timestamp: new Date().toISOString()
          });
        }
      });
      
      this.on('node:failure', (data) => {
        if (data.execution.id === execution.id) {
          socketManager.sendToWorkflow(workflowId, 'node:failed', {
            nodeId: data.node.id,
            error: data.result.error?.message,
            timestamp: new Date().toISOString()
          });
        }
      });
    }
    
    return execution;
  }
}

// Action Handler Interface
export interface ActionHandler {
  execute: (action: WorkflowAction, context: WorkflowContext) => Promise<any>;
}

// Export singleton instance
export const workflowEngine = new WorkflowEngine();