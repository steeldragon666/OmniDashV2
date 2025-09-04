// Main Automation Engine Entry Point
import { WorkflowEngine } from './services/WorkflowEngine';
import { TriggerService } from './services/TriggerService';
import { ConditionEvaluator } from './services/ConditionEvaluator';
import { ActionExecutor } from './services/ActionExecutor';
import { StateManager } from './services/StateManager';
import { MonitoringService } from './services/MonitoringService';
import { ErrorHandler } from './services/ErrorHandler';

export class AutomationEngine {
  public readonly workflowEngine: WorkflowEngine;
  public readonly triggerService: TriggerService;
  public readonly conditionEvaluator: ConditionEvaluator;
  public readonly actionExecutor: ActionExecutor;
  public readonly stateManager: StateManager;
  public readonly monitoringService: MonitoringService;
  public readonly errorHandler: ErrorHandler;

  private isInitialized = false;

  constructor() {
    console.log('🚀 Initializing Automation Engine...');

    // Initialize error handler first
    this.errorHandler = new ErrorHandler();
    
    // Initialize state manager
    this.stateManager = new StateManager({
      strategy: 'redis',
      enableCheckpoints: true,
      checkpointInterval: 30000
    });

    // Initialize monitoring
    this.monitoringService = new MonitoringService();
    
    // Initialize core workflow engine
    this.workflowEngine = new WorkflowEngine({
      stateManager: this.stateManager,
      errorHandler: this.errorHandler,
      monitoring: this.monitoringService
    });

    // Initialize services
    this.conditionEvaluator = new ConditionEvaluator();
    this.actionExecutor = new ActionExecutor({
      errorHandler: this.errorHandler,
      monitoring: this.monitoringService
    });
    
    this.triggerService = new TriggerService({
      workflowEngine: this.workflowEngine,
      conditionEvaluator: this.conditionEvaluator,
      monitoring: this.monitoringService
    });

    this.setupIntegrations();
    this.setupEventHandlers();
    
    console.log('✅ Automation Engine initialized successfully');
    this.isInitialized = true;
  }

  private setupIntegrations() {
    // Connect workflow engine with action executor
    this.workflowEngine.setActionExecutor(this.actionExecutor);
    
    // Connect workflow engine with condition evaluator
    this.workflowEngine.setConditionEvaluator(this.conditionEvaluator);
    
    // Set up event listeners for workflow lifecycle
    this.workflowEngine.on('workflow:started', async (execution) => {
      await this.stateManager.createWorkflowState(execution.workflowId, execution.id, {
        status: 'running',
        startedAt: new Date(),
        context: execution.context
      });
      
      this.monitoringService.recordMetric('workflow_started', 1, {
        workflowId: execution.workflowId,
        executionId: execution.id
      });
    });

    this.workflowEngine.on('workflow:completed', async (execution) => {
      await this.stateManager.updateWorkflowState(execution.id, {
        status: 'completed',
        completedAt: new Date(),
        result: execution.result
      });
      
      this.monitoringService.recordMetric('workflow_completed', 1, {
        workflowId: execution.workflowId,
        executionId: execution.id,
        duration: execution.duration
      });
    });

    this.workflowEngine.on('workflow:failed', async (execution) => {
      await this.stateManager.updateWorkflowState(execution.id, {
        status: 'failed',
        failedAt: new Date(),
        error: execution.error
      });
      
      this.monitoringService.recordMetric('workflow_failed', 1, {
        workflowId: execution.workflowId,
        executionId: execution.id,
        error: execution.error?.message
      });
      
      // Let error handler process the failure
      await this.errorHandler.handleError(execution.error || new Error('Workflow failed'), {
        workflowId: execution.workflowId,
        executionId: execution.id,
        context: execution.context
      });
    });

    // Connect trigger service to workflow engine
    this.triggerService.on('trigger:fired', async (trigger, data) => {
      try {
        const execution = await this.workflowEngine.executeWorkflow(trigger.workflowId, data);
        this.monitoringService.recordMetric('trigger_fired', 1, {
          triggerType: trigger.type,
          workflowId: trigger.workflowId
        });
      } catch (error) {
        await this.errorHandler.handleError(error as Error, {
          triggerId: trigger.id,
          workflowId: trigger.workflowId,
          triggerData: data
        });
      }
    });

    // Set up error handler integration
    this.errorHandler.on('error:retry', async (context) => {
      this.monitoringService.recordMetric('error_retry', 1, {
        workflowId: context.workflowId,
        attempt: context.attempt
      });
    });

    this.errorHandler.on('error:dead_letter', async (context) => {
      this.monitoringService.recordMetric('error_dead_letter', 1, {
        workflowId: context.workflowId,
        error: context.error.message
      });
    });
  }

