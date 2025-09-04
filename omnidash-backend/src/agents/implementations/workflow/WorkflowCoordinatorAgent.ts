/**
 * Workflow Coordinator Agent
 * Orchestrates complex workflows by coordinating multiple agents and managing execution flow
 */

import { BaseAgent } from '../../core/BaseAgent';
import {
  IWorkflowAgent,
  AgentConfig,
  AgentTask,
  AgentCapability,
  WorkflowDefinition,
  WorkflowStep,
  WorkflowTrigger,
  WorkflowCondition,
  WorkflowSettings,
  RetryPolicy,
  TaskContext,
  AgentError,
  AgentEventType,
  EventSeverity
} from '../../types/AgentTypes';
import { agentRegistry } from '../../core/AgentRegistry';
import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  currentStep?: string;
  completedSteps: string[];
  failedSteps: string[];
  stepResults: Map<string, any>;
  stepErrors: Map<string, AgentError>;
  input?: any;
  output?: any;
  context: WorkflowExecutionContext;
  retryCount: number;
  maxRetries: number;
  lastError?: AgentError;
}

export interface WorkflowExecutionContext {
  userId?: string;
  sessionId: string;
  correlationId: string;
  parentExecutionId?: string;
  variables: Map<string, any>;
  metadata: Record<string, any>;
  environment: string;
  priority: number;
  timeout?: number;
}

export interface StepExecution {
  stepId: string;
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  input?: any;
  output?: any;
  error?: AgentError;
  retryCount: number;
  agentId?: string;
  taskId?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  template: WorkflowDefinition;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    default?: any;
    description: string;
  }>;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Workflow orchestration and coordination agent
 */
export class WorkflowCoordinatorAgent extends BaseAgent implements IWorkflowAgent {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private stepExecutions: Map<string, StepExecution> = new Map();
  private templates: Map<string, WorkflowTemplate> = new Map();
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private webhookHandlers: Map<string, Function> = new Map();
  private executionQueue: string[] = [];
  private isProcessingQueue: boolean = false;
  private maxConcurrentExecutions: number = 10;
  private currentExecutions: number = 0;

  constructor(config: AgentConfig) {
    super(config);
    this.maxConcurrentExecutions = config.maxConcurrentTasks || 10;
    this.setupCapabilities();
    this.startQueueProcessor();
  }

  // =====================================
  // Agent Lifecycle
  // =====================================

  protected async onInitialize(): Promise<void> {
    await this.loadWorkflowDefinitions();
    await this.loadWorkflowTemplates();
    await this.resumePendingExecutions();
    this.setupEventListeners();
    this.logger.info('WorkflowCoordinatorAgent initialized successfully');
  }

  protected async onStart(): Promise<void> {
    await this.registerScheduledWorkflows();
    this.startQueueProcessor();
    this.logger.info('WorkflowCoordinatorAgent started and ready');
  }

  protected async onStop(): Promise<void> {
    await this.pauseAllExecutions();
    this.stopAllCronJobs();
    this.isProcessingQueue = false;
    await this.saveState();
    this.logger.info('WorkflowCoordinatorAgent stopped');
  }

  // =====================================
  // Task Processing
  // =====================================

  public canHandleTask(task: AgentTask): boolean {
    const supportedTypes = [
      'execute-workflow',
      'pause-workflow',
      'resume-workflow',
      'cancel-workflow',
      'get-workflow-status',
      'create-workflow',
      'update-workflow',
      'delete-workflow',
      'get-execution-history',
      'retry-failed-step',
      'create-template',
      'execute-template'
    ];
    return supportedTypes.includes(task.type);
  }

