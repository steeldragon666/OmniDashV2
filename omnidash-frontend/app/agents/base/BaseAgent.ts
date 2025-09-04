/**
 * Abstract base class for all AI Agents
 * Provides common functionality, lifecycle management, and integration points
 */

import { EventEmitter } from 'events';
import {
  IAgent,
  AgentMetadata,
  AgentState,
  AgentStatus,
  AgentTask,
  AgentResult,
  AgentError,
  AgentContext,
  AgentEvent
} from './AgentInterface';
import { AgentSpecificConfig, ConfigManager } from './AgentConfig';

export abstract class BaseAgent extends EventEmitter implements IAgent {
  protected config: AgentSpecificConfig;
  protected _metadata: AgentMetadata;
  protected _state: AgentState;
  private configManager: ConfigManager;
  private executionCount: number = 0;
  private lastExecutionTime: number = 0;
  private startTime: Date;

  constructor(metadata: AgentMetadata) {
    super();
    this.configManager = ConfigManager.getInstance();
    this._metadata = {
      ...metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this._state = {
      status: 'idle',
      progress: 0,
      lastActivity: new Date()
    };
    
    this.config = this.configManager.getAgentConfig(metadata.id, metadata.category);
    this.startTime = new Date();
    
    // Set up error handling
    this.on('error', this.handleError.bind(this));
  }

  // Abstract methods that must be implemented by concrete agents
  protected abstract executeTask(task: AgentTask, context?: AgentContext): Promise<AgentResult>;
  protected abstract validateTask(task: AgentTask): boolean;
  protected abstract getAgentSpecificMetrics(): Promise<Record<string, any>>;

  // Getters
  public get metadata(): AgentMetadata {
    return { ...this._metadata };
  }

  public get state(): AgentState {
    return { ...this._state };
  }

  // Lifecycle methods
  public async initialize(config?: Record<string, any>): Promise<void> {
    try {
      if (config) {
        this.config = { ...this.config, ...config };
      }
      
      await this.onInitialize();
      this.updateState({ status: 'idle' });
      this.emit('initialized', { agentId: this._metadata.id });
      
      this.log('info', 'Agent initialized successfully');
    } catch (error) {
      const agentError = this.createAgentError('INIT_ERROR', 'Failed to initialize agent', error);
      this.updateState({ status: 'error', error: agentError });
      throw agentError;
    }
  }

  public async start(): Promise<void> {
    try {
      if (this._state.status === 'running') {
        throw new Error('Agent is already running');
      }
      
      this.updateState({ status: 'running' });
      await this.onStart();
      this.emit('started', { agentId: this._metadata.id });
      
      this.log('info', 'Agent started');
    } catch (error) {
      const agentError = this.createAgentError('START_ERROR', 'Failed to start agent', error);
      this.updateState({ status: 'error', error: agentError });
      throw agentError;
    }
  }

  public async pause(): Promise<void> {
    try {
      if (this._state.status !== 'running') {
        throw new Error('Agent is not running');
      }
      
      this.updateState({ status: 'paused' });
      await this.onPause();
      this.emit('paused', { agentId: this._metadata.id });
      
      this.log('info', 'Agent paused');
    } catch (error) {
      const agentError = this.createAgentError('PAUSE_ERROR', 'Failed to pause agent', error);
      this.updateState({ status: 'error', error: agentError });
      throw agentError;
    }
  }

  public async resume(): Promise<void> {
    try {
      if (this._state.status !== 'paused') {
        throw new Error('Agent is not paused');
      }
      
      this.updateState({ status: 'running' });
      await this.onResume();
      this.emit('resumed', { agentId: this._metadata.id });
      
      this.log('info', 'Agent resumed');
    } catch (error) {
      const agentError = this.createAgentError('RESUME_ERROR', 'Failed to resume agent', error);
      this.updateState({ status: 'error', error: agentError });
      throw agentError;
    }
  }

  public async stop(): Promise<void> {
    try {
      this.updateState({ status: 'idle' });
      await this.onStop();
      this.emit('stopped', { agentId: this._metadata.id });
      
      this.log('info', 'Agent stopped');
    } catch (error) {
      const agentError = this.createAgentError('STOP_ERROR', 'Failed to stop agent', error);
      this.updateState({ status: 'error', error: agentError });
      throw agentError;
    }
  }

  public async reset(): Promise<void> {
    try {
      await this.stop();
      this.executionCount = 0;
      this.lastExecutionTime = 0;
      this._state.progress = 0;
      this._state.error = undefined;
      
      await this.onReset();
      this.emit('reset', { agentId: this._metadata.id });
      
      this.log('info', 'Agent reset');
    } catch (error) {
      const agentError = this.createAgentError('RESET_ERROR', 'Failed to reset agent', error);
      this.updateState({ status: 'error', error: agentError });
      throw agentError;
    }
  }

  // Task execution
  public async execute(task: AgentTask, context?: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const correlationId = context?.correlationId || this.generateCorrelationId();
    
    try {
      // Validate task
      if (!this.canExecute(task)) {
        throw new Error(`Agent cannot execute task of type: ${task.type}`);
      }

      // Check if agent is available
      if (this._state.status === 'error') {
        throw new Error('Agent is in error state');
      }

      // Update state
      this.updateState({
        status: 'running',
        currentTask: task.id,
        progress: 0
      });

      // Execute with timeout
      const result = await this.executeWithTimeout(task, context, this.config.timeout);
      
      // Update metrics
      this.executionCount++;
      this.lastExecutionTime = Date.now() - startTime;
      
      // Update state on success
      this.updateState({
        status: 'completed',
        currentTask: undefined,
        progress: 100,
        lastActivity: new Date()
      });

      // Emit success event
      this.emit('taskCompleted', {
        agentId: this._metadata.id,
        taskId: task.id,
        correlationId,
        result,
        executionTime: this.lastExecutionTime
      });

      this.log('info', `Task completed successfully`, {
        taskId: task.id,
        taskType: task.type,
        executionTime: this.lastExecutionTime
      });

      return {
        success: true,
        data: result.data,
        metadata: {
          ...result.metadata,
          executionTime: this.lastExecutionTime,
          correlationId
        }
      };

    } catch (error) {
      const agentError = this.createAgentError(
        'EXECUTION_ERROR',
        `Failed to execute task ${task.id}`,
        error
      );

      this.updateState({
        status: 'error',
        currentTask: undefined,
        error: agentError,
        lastActivity: new Date()
      });

      // Emit error event
      this.emit('taskFailed', {
        agentId: this._metadata.id,
        taskId: task.id,
        correlationId,
        error: agentError,
        executionTime: Date.now() - startTime
      });

      this.log('error', `Task execution failed`, {
        taskId: task.id,
        taskType: task.type,
        error: agentError.message
      });

      return {
        success: false,
        error: agentError,
        metadata: {
          executionTime: Date.now() - startTime,
          correlationId
        }
      };
    } finally {
      // Reset status to idle if not in error state
      if (this._state.status !== 'error') {
        this.updateState({ status: 'idle' });
      }
    }
  }

  public canExecute(task: AgentTask): boolean {
    // Check if task type is supported
    const supportedTypes = this._metadata.capabilities.map(cap => cap.name);
    if (!supportedTypes.includes(task.type)) {
      return false;
    }

    // Check agent status
    if (this._state.status === 'error' || !this.config.enabled) {
      return false;
    }

    // Validate task-specific requirements
    return this.validateTask(task);
  }

  // State management
  public getState(): AgentState {
    return { ...this._state };
  }

  public updateState(updates: Partial<AgentState>): void {
    this._state = {
      ...this._state,
      ...updates,
      lastActivity: new Date()
    };

    this.emit('stateChanged', {
      agentId: this._metadata.id,
      oldState: this._state,
      newState: this._state
    });
  }

  // Health check
  public async healthCheck(): Promise<boolean> {
    try {
      // Basic health checks
      if (!this.config.enabled) return false;
      if (this._state.status === 'error') return false;

      // Agent-specific health check
      return await this.onHealthCheck();
    } catch (error) {
      this.log('error', 'Health check failed', { error });
      return false;
    }
  }

  // Configuration
  public async configure(config: Record<string, any>): Promise<void> {
    try {
      this.config = { ...this.config, ...config };
      await this.onConfigure(config);
      this._metadata.updatedAt = new Date();
      
      this.emit('configured', { agentId: this._metadata.id, config });
      this.log('info', 'Agent configuration updated');
    } catch (error) {
      const agentError = this.createAgentError('CONFIG_ERROR', 'Failed to update configuration', error);
      throw agentError;
    }
  }

  public getConfiguration(): Record<string, any> {
    return { ...this.config };
  }

  // Metrics
  public async getMetrics(): Promise<Record<string, any>> {
    const baseMetrics = {
      executionCount: this.executionCount,
      lastExecutionTime: this.lastExecutionTime,
      uptime: Date.now() - this.startTime.getTime(),
      status: this._state.status,
      errorCount: this._state.error ? 1 : 0,
      memoryUsage: process.memoryUsage ? process.memoryUsage() : undefined
    };

    const specificMetrics = await this.getAgentSpecificMetrics();
    
    return {
      ...baseMetrics,
      ...specificMetrics
    };
  }

  // Protected helper methods for subclasses
  protected async executeWithTimeout(
    task: AgentTask,
    context?: AgentContext,
    timeout: number = this.config.timeout
  ): Promise<AgentResult> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Task execution timed out after ${timeout}ms`));
      }, timeout);

      this.executeTask(task, context)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  protected createAgentError(code: string, message: string, originalError?: any): AgentError {
    return {
      code,
      message,
      details: originalError,
      timestamp: new Date(),
      recoverable: this.isRecoverableError(code),
      retryCount: 0,
      maxRetries: this.config.retries
    };
  }

  protected isRecoverableError(code: string): boolean {
    const recoverableErrors = [
      'TIMEOUT_ERROR',
      'RATE_LIMIT_ERROR',
      'NETWORK_ERROR',
      'SERVICE_UNAVAILABLE'
    ];
    
    return recoverableErrors.includes(code);
  }

  protected generateCorrelationId(): string {
    return `${this._metadata.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string, metadata?: any): void {
    if (!this.config.logging?.enabled) return;

    const logData = {
      agentId: this._metadata.id,
      agentCategory: this._metadata.category,
      message,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    // Emit log event for external log handling
    this.emit('log', { level, ...logData });
    
    // Basic console logging (replace with proper logger in production)
    if (console[level]) {
      console[level](`[${this._metadata.id}] ${message}`, metadata || '');
    }
  }

  protected updateProgress(progress: number): void {
    this.updateState({ progress: Math.max(0, Math.min(100, progress)) });
  }

  // Event handling (inherited from EventEmitter)
  public on(event: string, handler: (data: any) => void): void {
    super.on(event, handler);
  }

  public off(event: string, handler?: (data: any) => void): void {
    if (handler) {
      super.off(event, handler);
    } else {
      super.removeAllListeners(event);
    }
  }

  public emit(event: string, data?: any): boolean {
    return super.emit(event, data);
  }

  private handleError(error: Error): void {
    const agentError = this.createAgentError('INTERNAL_ERROR', error.message, error);
    this.updateState({ status: 'error', error: agentError });
    this.log('error', 'Unhandled agent error', { error: error.message, stack: error.stack });
  }

  // Abstract lifecycle hooks for subclasses to implement
  protected async onInitialize(): Promise<void> {
    // Override in subclasses
  }

  protected async onStart(): Promise<void> {
    // Override in subclasses
  }

  protected async onPause(): Promise<void> {
    // Override in subclasses
  }

  protected async onResume(): Promise<void> {
    // Override in subclasses
  }

  protected async onStop(): Promise<void> {
    // Override in subclasses
  }

  protected async onReset(): Promise<void> {
    // Override in subclasses
  }

  protected async onConfigure(config: Record<string, any>): Promise<void> {
    // Override in subclasses
  }

  protected async onHealthCheck(): Promise<boolean> {
    // Override in subclasses - default implementation
    return true;
  }
}