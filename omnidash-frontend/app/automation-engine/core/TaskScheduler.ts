import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowEngine } from './WorkflowEngine';

export interface ScheduledTask {
  id: string;
  workflowId: string;
  cronExpression: string;
  timezone?: string;
  isActive: boolean;
  lastExecution?: Date;
  nextExecution: Date;
  executionCount: number;
  maxExecutions?: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CronJob {
  id: string;
  schedule: string;
  callback: () => void;
  isRunning: boolean;
  intervalId?: NodeJS.Timeout;
}

export class TaskScheduler extends EventEmitter {
  private scheduledTasks: Map<string, ScheduledTask> = new Map();
  private cronJobs: Map<string, CronJob> = new Map();
  private workflowEngine: WorkflowEngine;
  private isRunning: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(workflowEngine: WorkflowEngine) {
    super();
    this.workflowEngine = workflowEngine;
    this.initialize();
  }

  private initialize() {
    this.startScheduler();
  }

  public scheduleWorkflow(
    workflowId: string,
    cronExpression: string,
    options: {
      timezone?: string;
      maxExecutions?: number;
      metadata?: Record<string, any>;
    } = {}
  ): ScheduledTask {
    const taskId = uuidv4();
    const nextExecution = this.getNextExecutionTime(cronExpression, options.timezone);

    const scheduledTask: ScheduledTask = {
      id: taskId,
      workflowId,
      cronExpression,
      timezone: options.timezone || 'UTC',
      isActive: true,
      nextExecution,
      executionCount: 0,
      maxExecutions: options.maxExecutions,
      metadata: options.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.scheduledTasks.set(taskId, scheduledTask);
    this.emit('task:scheduled', scheduledTask);

    console.log(`📅 Scheduled task: ${taskId} for workflow: ${workflowId}`);
    return scheduledTask;
  }

  public unscheduleTask(taskId: string): boolean {
    const task = this.scheduledTasks.get(taskId);
    if (!task) return false;

    task.isActive = false;
    task.updatedAt = new Date();
    this.scheduledTasks.set(taskId, task);

    this.emit('task:unscheduled', task);
    console.log(`🗑️ Unscheduled task: ${taskId}`);
    return true;
  }

  public pauseTask(taskId: string): boolean {
    const task = this.scheduledTasks.get(taskId);
    if (!task) return false;

    task.isActive = false;
    task.updatedAt = new Date();
    this.scheduledTasks.set(taskId, task);

    this.emit('task:paused', task);
    return true;
  }

  public resumeTask(taskId: string): boolean {
    const task = this.scheduledTasks.get(taskId);
    if (!task) return false;

    task.isActive = true;
    task.nextExecution = this.getNextExecutionTime(task.cronExpression, task.timezone);
    task.updatedAt = new Date();
    this.scheduledTasks.set(taskId, task);

    this.emit('task:resumed', task);
    return true;
  }

  private startScheduler() {
    if (this.isRunning) return;

    this.isRunning = true;
    
    // Check every minute for due tasks
    this.checkInterval = setInterval(() => {
      this.checkDueTasks();
    }, 60000); // 1 minute

    console.log('⏰ Task scheduler started');
  }

  public stopScheduler() {
    if (!this.isRunning) return;

    this.isRunning = false;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Stop all cron jobs
    for (const job of this.cronJobs.values()) {
      this.stopCronJob(job.id);
    }

    console.log('⏰ Task scheduler stopped');
  }

  private async checkDueTasks() {
    const now = new Date();
    const dueTasks = Array.from(this.scheduledTasks.values()).filter(
      task => task.isActive && task.nextExecution <= now
    );

    for (const task of dueTasks) {
      await this.executeScheduledTask(task);
    }
  }

  private async executeScheduledTask(task: ScheduledTask) {
    try {
      // Check if we've hit max executions
      if (task.maxExecutions && task.executionCount >= task.maxExecutions) {
        task.isActive = false;
        this.emit('task:max_executions_reached', task);
        return;
      }

      // Execute the workflow
      const execution = await this.workflowEngine.executeWorkflow(
        task.workflowId,
        { 
          scheduledTaskId: task.id,
          executionCount: task.executionCount + 1,
          ...task.metadata 
        },
        'schedule'
      );

      // Update task
      task.lastExecution = new Date();
      task.executionCount++;
      task.nextExecution = this.getNextExecutionTime(task.cronExpression, task.timezone);
      task.updatedAt = new Date();
      
      this.scheduledTasks.set(task.id, task);
      
      this.emit('task:executed', { task, execution });
      console.log(`✅ Executed scheduled task: ${task.id}`);

    } catch (error) {
      this.emit('task:execution_failed', { task, error });
      console.error(`❌ Failed to execute scheduled task: ${task.id}`, error);
      
      // Update next execution time anyway
      task.nextExecution = this.getNextExecutionTime(task.cronExpression, task.timezone);
      task.updatedAt = new Date();
      this.scheduledTasks.set(task.id, task);
    }
  }

  public createCronJob(
    schedule: string,
    callback: () => void,
    options: { timezone?: string } = {}
  ): string {
    const jobId = uuidv4();
    
    const cronJob: CronJob = {
      id: jobId,
      schedule,
      callback,
      isRunning: false
    };

    this.cronJobs.set(jobId, cronJob);
    this.startCronJob(jobId);
    
    return jobId;
  }

  public startCronJob(jobId: string): boolean {
    const job = this.cronJobs.get(jobId);
    if (!job || job.isRunning) return false;

    // Simple interval-based scheduling
    // In production, use a proper cron library like 'node-cron'
    const intervalMs = this.cronToInterval(job.schedule);
    if (intervalMs > 0) {
      job.intervalId = setInterval(job.callback, intervalMs);
      job.isRunning = true;
      return true;
    }

    return false;
  }

  public stopCronJob(jobId: string): boolean {
    const job = this.cronJobs.get(jobId);
    if (!job || !job.isRunning) return false;

    if (job.intervalId) {
      clearInterval(job.intervalId);
      job.intervalId = undefined;
    }
    
    job.isRunning = false;
    return true;
  }

  public deleteCronJob(jobId: string): boolean {
    this.stopCronJob(jobId);
    return this.cronJobs.delete(jobId);
  }

  private getNextExecutionTime(cronExpression: string, timezone?: string): Date {
    // Simplified cron parsing - in production use a proper cron library
    const now = new Date();
    
    // Basic patterns
    if (cronExpression === '* * * * *') {
      // Every minute
      return new Date(now.getTime() + 60000);
    } else if (cronExpression === '0 * * * *') {
      // Every hour
      const next = new Date(now);
      next.setMinutes(0, 0, 0);
      next.setHours(next.getHours() + 1);
      return next;
    } else if (cronExpression === '0 0 * * *') {
      // Daily at midnight
      const next = new Date(now);
      next.setHours(0, 0, 0, 0);
      next.setDate(next.getDate() + 1);
      return next;
    } else if (cronExpression === '0 9 * * *') {
      // Daily at 9 AM
      const next = new Date(now);
      next.setHours(9, 0, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    } else if (cronExpression === '0 0 * * 1') {
      // Weekly on Monday
      const next = new Date(now);
      next.setHours(0, 0, 0, 0);
      const daysUntilMonday = (1 + 7 - next.getDay()) % 7 || 7;
      next.setDate(next.getDate() + daysUntilMonday);
      return next;
    }

    // Default: next hour
    return new Date(now.getTime() + 3600000);
  }

  private cronToInterval(cronExpression: string): number {
    // Convert basic cron expressions to milliseconds
    // This is simplified - use a proper cron library in production
    
    if (cronExpression === '* * * * *') return 60000; // 1 minute
    if (cronExpression === '*/5 * * * *') return 300000; // 5 minutes
    if (cronExpression === '*/15 * * * *') return 900000; // 15 minutes
    if (cronExpression === '*/30 * * * *') return 1800000; // 30 minutes
    if (cronExpression === '0 * * * *') return 3600000; // 1 hour
    
    return 0; // Invalid or unsupported
  }

  public getScheduledTasks(): ScheduledTask[] {
    return Array.from(this.scheduledTasks.values());
  }

  public getActiveScheduledTasks(): ScheduledTask[] {
    return this.getScheduledTasks().filter(task => task.isActive);
  }

  public getScheduledTask(taskId: string): ScheduledTask | undefined {
    return this.scheduledTasks.get(taskId);
  }

  public getTasksByWorkflow(workflowId: string): ScheduledTask[] {
    return this.getScheduledTasks().filter(task => task.workflowId === workflowId);
  }

  public updateTaskSchedule(taskId: string, newCronExpression: string): boolean {
    const task = this.scheduledTasks.get(taskId);
    if (!task) return false;

    task.cronExpression = newCronExpression;
    task.nextExecution = this.getNextExecutionTime(newCronExpression, task.timezone);
    task.updatedAt = new Date();
    
    this.scheduledTasks.set(taskId, task);
    this.emit('task:updated', task);
    
    return true;
  }

  public getUpcomingTasks(limit: number = 10): ScheduledTask[] {
    return this.getActiveScheduledTasks()
      .sort((a, b) => a.nextExecution.getTime() - b.nextExecution.getTime())
      .slice(0, limit);
  }

  public getTaskExecutionStats(taskId: string): {
    executionCount: number;
    lastExecution?: Date;
    nextExecution: Date;
    averageInterval?: number;
  } | null {
    const task = this.scheduledTasks.get(taskId);
    if (!task) return null;

    return {
      executionCount: task.executionCount,
      lastExecution: task.lastExecution,
      nextExecution: task.nextExecution,
      averageInterval: task.lastExecution && task.executionCount > 1 
        ? (Date.now() - task.createdAt.getTime()) / task.executionCount
        : undefined
    };
  }

  public validateCronExpression(cronExpression: string): boolean {
    // Basic validation - in production use a proper cron parser
    const validExpressions = [
      '* * * * *',
      '*/5 * * * *',
      '*/15 * * * *',
      '*/30 * * * *',
      '0 * * * *',
      '0 0 * * *',
      '0 9 * * *',
      '0 0 * * 1'
    ];
    
    return validExpressions.includes(cronExpression) || 
           /^([0-5]?\d|\*) ([01]?\d|2[0-3]|\*) ([0-2]?\d|3[01]|\*) ([0]?\d|1[0-2]|\*) ([0-6]|\*)$/.test(cronExpression);
  }
}

export const createTaskScheduler = (workflowEngine: WorkflowEngine) => 
  new TaskScheduler(workflowEngine);