  protected async executeTask(task: AgentTask): Promise<any> {
    const startTime = Date.now();
    
    try {
      let result: any;

      switch (task.type) {
        case 'execute-workflow':
          result = await this.handleExecuteWorkflow(task);
          break;
        case 'pause-workflow':
          result = await this.handlePauseWorkflow(task);
          break;
        case 'resume-workflow':
          result = await this.handleResumeWorkflow(task);
          break;
        case 'cancel-workflow':
          result = await this.handleCancelWorkflow(task);
          break;
        case 'get-workflow-status':
          result = await this.handleGetWorkflowStatus(task);
          break;
        case 'create-workflow':
          result = await this.handleCreateWorkflow(task);
          break;
        case 'update-workflow':
          result = await this.handleUpdateWorkflow(task);
          break;
        case 'delete-workflow':
          result = await this.handleDeleteWorkflow(task);
          break;
        case 'get-execution-history':
          result = await this.handleGetExecutionHistory(task);
          break;
        case 'retry-failed-step':
          result = await this.handleRetryFailedStep(task);
          break;
        case 'create-template':
          result = await this.handleCreateTemplate(task);
          break;
        case 'execute-template':
          result = await this.handleExecuteTemplate(task);
          break;
        default:
          throw new Error(`Unsupported task type: ${task.type}`);
      }

      const duration = Date.now() - startTime;
      this.metricsCollector.recordTaskCompletion(task.type, duration, true);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsCollector.recordTaskCompletion(task.type, duration, false);
      throw error;
    }
  }

  protected async validateTaskPayload(task: AgentTask): Promise<boolean> {
    if (!task.payload) return false;

    switch (task.type) {
      case 'execute-workflow':
        return !!(task.payload.workflowId || task.payload.workflow);
      case 'pause-workflow':
      case 'resume-workflow':
      case 'cancel-workflow':
      case 'get-workflow-status':
        return !!task.payload.executionId;
      case 'create-workflow':
      case 'update-workflow':
        return !!task.payload.workflow;
      case 'delete-workflow':
        return !!task.payload.workflowId;
      case 'retry-failed-step':
        return !!(task.payload.executionId && task.payload.stepId);
      case 'create-template':
        return !!task.payload.template;
      case 'execute-template':
        return !!task.payload.templateId;
      default:
        return true;
    }
  }

  // =====================================
  // IWorkflowAgent Implementation
  // =====================================

  public async executeWorkflow(workflowId: string, input?: any): Promise<any> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const execution = this.createWorkflowExecution(workflow, input);
    this.executions.set(execution.id, execution);
    this.executionQueue.push(execution.id);

    this.logger.info(`Workflow ${workflowId} queued for execution: ${execution.id}`);
    
