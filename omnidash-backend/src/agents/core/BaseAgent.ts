/**
 * Base Agent Implementation
 * Provides the foundational functionality that all agents inherit from
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { createLogger, Logger } from 'winston';
import {
  IAgent,
  AgentConfig,
  AgentTask,
  AgentStatus,
  AgentMetrics,
  AgentHealth,
  AgentCapability,
  TaskContext,
  AgentError,
  AgentEvent,
  AgentEventType,
  EventSeverity,
  TaskStatus,
  HealthCheck,
  ResourceUsage,
  DependencyStatus
} from '../types/AgentTypes';
import { AgentLogger } from '../utils/AgentLogger';
import { AgentMetricsCollector } from '../utils/AgentMetricsCollector';
import { TaskQueue } from '../queues/TaskQueue';

/**
 * Abstract base class that provides common functionality for all agents
 */
export abstract class BaseAgent extends EventEmitter implements IAgent {
  // Core Properties
  public readonly id: string;
  public readonly name: string;
  public readonly version: string;
  public readonly config: AgentConfig;
  public readonly capabilities: AgentCapability[];

  // Status Management
  public status: AgentStatus = AgentStatus.IDLE;
  public isRunning: boolean = false;
  public isHealthy: boolean = true;

  // Internal Components
  protected logger: Logger;
  protected metricsCollector: AgentMetricsCollector;
  protected taskQueue: TaskQueue;
  protected startTime: Date;
  protected lastHeartbeat: Date;
  protected currentTasks: Map<string, AgentTask> = new Map();
  protected healthChecks: Map<string, HealthCheck> = new Map();

  // Performance Tracking
  protected tasksProcessed: number = 0;
  protected tasksSuccessful: number = 0;
  protected tasksFailed: number = 0;
  protected totalProcessingTime: number = 0;

  constructor(config: AgentConfig) {
    super();
    
    this.id = config.id || uuidv4();
    this.name = config.name;
    this.version = config.version;
    this.config = { ...config, id: this.id };
    this.capabilities = [];
    this.startTime = new Date();
    this.lastHeartbeat = new Date();

    // Initialize components
    this.logger = AgentLogger.createLogger(this.id, this.name);
    this.metricsCollector = new AgentMetricsCollector(this.id);
    this.taskQueue = new TaskQueue({
      name: `${this.name}-queue`,
      maxSize: config.maxConcurrentTasks * 10,
      maxConcurrency: config.maxConcurrentTasks,
      defaultJobOptions: {
        attempts: config.retryAttempts,
        backoff: {
          type: 'exponential',
          delay: config.retryDelay
        },
        removeOnComplete: 10,
        removeOnFail: 5
      }
    });

    this.setupEventHandlers();
    this.setupHealthChecks();
  }

  // =====================================
  // Core Lifecycle Methods
  // =====================================

  public async initialize(): Promise<void> {
    try {
      this.logger.info(`Initializing agent ${this.name}...`);
      
      await this.validateConfig(this.config);
      await this.setupDependencies();
      await this.initializeCapabilities();
      await this.onInitialize();

      this.status = AgentStatus.IDLE;
      this.emitEvent({
        id: uuidv4(),
        agentId: this.id,
        type: AgentEventType.AGENT_STARTED,
        timestamp: new Date(),
        data: { config: this.config },
        source: this.name,
        severity: EventSeverity.INFO
      });

      this.logger.info(`Agent ${this.name} initialized successfully`);
    } catch (error) {
      this.logger.error(`Failed to initialize agent ${this.name}:`, error);
      this.status = AgentStatus.ERROR;
      throw error;
    }
  }