  private setupEventHandlers() {
    // Global error handling
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
      await this.errorHandler.handleError(new Error(String(reason)), {
        type: 'unhandledRejection',
        promise: String(promise)
      });
      this.monitoringService.recordMetric('unhandled_rejection', 1);
    });

    process.on('uncaughtException', async (error) => {
      console.error('🚨 Uncaught Exception:', error);
      await this.errorHandler.handleError(error, {
        type: 'uncaughtException'
      });
      this.monitoringService.recordMetric('uncaught_exception', 1);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('📴 Received SIGINT, shutting down gracefully...');
      this.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('📴 Received SIGTERM, shutting down gracefully...');
      this.shutdown();
      process.exit(0);
    });
  }

  // High-level API methods
  public async createWorkflow(definition: any) {
    await this.workflowEngine.registerWorkflow(definition);
    return definition.id;
  }

  public async executeWorkflow(workflowId: string, input: any = {}, triggerType?: string) {
    return this.workflowEngine.executeWorkflow(workflowId, input);
  }

  public async createTrigger(triggerConfig: any) {
    return this.triggerService.createTrigger(triggerConfig);
  }

  public async activateTrigger(triggerId: string) {
    return this.triggerService.activateTrigger(triggerId);
  }

  public async deactivateTrigger(triggerId: string) {
    return this.triggerService.deactivateTrigger(triggerId);
  }

  public async executeAction(actionConfig: any, context: any = {}) {
    return this.actionExecutor.executeAction(actionConfig, context);
  }

  public async evaluateCondition(conditionConfig: any, context: any = {}) {
    return this.conditionEvaluator.evaluate(conditionConfig, context);
  }

  public async getWorkflowState(executionId: string) {
    return this.stateManager.getWorkflowState(executionId);
  }

  public async pauseWorkflow(executionId: string) {
    return this.stateManager.pauseWorkflow(executionId);
  }

  public async resumeWorkflow(executionId: string) {
    return this.stateManager.resumeWorkflow(executionId);
  }

  // Status and monitoring methods
  public getStatus() {
    if (!this.isInitialized) {
      return { status: 'initializing' };
    }

    return {
      status: 'running',
      components: {
        workflowEngine: {
          status: 'active',
          registeredWorkflows: this.workflowEngine.getWorkflows().length,
          activeExecutions: this.workflowEngine.getActiveExecutions().length
        },
        triggerService: {
          status: 'active',
          activeTriggers: this.triggerService.getActiveTriggers().length,
          totalTriggers: this.triggerService.getAllTriggers().length
        },
        actionExecutor: {
          status: 'active',
          queueSize: this.actionExecutor.getQueueSize(),
          activeActions: this.actionExecutor.getActiveActions().length
        },
        stateManager: {
          status: 'active',
          activeStates: this.stateManager.getActiveStates().length,
          persistenceStrategy: this.stateManager.getStrategy()
        },
        monitoringService: {
          status: 'active',
          metricsCount: this.monitoringService.getMetricsCount(),
          alertsCount: this.monitoringService.getActiveAlerts().length
        },
        errorHandler: {
          status: 'active',
          circuitBreakers: this.errorHandler.getCircuitBreakerStatus(),
          deadLetterQueue: this.errorHandler.getDeadLetterQueueSize()
        }
      },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }

  public getMetrics() {
    return {
      workflows: this.workflowEngine.getMetrics(),
      triggers: this.triggerService.getMetrics(),
      actions: this.actionExecutor.getMetrics(),
      states: this.stateManager.getMetrics(),
      monitoring: this.monitoringService.getAllMetrics(),
      errors: this.errorHandler.getMetrics(),
      uptime: process.uptime()
    };
  }

  // Cleanup and shutdown
  public async shutdown() {
    console.log('🔄 Shutting down Automation Engine...');

    try {
      // Stop all components gracefully
      await this.triggerService.shutdown();
      await this.workflowEngine.shutdown();
      await this.actionExecutor.shutdown();
      await this.stateManager.shutdown();
      await this.monitoringService.shutdown();
      await this.errorHandler.shutdown();

      console.log('✅ Automation Engine shutdown completed');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      throw error;
    }
  }

  // Health check
  public async healthCheck() {
    const checks = {
      workflowEngine: await this.workflowEngine.isHealthy(),
      triggerService: await this.triggerService.isHealthy(),
      actionExecutor: await this.actionExecutor.isHealthy(),
      stateManager: await this.stateManager.isHealthy(),
      monitoringService: await this.monitoringService.isHealthy(),
      errorHandler: await this.errorHandler.isHealthy()
    };

    const isHealthy = Object.values(checks).every(check => check);

    return {
      healthy: isHealthy,
      checks,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }
}

// Create and export singleton instance
export const automationEngine = new AutomationEngine();

// Export individual components for direct access
export {
  WorkflowEngine,
  TriggerService,
  ConditionEvaluator,
  ActionExecutor,
  StateManager,
  MonitoringService,
  ErrorHandler
};

// Export types
export * from './services/WorkflowEngine';
export * from './services/TriggerService';
export * from './services/ConditionEvaluator';
export * from './services/ActionExecutor';
export * from './services/StateManager';
export * from './services/MonitoringService';
export * from './services/ErrorHandler';