    return {
      executionId: execution.id,
      status: execution.status,
      startTime: execution.startTime
    };
  }

  public async pauseWorkflow(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (execution.status !== 'running') {
      throw new Error(`Cannot pause execution ${executionId} - not running`);
    }

    execution.status = 'paused';
    await this.pauseCurrentStep(execution);
    
    this.logger.info(`Workflow execution ${executionId} paused`);
  }

  public async resumeWorkflow(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (execution.status !== 'paused') {
      throw new Error(`Cannot resume execution ${executionId} - not paused`);
    }

    execution.status = 'running';
    this.executionQueue.push(executionId);
    
    this.logger.info(`Workflow execution ${executionId} resumed`);
  }

  public async cancelWorkflow(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (execution.status === 'completed' || execution.status === 'cancelled') {
      throw new Error(`Cannot cancel execution ${executionId} - already ${execution.status}`);
    }

    execution.status = 'cancelled';
    execution.endTime = new Date();
    
    await this.cancelCurrentStep(execution);
    
    this.logger.info(`Workflow execution ${executionId} cancelled`);
  }

  public async coordinateStep(stepId: string, context: any): Promise<any> {
    const step = await this.getStepDefinition(stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found`);
    }

    return await this.executeStep(step, context);
  }

  public async handleStepFailure(stepId: string, error: AgentError): Promise<any> {
    const stepExecution = Array.from(this.stepExecutions.values())
      .find(se => se.stepId === stepId && se.status === 'running');
    
    if (!stepExecution) {
      throw new Error(`Active step execution for ${stepId} not found`);
    }

    const execution = this.executions.get(stepExecution.executionId);
    if (!execution) {
      throw new Error(`Execution ${stepExecution.executionId} not found`);
    }

    stepExecution.status = 'failed';
    stepExecution.error = error;
    stepExecution.endTime = new Date();
    execution.stepErrors.set(stepId, error);

    // Handle retry logic
    const step = await this.getStepDefinition(stepId);
    if (step?.retry && stepExecution.retryCount < step.retry.maxAttempts) {
      await this.scheduleStepRetry(stepExecution, step.retry);
    } else {
      await this.handleWorkflowFailure(execution, error);
    }
  }

  public async getWorkflowStatus(executionId: string): Promise<any> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    const stepStatuses = Array.from(this.stepExecutions.values())
      .filter(se => se.executionId === executionId)
      .map(se => ({
        stepId: se.stepId,
        status: se.status,
        startTime: se.startTime,
        endTime: se.endTime,
        duration: se.duration,
        error: se.error?.message
      }));

    return {
      executionId: execution.id,
      workflowId: execution.workflowId,
      status: execution.status,
      startTime: execution.startTime,
      endTime: execution.endTime,
      duration: execution.duration,
      currentStep: execution.currentStep,
      completedSteps: execution.completedSteps,
      failedSteps: execution.failedSteps,
      retryCount: execution.retryCount,
      steps: stepStatuses
    };
  }

  public async getWorkflowHistory(workflowId: string): Promise<any[]> {
    const executions = Array.from(this.executions.values())
      .filter(exec => exec.workflowId === workflowId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    return executions.map(exec => ({
      executionId: exec.id,
      status: exec.status,
      startTime: exec.startTime,
      endTime: exec.endTime,
      duration: exec.duration,
      completedSteps: exec.completedSteps.length,
      failedSteps: exec.failedSteps.length
    }));
  }

  // =====================================
  // Task Handlers
  // =====================================

  private async handleExecuteWorkflow(task: AgentTask): Promise<any> {
    const { workflowId, workflow, input, context } = task.payload;
    
    if (workflowId) {
      return await this.executeWorkflow(workflowId, input);
    } else if (workflow) {
      // Execute inline workflow definition
      const tempId = uuidv4();
      this.workflows.set(tempId, workflow);
      try {
        return await this.executeWorkflow(tempId, input);
      } finally {
        this.workflows.delete(tempId);
      }
    } else {
      throw new Error('Either workflowId or workflow definition is required');
    }
  }

  private async handlePauseWorkflow(task: AgentTask): Promise<void> {
    const { executionId } = task.payload;
    await this.pauseWorkflow(executionId);
  }

  private async handleResumeWorkflow(task: AgentTask): Promise<void> {
    const { executionId } = task.payload;
    await this.resumeWorkflow(executionId);
  }

  private async handleCancelWorkflow(task: AgentTask): Promise<void> {
    const { executionId } = task.payload;
    await this.cancelWorkflow(executionId);
  }

  private async handleGetWorkflowStatus(task: AgentTask): Promise<any> {
    const { executionId } = task.payload;
    return await this.getWorkflowStatus(executionId);
  }

  private async handleCreateWorkflow(task: AgentTask): Promise<string> {
    const { workflow } = task.payload;
    const workflowId = uuidv4();
    
    workflow.id = workflowId;
    this.workflows.set(workflowId, workflow);
    await this.saveWorkflowDefinition(workflow);
    
    this.logger.info(`Workflow created: ${workflowId}`);
    return workflowId;
  }

  private async handleUpdateWorkflow(task: AgentTask): Promise<void> {
    const { workflowId, workflow } = task.payload;
    
    if (!this.workflows.has(workflowId || workflow.id)) {
      throw new Error(`Workflow ${workflowId || workflow.id} not found`);
    }

    const id = workflowId || workflow.id;
    workflow.id = id;
    this.workflows.set(id, workflow);
    await this.saveWorkflowDefinition(workflow);
    
    this.logger.info(`Workflow updated: ${id}`);
  }

  private async handleDeleteWorkflow(task: AgentTask): Promise<void> {
    const { workflowId } = task.payload;
    
    if (!this.workflows.has(workflowId)) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    this.workflows.delete(workflowId);
    await this.deleteWorkflowDefinition(workflowId);
    
    this.logger.info(`Workflow deleted: ${workflowId}`);
  }

  private async handleGetExecutionHistory(task: AgentTask): Promise<any[]> {
    const { workflowId, limit = 50, offset = 0 } = task.payload;
    
    if (workflowId) {
      return await this.getWorkflowHistory(workflowId);
    } else {
      // Return all execution history
      return Array.from(this.executions.values())
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
        .slice(offset, offset + limit)
        .map(exec => ({
          executionId: exec.id,
          workflowId: exec.workflowId,
          status: exec.status,
          startTime: exec.startTime,
          endTime: exec.endTime,
          duration: exec.duration
        }));
    }
  }

  private async handleRetryFailedStep(task: AgentTask): Promise<void> {
    const { executionId, stepId } = task.payload;
    
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    const stepExecution = Array.from(this.stepExecutions.values())
      .find(se => se.executionId === executionId && se.stepId === stepId);
    
    if (!stepExecution) {
      throw new Error(`Step execution for ${stepId} not found`);
    }

    if (stepExecution.status !== 'failed') {
      throw new Error(`Step ${stepId} is not in failed status`);
    }

    // Reset step execution
    stepExecution.status = 'pending';
    stepExecution.error = undefined;
    stepExecution.retryCount++;
    
    // Re-queue for execution
    this.executionQueue.push(executionId);
    
    this.logger.info(`Step ${stepId} queued for retry (attempt ${stepExecution.retryCount})`);
  }

  private async handleCreateTemplate(task: AgentTask): Promise<string> {
    const { template } = task.payload;
    const templateId = uuidv4();
    
    const workflowTemplate: WorkflowTemplate = {
      id: templateId,
      ...template,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.templates.set(templateId, workflowTemplate);
    await this.saveWorkflowTemplate(workflowTemplate);
    
    this.logger.info(`Workflow template created: ${templateId}`);
    return templateId;
  }

  private async handleExecuteTemplate(task: AgentTask): Promise<any> {
    const { templateId, parameters, input } = task.payload;
    
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Create workflow from template
    const workflow = this.instantiateTemplate(template, parameters);
    const workflowId = uuidv4();
    workflow.id = workflowId;
    
    // Store temporarily
    this.workflows.set(workflowId, workflow);
    
    try {
      return await this.executeWorkflow(workflowId, input);
    } finally {
      // Clean up temporary workflow
      this.workflows.delete(workflowId);
    }
  }

  // =====================================
  // Workflow Execution Engine
  // =====================================

  private createWorkflowExecution(workflow: WorkflowDefinition, input?: any): WorkflowExecution {
    const executionId = uuidv4();
    
    return {
      id: executionId,
      workflowId: workflow.id,
      status: 'pending',
      startTime: new Date(),
      currentStep: undefined,
      completedSteps: [],
      failedSteps: [],
      stepResults: new Map(),
      stepErrors: new Map(),
      input,
      context: {
        sessionId: uuidv4(),
        correlationId: uuidv4(),
        variables: new Map(Object.entries(workflow.variables || {})),
        metadata: {},
        environment: process.env.NODE_ENV || 'development',
        priority: 1
      },
      retryCount: 0,
      maxRetries: workflow.settings.maxRetries || 3
    };
  }

  private async executeWorkflowInternal(execution: WorkflowExecution): Promise<void> {
    const workflow = this.workflows.get(execution.workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${execution.workflowId} not found`);
    }

    try {
      execution.status = 'running';
      this.currentExecutions++;

      this.logger.info(`Starting workflow execution: ${execution.id}`);

      // Execute workflow steps
      const rootSteps = this.findRootSteps(workflow.steps);
      await this.executeSteps(execution, rootSteps);

      // Check if workflow completed successfully
      if (execution.failedSteps.length === 0) {
        execution.status = 'completed';
        execution.output = this.calculateWorkflowOutput(execution);
      } else {
        execution.status = 'failed';
      }

    } catch (error) {
      execution.status = 'failed';
      execution.lastError = this.createAgentError(error as Error);
      this.logger.error(`Workflow execution ${execution.id} failed:`, error);
    } finally {
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      this.currentExecutions--;
      
      await this.saveExecutionState(execution);
      this.notifyExecutionComplete(execution);
    }
  }

  private async executeSteps(execution: WorkflowExecution, steps: WorkflowStep[]): Promise<void> {
    for (const step of steps) {
      if (execution.status !== 'running') {
        break; // Execution was paused or cancelled
      }

      // Check step conditions
      if (step.conditions && !this.evaluateConditions(step.conditions, execution)) {
        this.logger.info(`Step ${step.id} skipped due to conditions`);
        continue;
      }

      execution.currentStep = step.id;
      
      try {
        const stepResult = await this.executeStep(step, execution);
        execution.stepResults.set(step.id, stepResult);
        execution.completedSteps.push(step.id);

        // Update workflow variables with step results
        if (stepResult && typeof stepResult === 'object') {
          Object.entries(stepResult).forEach(([key, value]) => {
            execution.context.variables.set(key, value);
          });
        }

        // Execute success steps
        if (step.onSuccess && step.onSuccess.length > 0) {
          const successSteps = step.onSuccess
            .map(stepId => this.findStepById(execution.workflowId, stepId))
            .filter(Boolean) as WorkflowStep[];
          
          if (step.type === 'parallel') {
            await this.executeStepsInParallel(execution, successSteps);
          } else {
            await this.executeSteps(execution, successSteps);
          }
        }

      } catch (error) {
        execution.failedSteps.push(step.id);
        execution.stepErrors.set(step.id, this.createAgentError(error as Error));
        
        this.logger.error(`Step ${step.id} failed:`, error);

        // Execute failure steps
        if (step.onFailure && step.onFailure.length > 0) {
          const failureSteps = step.onFailure
            .map(stepId => this.findStepById(execution.workflowId, stepId))
            .filter(Boolean) as WorkflowStep[];
          
          await this.executeSteps(execution, failureSteps);
        } else if (!step.retry || execution.retryCount >= (step.retry.maxAttempts || 0)) {
          // No failure handling and no retries - fail the workflow
          throw error;
        }
      }
    }
  }

  private async executeStepsInParallel(execution: WorkflowExecution, steps: WorkflowStep[]): Promise<void> {
    const stepPromises = steps.map(step => this.executeStep(step, execution));
    const results = await Promise.allSettled(stepPromises);

    results.forEach((result, index) => {
      const step = steps[index];
      
      if (result.status === 'fulfilled') {
        execution.stepResults.set(step.id, result.value);
        execution.completedSteps.push(step.id);
      } else {
        execution.failedSteps.push(step.id);
        execution.stepErrors.set(step.id, this.createAgentError(result.reason));
      }
    });
  }

  private async executeStep(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
    const stepExecution: StepExecution = {
      stepId: step.id,
      executionId: execution.id,
      status: 'pending',
      retryCount: 0,
      agentId: step.agentId
    };

    this.stepExecutions.set(`${execution.id}:${step.id}`, stepExecution);

    try {
      stepExecution.status = 'running';
      stepExecution.startTime = new Date();

      let result: any;

      switch (step.type) {
        case 'agent':
          result = await this.executeAgentStep(step, execution);
          break;
        case 'condition':
          result = await this.executeConditionStep(step, execution);
          break;
        case 'parallel':
          result = await this.executeParallelStep(step, execution);
          break;
        case 'delay':
          result = await this.executeDelayStep(step, execution);
          break;
        case 'webhook':
          result = await this.executeWebhookStep(step, execution);
          break;
        default:
          throw new Error(`Unsupported step type: ${step.type}`);
      }

      stepExecution.status = 'completed';
      stepExecution.output = result;
      stepExecution.endTime = new Date();
      stepExecution.duration = stepExecution.endTime.getTime() - (stepExecution.startTime?.getTime() || 0);

      return result;

    } catch (error) {
      stepExecution.status = 'failed';
      stepExecution.error = this.createAgentError(error as Error);
      stepExecution.endTime = new Date();
      stepExecution.duration = stepExecution.endTime.getTime() - (stepExecution.startTime?.getTime() || 0);

      throw error;
    }
  }

  private async executeAgentStep(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
    if (!step.agentId) {
      throw new Error(`Agent ID is required for agent step: ${step.id}`);
    }

    const agent = agentRegistry.getAgent(step.agentId);
    if (!agent) {
      throw new Error(`Agent ${step.agentId} not found`);
    }

    // Prepare step input with workflow variables
    const stepInput = this.prepareStepInput(step.config, execution);

    const task: AgentTask = {
      id: uuidv4(),
      agentId: step.agentId,
      type: step.config.taskType || 'execute',
      status: 'pending' as any,
      priority: execution.context.priority as any,
      payload: stepInput,
      context: this.createTaskContext(execution),
      metadata: {
        estimatedDuration: step.config.estimatedDuration,
        tags: [step.id, execution.workflowId],
        labels: {}
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      retryCount: 0,
      maxRetries: step.retry?.maxAttempts || 0
    };

    return await agent.processTask(task);
  }

  private async executeConditionStep(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
    const conditions = step.config.conditions as WorkflowCondition[];
    const result = this.evaluateConditions(conditions, execution);
    
    return { conditionResult: result };
  }

  private async executeParallelStep(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
    const parallelSteps = step.config.steps as WorkflowStep[];
    await this.executeStepsInParallel(execution, parallelSteps);
    
    return { parallelStepsCompleted: parallelSteps.length };
  }

  private async executeDelayStep(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
    const delayMs = step.config.delay || 1000;
    await new Promise(resolve => setTimeout(resolve, delayMs));
    
    return { delayed: delayMs };
  }

  private async executeWebhookStep(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
    const { url, method = 'POST', headers = {}, data } = step.config;
    
    const axios = require('axios');
    const response = await axios.request({
      url,
      method,
      headers,
      data: data || this.prepareStepInput(step.config, execution)
    });

    return response.data;
  }

  // =====================================
  // Helper Methods
  // =====================================

  private findRootSteps(steps: WorkflowStep[]): WorkflowStep[] {
    return steps.filter(step => 
      !steps.some(otherStep => 
        otherStep.onSuccess?.includes(step.id) || 
        otherStep.onFailure?.includes(step.id)
      )
    );
  }

  private findStepById(workflowId: string, stepId: string): WorkflowStep | null {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return null;
    
    return workflow.steps.find(step => step.id === stepId) || null;
  }

  private evaluateConditions(conditions: WorkflowCondition[], execution: WorkflowExecution): boolean {
    if (!conditions || conditions.length === 0) return true;

    let result = true;
    let currentLogicalOperator: 'and' | 'or' = 'and';

    for (const condition of conditions) {
      const conditionResult = this.evaluateSingleCondition(condition, execution);
      
      if (currentLogicalOperator === 'and') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }

      currentLogicalOperator = condition.logicalOperator || 'and';
    }

    return result;
  }

  private evaluateSingleCondition(condition: WorkflowCondition, execution: WorkflowExecution): boolean {
    const value = execution.context.variables.get(condition.field);
    
    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'ne':
        return value !== condition.value;
      case 'gt':
        return Number(value) > Number(condition.value);
      case 'lt':
        return Number(value) < Number(condition.value);
      case 'gte':
        return Number(value) >= Number(condition.value);
      case 'lte':
        return Number(value) <= Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'contains':
        return String(value).includes(String(condition.value));
      default:
        return false;
    }
  }

  private prepareStepInput(config: Record<string, any>, execution: WorkflowExecution): any {
    const input = { ...config };
    
    // Replace variable placeholders
    const replaceVariables = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.replace(/\$\{(\w+)\}/g, (match, varName) => {
          return execution.context.variables.get(varName) || match;
        });
      } else if (Array.isArray(obj)) {
        return obj.map(replaceVariables);
      } else if (typeof obj === 'object' && obj !== null) {
        const result: any = {};
        Object.entries(obj).forEach(([key, value]) => {
          result[key] = replaceVariables(value);
        });
        return result;
      }
      return obj;
    };

    return replaceVariables(input);
  }

  private createTaskContext(execution: WorkflowExecution): TaskContext {
    return {
      sessionId: execution.context.sessionId,
      correlationId: execution.context.correlationId,
      workflowId: execution.workflowId,
      requestId: uuidv4(),
      source: 'workflow-coordinator',
      environment: execution.context.environment,
      customData: {
        executionId: execution.id,
        workflowVariables: Object.fromEntries(execution.context.variables)
      }
    };
  }

  private calculateWorkflowOutput(execution: WorkflowExecution): any {
    const output: any = {};
    
    // Collect results from all completed steps
    execution.stepResults.forEach((result, stepId) => {
      output[stepId] = result;
    });

    // Include final workflow variables
    output._variables = Object.fromEntries(execution.context.variables);
    output._metadata = {
      executionId: execution.id,
      duration: execution.duration,
      completedSteps: execution.completedSteps.length,
      failedSteps: execution.failedSteps.length
    };

    return output;
  }

  private instantiateTemplate(template: WorkflowTemplate, parameters: Record<string, any> = {}): WorkflowDefinition {
    const workflow = JSON.parse(JSON.stringify(template.template)); // Deep clone
    
    // Replace parameter placeholders
    const replaceParameters = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.replace(/\{\{(\w+)\}\}/g, (match, paramName) => {
          return parameters[paramName] !== undefined ? parameters[paramName] : match;
        });
      } else if (Array.isArray(obj)) {
        return obj.map(replaceParameters);
      } else if (typeof obj === 'object' && obj !== null) {
        const result: any = {};
        Object.entries(obj).forEach(([key, value]) => {
          result[key] = replaceParameters(value);
        });
        return result;
      }
      return obj;
    };

    return replaceParameters(workflow);
  }

  private startQueueProcessor(): void {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    this.processExecutionQueue();
  }

  private async processExecutionQueue(): Promise<void> {
    while (this.isProcessingQueue) {
      if (this.executionQueue.length > 0 && this.currentExecutions < this.maxConcurrentExecutions) {
        const executionId = this.executionQueue.shift()!;
        const execution = this.executions.get(executionId);
        
        if (execution && (execution.status === 'pending' || execution.status === 'running')) {
          // Execute workflow in background
          this.executeWorkflowInternal(execution).catch(error => {
            this.logger.error(`Workflow execution ${executionId} failed:`, error);
          });
        }
      }
      
      // Wait before checking queue again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // =====================================
  // Event Handling and State Management
  // =====================================

  private setupEventListeners(): void {
    agentRegistry.on('agent-event', (event) => {
      // Handle agent events that might affect workflows
      if (event.type === AgentEventType.TASK_COMPLETED || event.type === AgentEventType.TASK_FAILED) {
        this.handleAgentTaskEvent(event);
      }
    });
  }

  private handleAgentTaskEvent(event: any): void {
    // Find executions that might be affected by this agent event
    // This would be used to update step statuses based on agent task results
  }

  private notifyExecutionComplete(execution: WorkflowExecution): void {
    this.emitEvent({
      id: uuidv4(),
      agentId: this.id,
      type: execution.status === 'completed' ? 
        AgentEventType.WORKFLOW_COMPLETED : 
        AgentEventType.WORKFLOW_FAILED,
      timestamp: new Date(),
      data: {
        executionId: execution.id,
        workflowId: execution.workflowId,
        status: execution.status,
        duration: execution.duration,
        completedSteps: execution.completedSteps.length,
        failedSteps: execution.failedSteps.length
      },
      source: this.name,
      severity: execution.status === 'completed' ? EventSeverity.INFO : EventSeverity.ERROR,
      correlationId: execution.context.correlationId
    });
  }

  private createAgentError(error: Error): AgentError {
    return {
      code: error.name || 'WORKFLOW_ERROR',
      message: error.message,
      stack: error.stack,
      timestamp: new Date(),
      retryable: true,
      severity: EventSeverity.ERROR
    };
  }

  // Placeholder methods for state management
  private async loadWorkflowDefinitions(): Promise<void> {
    // Load from database
  }

  private async loadWorkflowTemplates(): Promise<void> {
    // Load from database
  }

  private async resumePendingExecutions(): Promise<void> {
    // Resume any executions that were running when agent stopped
  }

  private async registerScheduledWorkflows(): Promise<void> {
    // Register cron jobs for scheduled workflows
  }

  private async pauseAllExecutions(): Promise<void> {
    // Pause all running executions
  }

  private stopAllCronJobs(): void {
    this.cronJobs.forEach(job => job.stop());
    this.cronJobs.clear();
  }

  private async saveState(): Promise<void> {
    // Save current state to database
  }

  private async saveWorkflowDefinition(workflow: WorkflowDefinition): Promise<void> {
    // Save to database
  }

  private async deleteWorkflowDefinition(workflowId: string): Promise<void> {
    // Delete from database
  }

  private async saveWorkflowTemplate(template: WorkflowTemplate): Promise<void> {
    // Save to database
  }

  private async saveExecutionState(execution: WorkflowExecution): Promise<void> {
    // Save to database
  }

  private async getStepDefinition(stepId: string): Promise<WorkflowStep | null> {
    // Get step definition (placeholder)
    return null;
  }

  private async pauseCurrentStep(execution: WorkflowExecution): Promise<void> {
    // Pause the current step execution
  }

  private async cancelCurrentStep(execution: WorkflowExecution): Promise<void> {
    // Cancel the current step execution
  }

  private async scheduleStepRetry(stepExecution: StepExecution, retryPolicy: RetryPolicy): Promise<void> {
    // Schedule step for retry based on retry policy
    const delay = this.calculateRetryDelay(stepExecution.retryCount, retryPolicy);
    
    setTimeout(() => {
      // Re-queue the execution
      this.executionQueue.push(stepExecution.executionId);
    }, delay);
  }

  private calculateRetryDelay(retryCount: number, retryPolicy: RetryPolicy): number {
    switch (retryPolicy.backoffType) {
      case 'exponential':
        return Math.min(
          retryPolicy.initialDelay * Math.pow(retryPolicy.multiplier || 2, retryCount),
          retryPolicy.maxDelay
        );
      case 'linear':
        return Math.min(
          retryPolicy.initialDelay + (retryPolicy.initialDelay * retryCount),
          retryPolicy.maxDelay
        );
      case 'fixed':
      default:
        return retryPolicy.initialDelay;
    }
  }

  private async handleWorkflowFailure(execution: WorkflowExecution, error: AgentError): Promise<void> {
    execution.status = 'failed';
    execution.lastError = error;
    execution.endTime = new Date();
    execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
    
    this.logger.error(`Workflow execution ${execution.id} failed:`, error);
  }

  // =====================================
  // Initialization Methods
  // =====================================

  private setupCapabilities(): void {
    this.capabilities.push(
      {
        name: 'workflow-execution',
        version: '1.0.0',
        description: 'Execute complex workflows with multiple steps',
        inputSchema: {},
        outputSchema: {},
        requirements: ['Agent registry access'],
        limitations: ['Limited by agent availability']
      },
      {
        name: 'workflow-orchestration',
        version: '1.0.0',
        description: 'Orchestrate and coordinate multiple agents',
        inputSchema: {},
        outputSchema: {},
        requirements: ['Agent registry access'],
        limitations: ['Limited by agent capabilities']
      },
      {
        name: 'workflow-management',
        version: '1.0.0',
        description: 'Create, update, and manage workflow definitions',
        inputSchema: {},
        outputSchema: {},
        requirements: [],
        limitations: []
      }
    );
  }

  protected async getCustomMetrics(): Promise<Record<string, number>> {
    return {
      'workflows.defined': this.workflows.size,
      'workflows.templates': this.templates.size,
      'executions.active': this.currentExecutions,
      'executions.queued': this.executionQueue.length,
      'executions.total': this.executions.size,
      'cron_jobs.active': this.cronJobs.size
    };
  }
}