  public async start(): Promise<void> {
    try {
      if (this.isRunning) {
        this.logger.warn(`Agent ${this.name} is already running`);
        return;
      }

      this.logger.info(`Starting agent ${this.name}...`);
      
      await this.onStart();
      await this.taskQueue.start();
      
      this.isRunning = true;
      this.status = AgentStatus.RUNNING;
      this.startHeartbeat();

      this.emitEvent({
        id: uuidv4(),
        agentId: this.id,
        type: AgentEventType.AGENT_STARTED,
        timestamp: new Date(),
        data: {},
        source: this.name,
        severity: EventSeverity.INFO
      });

      this.logger.info(`Agent ${this.name} started successfully`);
    } catch (error) {
      this.logger.error(`Failed to start agent ${this.name}:`, error);
      this.status = AgentStatus.ERROR;
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      if (!this.isRunning) {
        this.logger.warn(`Agent ${this.name} is not running`);
        return;
      }

      this.logger.info(`Stopping agent ${this.name}...`);
      
      this.isRunning = false;
      this.status = AgentStatus.STOPPED;
      
      await this.taskQueue.pause();
      await this.waitForCurrentTasks();
      await this.onStop();
      this.stopHeartbeat();

      this.emitEvent({
        id: uuidv4(),
        agentId: this.id,
        type: AgentEventType.AGENT_STOPPED,
        timestamp: new Date(),
        data: {},
        source: this.name,
        severity: EventSeverity.INFO
      });

      this.logger.info(`Agent ${this.name} stopped successfully`);
    } catch (error) {
      this.logger.error(`Failed to stop agent ${this.name}:`, error);
      throw error;
    }
  }

  public async pause(): Promise<void> {
    if (this.status !== AgentStatus.RUNNING) {
      throw new Error(`Cannot pause agent ${this.name} - not running`);
    }

    this.logger.info(`Pausing agent ${this.name}...`);
    this.status = AgentStatus.PAUSED;
    await this.taskQueue.pause();
    await this.onPause();

    this.emitEvent({
      id: uuidv4(),
      agentId: this.id,
      type: AgentEventType.AGENT_PAUSED,
      timestamp: new Date(),
      data: {},
      source: this.name,
      severity: EventSeverity.INFO
    });
  }

  public async resume(): Promise<void> {
    if (this.status !== AgentStatus.PAUSED) {
      throw new Error(`Cannot resume agent ${this.name} - not paused`);
    }

    this.logger.info(`Resuming agent ${this.name}...`);
    this.status = AgentStatus.RUNNING;
    await this.taskQueue.resume();
    await this.onResume();

    this.emitEvent({
      id: uuidv4(),
      agentId: this.id,
      type: AgentEventType.AGENT_RESUMED,
      timestamp: new Date(),
      data: {},
      source: this.name,
      severity: EventSeverity.INFO
    });
  }

  public async shutdown(): Promise<void> {
    try {
      this.logger.info(`Shutting down agent ${this.name}...`);
      
      await this.stop();
      await this.cleanup();
      await this.taskQueue.close();
      
      this.removeAllListeners();
      this.logger.info(`Agent ${this.name} shutdown complete`);
    } catch (error) {
      this.logger.error(`Error during agent ${this.name} shutdown:`, error);
      throw error;
    }
  }

  // =====================================
  // Task Processing
  // =====================================

  public async processTask(task: AgentTask): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Validate task
      if (!await this.validateTask(task)) {
        throw new Error(`Invalid task: ${task.id}`);
      }

      // Check if agent can handle this task
      if (!this.canHandleTask(task)) {
        throw new Error(`Agent ${this.name} cannot handle task type: ${task.type}`);
      }

      // Track task start
      this.currentTasks.set(task.id, { ...task, status: TaskStatus.RUNNING, startedAt: new Date() });
      this.tasksProcessed++;

      this.emitEvent({
        id: uuidv4(),
        agentId: this.id,
        type: AgentEventType.TASK_STARTED,
        timestamp: new Date(),
        data: { taskId: task.id, taskType: task.type },
        source: this.name,
        severity: EventSeverity.INFO
      });

      // Process the task
      const result = await this.executeTask(task);

