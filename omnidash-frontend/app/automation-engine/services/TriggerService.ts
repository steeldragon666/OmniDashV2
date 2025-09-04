import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface TriggerDefinition {
  id: string;
  name: string;
  type: 'time' | 'webhook' | 'event' | 'condition' | 'manual' | 'api';
  description?: string;
  workflowId: string;
  isActive: boolean;
  config: TriggerConfig;
  conditions?: TriggerCondition[];
  metadata: {
    lastTriggered?: Date;
    triggerCount: number;
    averageResponseTime: number;
    successRate: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TriggerConfig {
  // Time-based triggers
  schedule?: {
    type: 'cron' | 'interval' | 'once';
    expression: string; // cron expression or interval in ms
    timezone?: string;
    startDate?: Date;
    endDate?: Date;
  };
  
  // Webhook triggers
  webhook?: {
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    secret?: string;
    headers?: Record<string, string>;
    authentication?: {
      type: 'none' | 'basic' | 'bearer' | 'apikey';
      credentials?: Record<string, string>;
    };
  };
  
  // Event triggers
  event?: {
    source: string; // 'system', 'user', 'integration', etc.
    eventType: string;
    filters?: Record<string, unknown>;
  };
  
  // Condition triggers
  condition?: {
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'exists';
    value: unknown;
    checkInterval: number; // milliseconds
  };
  
  // API triggers
  api?: {
    endpoint: string;
    method: 'GET' | 'POST';
    polling?: {
      interval: number; // milliseconds
      enabled: boolean;
    };
    headers?: Record<string, string>;
    authentication?: {
      type: 'none' | 'basic' | 'bearer' | 'oauth2';
      credentials?: Record<string, string>;
    };
  };
}

export interface TriggerCondition {
  field: string;
  operator: 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'exists' | 'regex';
  value: unknown;
  required: boolean;
  logicalOperator?: 'AND' | 'OR';
}

export interface TriggerExecution {
  id: string;
  triggerId: string;
  workflowId: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  metadata: Record<string, unknown>;
}

export interface ScheduledTrigger {
  id: string;
  triggerId: string;
  nextRun: Date;
  isActive: boolean;
  jobId?: string;
}

export class TriggerService extends EventEmitter {
  private triggers: Map<string, TriggerDefinition> = new Map();
  private executions: Map<string, TriggerExecution> = new Map();
  private scheduledTriggers: Map<string, ScheduledTrigger> = new Map();
  private intervalJobs: Map<string, NodeJS.Timeout> = new Map();
  private conditionChecks: Map<string, NodeJS.Timeout> = new Map();
  private apiPollers: Map<string, NodeJS.Timeout> = new Map();
  private workflowEngine: unknown;
  private isRunning = true;

  constructor(workflowEngine?: unknown) {
    super();
    this.workflowEngine = workflowEngine;
    this.initialize();
  }

  private initialize() {
    this.startScheduler();
    this.setupEventListeners();
    console.log('⚡ TriggerService initialized');
  }

  public createTrigger(
    config: Omit<TriggerDefinition, 'id' | 'createdAt' | 'updatedAt' | 'metadata'>
  ): string {
    const triggerId = uuidv4();
    
    const trigger: TriggerDefinition = {
      ...config,
      id: triggerId,
      metadata: {
        triggerCount: 0,
        averageResponseTime: 0,
        successRate: 1.0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.triggers.set(triggerId, trigger);
    this.setupTrigger(trigger);
    this.emit('trigger:created', trigger);
    
    console.log(`🎯 Trigger created: ${config.name} (${config.type})`);
    return triggerId;
  }

  private setupTrigger(trigger: TriggerDefinition): void {
    if (!trigger.isActive) return;

    switch (trigger.type) {
      case 'time':
        this.setupTimeTrigger(trigger);
        break;
      case 'webhook':
        this.setupWebhookTrigger(trigger);
        break;
      case 'event':
        this.setupEventTrigger(trigger);
        break;
      case 'condition':
        this.setupConditionTrigger(trigger);
        break;
      case 'api':
        this.setupApiTrigger(trigger);
        break;
      case 'manual':
        // Manual triggers don't need setup
        break;
    }
  }

  private setupTimeTrigger(trigger: TriggerDefinition): void {
    const schedule = trigger.config.schedule;
    if (!schedule) return;

    switch (schedule.type) {
      case 'cron':
        this.setupCronTrigger(trigger);
        break;
      case 'interval':
        this.setupIntervalTrigger(trigger);
        break;
      case 'once':
        this.setupOnceTrigger(trigger);
        break;
    }
  }

  private setupCronTrigger(trigger: TriggerDefinition): void {
    const schedule = trigger.config.schedule!;
    
    // Simple cron parsing - in production, use a proper cron library
    const nextRun = this.calculateNextCronRun(schedule.expression);
    
    const scheduledTrigger: ScheduledTrigger = {
      id: uuidv4(),
      triggerId: trigger.id,
      nextRun,
      isActive: true
    };

    this.scheduledTriggers.set(scheduledTrigger.id, scheduledTrigger);
    console.log(`⏰ Cron trigger scheduled: ${trigger.name} next run at ${nextRun}`);
  }

  private setupIntervalTrigger(trigger: TriggerDefinition): void {
    const schedule = trigger.config.schedule!;
    const interval = parseInt(schedule.expression);
    
    if (isNaN(interval) || interval < 1000) {
      console.error(`Invalid interval: ${schedule.expression}`);
      return;
    }

    const intervalId = setInterval(() => {
      this.executeTrigger(trigger.id, { 
        source: 'interval',
        interval,
        timestamp: new Date()
      });
    }, interval);

    this.intervalJobs.set(trigger.id, intervalId);
    console.log(`⏱️ Interval trigger setup: ${trigger.name} every ${interval}ms`);
  }

  private setupOnceTrigger(trigger: TriggerDefinition): void {
    const schedule = trigger.config.schedule!;
    const runTime = schedule.startDate || new Date(Date.now() + parseInt(schedule.expression));
    
    const timeoutId = setTimeout(() => {
      this.executeTrigger(trigger.id, {
        source: 'once',
        scheduledFor: runTime,
        timestamp: new Date()
      });
      
      // Deactivate after execution
      this.updateTrigger(trigger.id, { isActive: false });
    }, runTime.getTime() - Date.now());

    this.intervalJobs.set(trigger.id, timeoutId);
    console.log(`⏰ One-time trigger scheduled: ${trigger.name} at ${runTime}`);
  }

  private setupWebhookTrigger(trigger: TriggerDefinition): void {
    // Webhook triggers are handled by the WebhookService
    // This is just registration
    console.log(`🎣 Webhook trigger registered: ${trigger.name}`);
  }

  private setupEventTrigger(trigger: TriggerDefinition): void {
    const event = trigger.config.event!;
    
    // Listen for specific events
    this.on(`event:${event.source}:${event.eventType}`, (data) => {
      if (this.passesEventFilters(data, event.filters)) {
        this.executeTrigger(trigger.id, {
          source: 'event',
          eventType: event.eventType,
          eventSource: event.source,
          data
        });
      }
    });

    console.log(`📡 Event trigger setup: ${trigger.name} listening for ${event.source}:${event.eventType}`);
  }

  private setupConditionTrigger(trigger: TriggerDefinition): void {
    const condition = trigger.config.condition!;
    
    const checkCondition = async () => {
      try {
        const currentValue = await this.getCurrentValue(condition.field);
        const conditionMet = this.evaluateCondition(currentValue, condition);
        
        if (conditionMet) {
          this.executeTrigger(trigger.id, {
            source: 'condition',
            field: condition.field,
            currentValue,
            expectedValue: condition.value,
            operator: condition.operator
          });
        }
      } catch (error) {
        console.error(`Error checking condition for trigger ${trigger.name}:`, error);
      }
    };

    const intervalId = setInterval(checkCondition, condition.checkInterval);
    this.conditionChecks.set(trigger.id, intervalId);
    
    console.log(`🔍 Condition trigger setup: ${trigger.name} checking ${condition.field} every ${condition.checkInterval}ms`);
  }

  private setupApiTrigger(trigger: TriggerDefinition): void {
    const api = trigger.config.api!;
    
    if (api.polling?.enabled) {
      const pollApi = async () => {
        try {
          const response = await this.makeApiCall(api);
          this.executeTrigger(trigger.id, {
            source: 'api',
            endpoint: api.endpoint,
            method: api.method,
            response
          });
        } catch (error) {
          console.error(`API polling error for trigger ${trigger.name}:`, error);
        }
      };

      const intervalId = setInterval(pollApi, api.polling.interval);
      this.apiPollers.set(trigger.id, intervalId);
      
      console.log(`🔄 API polling trigger setup: ${trigger.name} polling ${api.endpoint} every ${api.polling.interval}ms`);
    }
  }

  private async executeTrigger(
    triggerId: string,
    input: Record<string, unknown>
  ): Promise<void> {
    const trigger = this.triggers.get(triggerId);
    if (!trigger || !trigger.isActive) return;

    // Check conditions if present
    if (trigger.conditions && !this.evaluateTriggerConditions(trigger.conditions, input)) {
      return;
    }

    const executionId = uuidv4();
    const execution: TriggerExecution = {
      id: executionId,
      triggerId,
      workflowId: trigger.workflowId,
      status: 'pending',
      startedAt: new Date(),
      input,
      metadata: {
        triggerType: trigger.type,
        triggerName: trigger.name
      }
    };

    this.executions.set(executionId, execution);
    
    try {
      execution.status = 'executing';
      this.executions.set(executionId, execution);
      
      // Update trigger metadata
      trigger.metadata.lastTriggered = new Date();
      trigger.metadata.triggerCount++;

      // Execute workflow if engine is available
      if (this.workflowEngine && typeof this.workflowEngine === 'object' && 'executeWorkflow' in this.workflowEngine) {
        const workflowExecution = await (this.workflowEngine as any).executeWorkflow(
          trigger.workflowId,
          input,
          'trigger'
        );
        
        execution.output = { workflowExecutionId: workflowExecution.id };
      }

      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();

      // Update trigger response time
      this.updateTriggerResponseTime(trigger, execution.duration);

      this.emit('trigger:executed', { trigger, execution });
      console.log(`⚡ Trigger executed: ${trigger.name} -> workflow ${trigger.workflowId}`);

    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
      execution.error = (error as Error).message;

      // Update trigger success rate
      this.updateTriggerSuccessRate(trigger, false);

      this.emit('trigger:failed', { trigger, execution, error });
      console.error(`❌ Trigger execution failed: ${trigger.name}`, error);
    }

    this.executions.set(executionId, execution);
    this.triggers.set(triggerId, trigger);
  }

  private startScheduler(): void {
    const checkScheduledTriggers = () => {
      if (!this.isRunning) return;

      const now = new Date();
      
      for (const [id, scheduledTrigger] of this.scheduledTriggers.entries()) {
        if (scheduledTrigger.isActive && now >= scheduledTrigger.nextRun) {
          const trigger = this.triggers.get(scheduledTrigger.triggerId);
          if (trigger) {
            this.executeTrigger(trigger.id, {
              source: 'schedule',
              scheduledTime: scheduledTrigger.nextRun,
              actualTime: now
            });

            // Calculate next run for cron triggers
            if (trigger.config.schedule?.type === 'cron') {
              scheduledTrigger.nextRun = this.calculateNextCronRun(trigger.config.schedule.expression);
            } else {
              // Remove one-time scheduled triggers
              scheduledTrigger.isActive = false;
            }
          }
        }
      }
    };

    setInterval(checkScheduledTriggers, 10000); // Check every 10 seconds
  }

  private calculateNextCronRun(cronExpression: string): Date {
    // Simplified cron calculation - in production, use a proper cron library
    // This is just a basic implementation for common patterns
    
    const now = new Date();
    
    // Handle some common patterns
    if (cronExpression === '0 * * * *') {
      // Every hour
      const next = new Date(now);
      next.setHours(next.getHours() + 1, 0, 0, 0);
      return next;
    } else if (cronExpression === '0 0 * * *') {
      // Daily at midnight
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
      return next;
    } else if (cronExpression === '0 9 * * 1-5') {
      // Weekdays at 9 AM
      const next = new Date(now);
      next.setHours(9, 0, 0, 0);
      
      // If it's already past 9 AM today, move to next weekday
      if (now.getHours() >= 9) {
        next.setDate(next.getDate() + 1);
      }
      
      // Skip weekends
      while (next.getDay() === 0 || next.getDay() === 6) {
        next.setDate(next.getDate() + 1);
      }
      
      return next;
    }
    
    // Default: 1 hour from now
    return new Date(now.getTime() + 3600000);
  }

  private passesEventFilters(data: unknown, filters?: Record<string, unknown>): boolean {
    if (!filters) return true;
    
    const dataObj = typeof data === 'object' && data !== null ? data as Record<string, unknown> : {};
    
    for (const [key, value] of Object.entries(filters)) {
      if (dataObj[key] !== value) {
        return false;
      }
    }
    
    return true;
  }

  private evaluateCondition(value: unknown, condition: TriggerDefinition['config']['condition']): boolean {
    if (!condition) return false;

    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'neq':
        return value !== condition.value;
      case 'gt':
        return Number(value) > Number(condition.value);
      case 'lt':
        return Number(value) < Number(condition.value);
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'exists':
        return value !== undefined && value !== null;
      default:
        return false;
    }
  }

  private evaluateTriggerConditions(conditions: TriggerCondition[], input: Record<string, unknown>): boolean {
    if (conditions.length === 0) return true;

    let result = true;
    let currentLogical: 'AND' | 'OR' = 'AND';

    for (const condition of conditions) {
      const value = this.getNestedValue(input, condition.field);
      const conditionResult = this.evaluateSingleCondition(value, condition);

      if (currentLogical === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }

      currentLogical = condition.logicalOperator || 'AND';
    }

    return result;
  }

  private evaluateSingleCondition(value: unknown, condition: TriggerCondition): boolean {
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

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' && current !== null
        ? (current as Record<string, unknown>)[key]
        : undefined;
    }, obj);
  }

  private async getCurrentValue(field: string): Promise<unknown> {
    // In a real implementation, this would fetch data from various sources
    // For now, return a mock value
    return Math.random() * 100;
  }

  private async makeApiCall(api: TriggerDefinition['config']['api']): Promise<unknown> {
    if (!api) return null;

    // Simulate API call - in production, use fetch or axios
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          status: 200,
          data: { timestamp: new Date(), value: Math.random() * 100 }
        });
      }, 100);
    });
  }

  private updateTriggerResponseTime(trigger: TriggerDefinition, duration: number): void {
    const currentAvg = trigger.metadata.averageResponseTime;
    const count = trigger.metadata.triggerCount;
    
    trigger.metadata.averageResponseTime = ((currentAvg * (count - 1)) + duration) / count;
  }

  private updateTriggerSuccessRate(trigger: TriggerDefinition, success: boolean): void {
    const currentRate = trigger.metadata.successRate;
    const count = trigger.metadata.triggerCount;
    const successCount = Math.floor(currentRate * count);
    
    const newSuccessCount = success ? successCount + 1 : successCount;
    trigger.metadata.successRate = newSuccessCount / count;
  }

  private setupEventListeners(): void {
    // Listen for external events that might trigger workflows
    this.on('external:event', (data) => {
      console.log('External event received:', data);
      this.emit(`event:${data.source}:${data.type}`, data.payload);
    });
  }

  // Public API methods
  public getTrigger(triggerId: string): TriggerDefinition | undefined {
    return this.triggers.get(triggerId);
  }

  public getTriggers(): TriggerDefinition[] {
    return Array.from(this.triggers.values());
  }

  public getActiveTriggers(): TriggerDefinition[] {
    return this.getTriggers().filter(trigger => trigger.isActive);
  }

  public getTriggersByWorkflow(workflowId: string): TriggerDefinition[] {
    return this.getTriggers().filter(trigger => trigger.workflowId === workflowId);
  }

  public getTriggersByType(type: TriggerDefinition['type']): TriggerDefinition[] {
    return this.getTriggers().filter(trigger => trigger.type === type);
  }

  public getExecution(executionId: string): TriggerExecution | undefined {
    return this.executions.get(executionId);
  }

  public getExecutions(): TriggerExecution[] {
    return Array.from(this.executions.values());
  }

  public getExecutionsByTrigger(triggerId: string): TriggerExecution[] {
    return this.getExecutions().filter(exec => exec.triggerId === triggerId);
  }

  public async manualTrigger(triggerId: string, input: Record<string, unknown> = {}): Promise<void> {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      throw new Error(`Trigger not found: ${triggerId}`);
    }

    return this.executeTrigger(triggerId, {
      ...input,
      source: 'manual',
      triggeredAt: new Date()
    });
  }

  public updateTrigger(triggerId: string, updates: Partial<TriggerDefinition>): boolean {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) return false;

    // Clean up old setup if changing config
    this.cleanupTrigger(trigger);

    const updatedTrigger = { ...trigger, ...updates, updatedAt: new Date() };
    this.triggers.set(triggerId, updatedTrigger);

    // Setup with new config
    this.setupTrigger(updatedTrigger);

    this.emit('trigger:updated', updatedTrigger);
    return true;
  }

  public deleteTrigger(triggerId: string): boolean {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) return false;

    this.cleanupTrigger(trigger);
    this.triggers.delete(triggerId);

    this.emit('trigger:deleted', trigger);
    return true;
  }

  private cleanupTrigger(trigger: TriggerDefinition): void {
    // Clean up intervals
    const intervalId = this.intervalJobs.get(trigger.id);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervalJobs.delete(trigger.id);
    }

    // Clean up condition checks
    const conditionId = this.conditionChecks.get(trigger.id);
    if (conditionId) {
      clearInterval(conditionId);
      this.conditionChecks.delete(trigger.id);
    }

    // Clean up API pollers
    const pollerId = this.apiPollers.get(trigger.id);
    if (pollerId) {
      clearInterval(pollerId);
      this.apiPollers.delete(trigger.id);
    }

    // Clean up scheduled triggers
    for (const [id, scheduledTrigger] of this.scheduledTriggers.entries()) {
      if (scheduledTrigger.triggerId === trigger.id) {
        this.scheduledTriggers.delete(id);
      }
    }
  }

  public emitEvent(source: string, eventType: string, data: unknown): void {
    this.emit('external:event', { source, type: eventType, payload: data });
  }

  public getStats(): {
    totalTriggers: number;
    activeTriggers: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageResponseTime: number;
  } {
    const triggers = this.getTriggers();
    const executions = this.getExecutions();
    
    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(exec => exec.status === 'completed').length;
    const failedExecutions = executions.filter(exec => exec.status === 'failed').length;
    
    const totalResponseTime = executions
      .filter(exec => exec.duration)
      .reduce((sum, exec) => sum + (exec.duration || 0), 0);
    
    const averageResponseTime = totalExecutions > 0 ? totalResponseTime / totalExecutions : 0;

    return {
      totalTriggers: triggers.length,
      activeTriggers: this.getActiveTriggers().length,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageResponseTime
    };
  }

  public shutdown(): void {
    this.isRunning = false;
    
    // Clean up all triggers
    for (const trigger of this.triggers.values()) {
      this.cleanupTrigger(trigger);
    }

    this.removeAllListeners();
    console.log('🛑 TriggerService shutdown complete');
  }
}

export const triggerService = new TriggerService();