      // Track task completion
      const duration = Date.now() - startTime;
      this.totalProcessingTime += duration;
      this.tasksSuccessful++;
      
      const completedTask = {
        ...task,
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
        result,
        metadata: {
          ...task.metadata,
          actualDuration: duration
        }
      };

      this.currentTasks.set(task.id, completedTask);
      this.metricsCollector.recordTaskCompletion(task.type, duration, true);

      this.emitEvent({
        id: uuidv4(),
        agentId: this.id,
        type: AgentEventType.TASK_COMPLETED,
        timestamp: new Date(),
        data: { taskId: task.id, duration, result },
        source: this.name,
        severity: EventSeverity.INFO
      });

      // Clean up completed task after a delay
      setTimeout(() => this.currentTasks.delete(task.id), 60000);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.tasksFailed++;
      
      const failedTask = {
        ...task,
        status: TaskStatus.FAILED,
        failedAt: new Date(),
        error: this.createAgentError(error as Error),
        metadata: {
          ...task.metadata,
          actualDuration: duration
        }
      };

      this.currentTasks.set(task.id, failedTask);
      this.metricsCollector.recordTaskCompletion(task.type, duration, false);

      this.emitEvent({
        id: uuidv4(),
        agentId: this.id,
        type: AgentEventType.TASK_FAILED,
        timestamp: new Date(),
        data: { taskId: task.id, error: error.message },
        source: this.name,
        severity: EventSeverity.ERROR
      });

      this.logger.error(`Task ${task.id} failed:`, error);
      throw error;
    }
  }

  public abstract canHandleTask(task: AgentTask): boolean;

  public async validateTask(task: AgentTask): Promise<boolean> {
    // Basic validation
    if (!task.id || !task.type || !task.agentId) {
      return false;
    }

    // Check if task is for this agent
    if (task.agentId !== this.id) {
      return false;
    }

    // Custom validation
    return await this.validateTaskPayload(task);
  }

  // =====================================
  // Health and Monitoring
  // =====================================

  public async getHealth(): Promise<AgentHealth> {
    const now = new Date();
    const uptime = now.getTime() - this.startTime.getTime();

    // Perform health checks
    await this.performHealthCheck();

    const health: AgentHealth = {
      agentId: this.id,
      status: this.isHealthy ? 'healthy' : 'unhealthy',
      timestamp: now,
      uptime,
      lastHeartbeat: this.lastHeartbeat,
      checks: Array.from(this.healthChecks.values()),
      resources: await this.getResourceUsage(),
      dependencies: await this.checkDependencies()
    };

    return health;
  }

  public async getMetrics(): Promise<AgentMetrics> {
    const metrics: AgentMetrics = {
      agentId: this.id,
      timestamp: new Date(),
      status: this.status,
      tasksProcessed: this.tasksProcessed,
      tasksSuccessful: this.tasksSuccessful,
      tasksFailed: this.tasksFailed,
      averageTaskDuration: this.tasksProcessed > 0 ? this.totalProcessingTime / this.tasksProcessed : 0,
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: process.cpuUsage().user,
      errorRate: this.tasksProcessed > 0 ? this.tasksFailed / this.tasksProcessed : 0,
      throughput: this.tasksSuccessful / Math.max((Date.now() - this.startTime.getTime()) / 1000 / 60, 1), // tasks per minute
      queueLength: await this.taskQueue.getWaitingCount(),
      customMetrics: await this.getCustomMetrics()
    };

    return metrics;
  }

  public async performHealthCheck(): Promise<boolean> {
    try {
      const checks: HealthCheck[] = [];

      // Basic connectivity check
      checks.push(await this.checkBasicHealth());

      // Dependency checks
      const dependencyChecks = await this.checkDependencyHealth();
      checks.push(...dependencyChecks);

      // Resource checks
      checks.push(await this.checkResourceHealth());

      // Custom health checks
      const customChecks = await this.performCustomHealthChecks();
      checks.push(...customChecks);

      // Update health checks map
      checks.forEach(check => {
        this.healthChecks.set(check.name, check);
      });

      // Determine overall health
      const hasFailures = checks.some(check => check.status === 'fail');
      this.isHealthy = !hasFailures;

      return this.isHealthy;
    } catch (error) {
      this.logger.error(`Health check failed for agent ${this.name}:`, error);
      this.isHealthy = false;
      return false;
    }
  }

  // =====================================
  // Configuration Management
  // =====================================

  public async updateConfig(config: Partial<AgentConfig>): Promise<void> {
    try {
      const newConfig = { ...this.config, ...config };
      
      if (!this.validateConfig(newConfig)) {
        throw new Error('Invalid configuration');
      }

      Object.assign(this.config, config);
      await this.onConfigUpdate(config);
      
      this.logger.info(`Configuration updated for agent ${this.name}`);
    } catch (error) {
      this.logger.error(`Failed to update configuration for agent ${this.name}:`, error);
      throw error;
    }
  }

  public validateConfig(config: Partial<AgentConfig>): boolean {
    // Basic validation
    if (config.maxConcurrentTasks && config.maxConcurrentTasks <= 0) {
      return false;
    }

    if (config.retryAttempts && config.retryAttempts < 0) {
      return false;
    }

    if (config.timeout && config.timeout <= 0) {
      return false;
    }

    return this.validateCustomConfig(config);
  }

  // =====================================
  // Event Handling
  // =====================================

  public emitEvent(event: AgentEvent): void {
    try {
      this.emit('agent-event', event);
      this.logger.debug(`Emitted event: ${event.type}`, event);
    } catch (error) {
      this.logger.error(`Failed to emit event: ${event.type}`, error);
    }
  }

  // =====================================
  // Utility Methods
  // =====================================

  public async cleanup(): Promise<void> {
    try {
      await this.onCleanup();
      this.currentTasks.clear();
      this.healthChecks.clear();
    } catch (error) {
      this.logger.error(`Error during cleanup for agent ${this.name}:`, error);
      throw error;
    }
  }

  public async reset(): Promise<void> {
    try {
      await this.stop();
      await this.cleanup();
      
      // Reset metrics
      this.tasksProcessed = 0;
      this.tasksSuccessful = 0;
      this.tasksFailed = 0;
      this.totalProcessingTime = 0;
      
      await this.initialize();
      await this.start();
      
      this.logger.info(`Agent ${this.name} reset successfully`);
    } catch (error) {
      this.logger.error(`Failed to reset agent ${this.name}:`, error);
      throw error;
    }
  }

  // =====================================
  // Abstract Methods (to be implemented by subclasses)
  // =====================================

  protected abstract executeTask(task: AgentTask): Promise<any>;
  protected abstract validateTaskPayload(task: AgentTask): Promise<boolean>;
  protected abstract getCustomMetrics(): Promise<Record<string, number>>;

  // =====================================
  // Virtual Methods (can be overridden by subclasses)
  // =====================================

  protected async onInitialize(): Promise<void> {
    // Override in subclasses
  }

  protected async onStart(): Promise<void> {
    // Override in subclasses
  }

  protected async onStop(): Promise<void> {
    // Override in subclasses
  }

  protected async onPause(): Promise<void> {
    // Override in subclasses
  }

  protected async onResume(): Promise<void> {
    // Override in subclasses
  }

  protected async onCleanup(): Promise<void> {
    // Override in subclasses
  }

  protected async onConfigUpdate(config: Partial<AgentConfig>): Promise<void> {
    // Override in subclasses
  }

  protected validateCustomConfig(config: Partial<AgentConfig>): boolean {
    return true; // Override in subclasses
  }

  protected async performCustomHealthChecks(): Promise<HealthCheck[]> {
    return []; // Override in subclasses
  }

  // =====================================
  // Private Methods
  // =====================================

  private setupEventHandlers(): void {
    this.on('error', (error) => {
      this.logger.error(`Agent ${this.name} error:`, error);
      this.status = AgentStatus.ERROR;
      this.isHealthy = false;
    });

    this.taskQueue.on('completed', (job, result) => {
      this.logger.debug(`Task completed: ${job.id}`, result);
    });

    this.taskQueue.on('failed', (job, err) => {
      this.logger.error(`Task failed: ${job.id}`, err);
    });
  }

  private setupHealthChecks(): void {
    // Set up basic health checks
    setInterval(async () => {
      if (this.isRunning) {
        await this.performHealthCheck();
        this.updateHeartbeat();
      }
    }, this.config.monitoring.healthCheckInterval || 30000);
  }

  private startHeartbeat(): void {
    this.updateHeartbeat();
  }

  private stopHeartbeat(): void {
    // Cleanup heartbeat if needed
  }

  private updateHeartbeat(): void {
    this.lastHeartbeat = new Date();
  }

  private async waitForCurrentTasks(): Promise<void> {
    const timeout = this.config.timeout || 30000;
    const startTime = Date.now();

    while (this.currentTasks.size > 0) {
      if (Date.now() - startTime > timeout) {
        this.logger.warn(`Timeout waiting for tasks to complete. Forcing shutdown.`);
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  private async setupDependencies(): Promise<void> {
    // Setup any required dependencies
    // Override in subclasses if needed
  }

  private async initializeCapabilities(): Promise<void> {
    // Initialize agent capabilities
    // Override in subclasses
  }

  private createAgentError(error: Error): AgentError {
    return {
      code: error.name || 'UNKNOWN_ERROR',
      message: error.message,
      stack: error.stack,
      timestamp: new Date(),
      retryable: false, // Override in subclasses
      severity: EventSeverity.ERROR
    };
  }

  private async getResourceUsage(): Promise<ResourceUsage> {
    const memUsage = process.memoryUsage();
    
    return {
      memory: {
        used: memUsage.heapUsed,
        available: memUsage.heapTotal - memUsage.heapUsed,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      cpu: {
        usage: 0, // Would need external library for accurate CPU usage
        cores: require('os').cpus().length
      },
      disk: {
        used: 0, // Would need external library for disk usage
        available: 0,
        percentage: 0
      },
      network: {
        bytesIn: 0, // Would need to track network usage
        bytesOut: 0,
        connectionsActive: 0
      }
    };
  }

  private async checkDependencies(): Promise<DependencyStatus[]> {
    // Check dependencies status
    // Override in subclasses
    return [];
  }

  private async checkBasicHealth(): Promise<HealthCheck> {
    const start = Date.now();
    
    try {
      // Basic health checks
      const isRunning = this.isRunning;
      const hasErrors = this.status === AgentStatus.ERROR;
      
      return {
        name: 'basic-health',
        status: isRunning && !hasErrors ? 'pass' : 'fail',
        message: isRunning && !hasErrors ? 'Agent is running normally' : 'Agent has issues',
        duration: Date.now() - start,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        name: 'basic-health',
        status: 'fail',
        message: error.message,
        duration: Date.now() - start,
        timestamp: new Date()
      };
    }
  }

  private async checkDependencyHealth(): Promise<HealthCheck[]> {
    // Check health of dependencies
    // Override in subclasses
    return [];
  }

  private async checkResourceHealth(): Promise<HealthCheck> {
    const start = Date.now();
    
    try {
      const memUsage = process.memoryUsage();
      const memoryThreshold = 1024 * 1024 * 1024; // 1GB
      
      const isHealthy = memUsage.heapUsed < memoryThreshold;
      
      return {
        name: 'resource-health',
        status: isHealthy ? 'pass' : 'warn',
        message: isHealthy ? 'Resource usage normal' : 'High memory usage detected',
        duration: Date.now() - start,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        name: 'resource-health',
        status: 'fail',
        message: error.message,
        duration: Date.now() - start,
        timestamp: new Date()
      };
    }
  }
}