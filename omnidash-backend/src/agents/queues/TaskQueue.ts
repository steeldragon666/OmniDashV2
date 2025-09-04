/**
 * Task Queue Implementation
 * Manages task queuing and processing for agents using Bull queue
 */

import Bull, { Job, Queue, QueueOptions, JobOptions } from 'bull';
import Redis from 'redis';
import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { QueueConfig, JobData, AgentTask, TaskStatus } from '../types/AgentTypes';
import { AgentLogger } from '../utils/AgentLogger';

export interface TaskQueueEvents {
  'job-added': (job: Job<JobData>) => void;
  'job-started': (job: Job<JobData>) => void;
  'job-completed': (job: Job<JobData>, result: any) => void;
  'job-failed': (job: Job<JobData>, error: Error) => void;
  'job-stuck': (job: Job<JobData>) => void;
  'queue-drained': () => void;
  'queue-error': (error: Error) => void;
}

/**
 * Task queue for managing agent tasks
 */
export class TaskQueue extends EventEmitter {
  private queue: Queue<JobData>;
  private logger: Logger;
  private config: QueueConfig;
  private redisClient: Redis.RedisClientType | null = null;
  private isStarted: boolean = false;

  constructor(config: QueueConfig) {
    super();
    this.config = config;
    this.logger = AgentLogger.createLogger(`queue-${config.name}`, 'TaskQueue');
    
    this.initializeQueue();
    this.setupEventHandlers();
  }

  // =====================================
  // Queue Lifecycle
  // =====================================

  /**
   * Start the queue processing
   */
  public async start(): Promise<void> {
    if (this.isStarted) {
      this.logger.warn('Queue is already started');
      return;
    }

    try {
      await this.queue.resume();
      this.isStarted = true;
      this.logger.info(`Queue ${this.config.name} started`);
    } catch (error) {
      this.logger.error(`Failed to start queue ${this.config.name}:`, error);
      throw error;
    }
  }

  /**
   * Pause the queue processing
   */
  public async pause(): Promise<void> {
    try {
      await this.queue.pause();
      this.isStarted = false;
      this.logger.info(`Queue ${this.config.name} paused`);
    } catch (error) {
      this.logger.error(`Failed to pause queue ${this.config.name}:`, error);
      throw error;
    }
  }

  /**
   * Resume the queue processing
   */
  public async resume(): Promise<void> {
    try {
      await this.queue.resume();
      this.isStarted = true;
      this.logger.info(`Queue ${this.config.name} resumed`);
    } catch (error) {
      this.logger.error(`Failed to resume queue ${this.config.name}:`, error);
      throw error;
    }
  }

  /**
   * Close the queue
   */
  public async close(): Promise<void> {
    try {
      await this.queue.close();
      if (this.redisClient) {
        await this.redisClient.quit();
      }
      this.isStarted = false;
      this.logger.info(`Queue ${this.config.name} closed`);
    } catch (error) {
      this.logger.error(`Failed to close queue ${this.config.name}:`, error);
      throw error;
    }
  }

  // =====================================
  // Job Management
  // =====================================

  /**
   * Add a job to the queue
   */
  public async addJob(
    jobData: JobData,
    options?: JobOptions
  ): Promise<Job<JobData>> {
    try {
      const jobOptions = {
        ...this.config.defaultJobOptions,
        ...options
      };

      const job = await this.queue.add(jobData, jobOptions);
      
      this.logger.debug(`Job added to queue: ${job.id}`, {
        taskId: jobData.taskId,
        agentId: jobData.agentId,
        type: jobData.type
      });

      return job;
    } catch (error) {
      this.logger.error('Failed to add job to queue:', error);
      throw error;
    }
  }

  /**
   * Add multiple jobs to the queue
   */
  public async addJobs(
    jobsData: Array<{ data: JobData; options?: JobOptions }>
  ): Promise<Job<JobData>[]> {
    try {
      const jobs = await Promise.all(
        jobsData.map(({ data, options }) => this.addJob(data, options))
      );

      this.logger.info(`Added ${jobs.length} jobs to queue`);
      return jobs;
    } catch (error) {
      this.logger.error('Failed to add multiple jobs to queue:', error);
      throw error;
    }
  }

  /**
   * Get a job by ID
   */
  public async getJob(jobId: string | number): Promise<Job<JobData> | null> {
    try {
      return await this.queue.getJob(jobId);
    } catch (error) {
      this.logger.error(`Failed to get job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Remove a job from the queue
   */
  public async removeJob(jobId: string | number): Promise<boolean> {
    try {
      const job = await this.getJob(jobId);
      if (job) {
        await job.remove();
        this.logger.debug(`Job ${jobId} removed from queue`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to remove job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Retry a failed job
   */
  public async retryJob(jobId: string | number): Promise<boolean> {
    try {
      const job = await this.getJob(jobId);
      if (job) {
        await job.retry();
        this.logger.debug(`Job ${jobId} retried`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to retry job ${jobId}:`, error);
      return false;
    }
  }

  // =====================================
  // Queue Statistics and Monitoring
  // =====================================

  /**
   * Get queue statistics
   */
  public async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  }> {
    try {
      const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
        this.queue.getWaiting(),
        this.queue.getActive(),
        this.queue.getCompleted(),
        this.queue.getFailed(),
        this.queue.getDelayed(),
        this.queue.getPaused()
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        paused: paused.length
      };
    } catch (error) {
      this.logger.error('Failed to get queue stats:', error);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0
      };
    }
  }

  /**
   * Get waiting jobs count
   */
  public async getWaitingCount(): Promise<number> {
    try {
      const waiting = await this.queue.getWaiting();
      return waiting.length;
    } catch (error) {
      this.logger.error('Failed to get waiting count:', error);
      return 0;
    }
  }

  /**
   * Get active jobs count
   */
  public async getActiveCount(): Promise<number> {
    try {
      const active = await this.queue.getActive();
      return active.length;
    } catch (error) {
      this.logger.error('Failed to get active count:', error);
      return 0;
    }
  }

  /**
   * Get completed jobs count
   */
  public async getCompletedCount(): Promise<number> {
    try {
      const completed = await this.queue.getCompleted();
      return completed.length;
    } catch (error) {
      this.logger.error('Failed to get completed count:', error);
      return 0;
    }
  }

  /**
   * Get failed jobs count
   */
  public async getFailedCount(): Promise<number> {
    try {
      const failed = await this.queue.getFailed();
      return failed.length;
    } catch (error) {
      this.logger.error('Failed to get failed count:', error);
      return 0;
    }
  }

  /**
   * Get jobs by status
   */
  public async getJobsByStatus(
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused',
    start: number = 0,
    end: number = -1
  ): Promise<Job<JobData>[]> {
    try {
      switch (status) {
        case 'waiting':
          return await this.queue.getWaiting(start, end);
        case 'active':
          return await this.queue.getActive(start, end);
        case 'completed':
          return await this.queue.getCompleted(start, end);
        case 'failed':
          return await this.queue.getFailed(start, end);
        case 'delayed':
          return await this.queue.getDelayed(start, end);
        case 'paused':
          return await this.queue.getPaused(start, end);
        default:
          return [];
      }
    } catch (error) {
      this.logger.error(`Failed to get jobs by status ${status}:`, error);
      return [];
    }
  }

  // =====================================
  // Queue Maintenance
  // =====================================

  /**
   * Clean completed jobs
   */
  public async cleanCompleted(olderThan: number = 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const cleaned = await this.queue.clean(olderThan, 'completed');
      this.logger.info(`Cleaned ${cleaned} completed jobs older than ${olderThan}ms`);
      return cleaned;
    } catch (error) {
      this.logger.error('Failed to clean completed jobs:', error);
      return 0;
    }
  }

  /**
   * Clean failed jobs
   */
  public async cleanFailed(olderThan: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const cleaned = await this.queue.clean(olderThan, 'failed');
      this.logger.info(`Cleaned ${cleaned} failed jobs older than ${olderThan}ms`);
      return cleaned;
    } catch (error) {
      this.logger.error('Failed to clean failed jobs:', error);
      return 0;
    }
  }

  /**
   * Empty the queue
   */
  public async empty(): Promise<void> {
    try {
      await this.queue.empty();
      this.logger.info('Queue emptied');
    } catch (error) {
      this.logger.error('Failed to empty queue:', error);
      throw error;
    }
  }

  /**
   * Drain the queue (wait for all jobs to complete)
   */
  public async drain(delayed: boolean = false): Promise<void> {
    try {
      await this.queue.whenCurrentJobsFinished();
      if (delayed) {
        // Wait for delayed jobs as well
        const delayedJobs = await this.queue.getDelayed();
        if (delayedJobs.length > 0) {
          await new Promise(resolve => {
            const checkEmpty = async () => {
              const stats = await this.getStats();
              if (stats.waiting === 0 && stats.active === 0 && stats.delayed === 0) {
                resolve(void 0);
              } else {
                setTimeout(checkEmpty, 1000);
              }
            };
            checkEmpty();
          });
        }
      }
      this.logger.info('Queue drained');
    } catch (error) {
      this.logger.error('Failed to drain queue:', error);
      throw error;
    }
  }

  // =====================================
  // Event Handling
  // =====================================

  /**
   * Setup event handlers for the queue
   */
  private setupEventHandlers(): void {
    this.queue.on('global:completed', (jobId: string, result: any) => {
      this.logger.debug(`Job completed: ${jobId}`, result);
      this.emit('job-completed', { id: jobId }, result);
    });

    this.queue.on('global:failed', (jobId: string, error: Error) => {
      this.logger.error(`Job failed: ${jobId}`, error);
      this.emit('job-failed', { id: jobId }, error);
    });

    this.queue.on('global:active', (jobId: string, jobPromise: any) => {
      this.logger.debug(`Job started: ${jobId}`);
      this.emit('job-started', { id: jobId });
    });

    this.queue.on('global:stalled', (jobId: string) => {
      this.logger.warn(`Job stalled: ${jobId}`);
      this.emit('job-stuck', { id: jobId });
    });

    this.queue.on('drained', () => {
      this.logger.info('Queue drained');
      this.emit('queue-drained');
    });

    this.queue.on('error', (error: Error) => {
      this.logger.error('Queue error:', error);
      this.emit('queue-error', error);
    });
  }

  // =====================================
  // Private Methods
  // =====================================

  /**
   * Initialize the Bull queue
   */
  private initializeQueue(): void {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true
    };

    const queueOptions: QueueOptions = {
      redis: redisConfig,
      defaultJobOptions: this.config.defaultJobOptions,
      settings: {
        stalledInterval: 30 * 1000, // 30 seconds
        maxStalledCount: 3,
        retryProcessDelay: 5 * 1000 // 5 seconds
      }
    };

    this.queue = new Bull(this.config.name, queueOptions);

    // Process jobs
    this.queue.process(this.config.maxConcurrency, async (job: Job<JobData>) => {
      return await this.processJob(job);
    });
  }

  /**
   * Process a job
   */
  private async processJob(job: Job<JobData>): Promise<any> {
    const { taskId, agentId, type, payload, context } = job.data;
    
    this.logger.debug(`Processing job ${job.id} for task ${taskId}`, {
      agentId,
      type,
      priority: job.opts.priority
    });

    try {
      // Job processing logic would go here
      // This is a placeholder - actual processing happens in the agent
      return { success: true, taskId, timestamp: new Date() };
    } catch (error) {
      this.logger.error(`Job processing failed for ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Create a delay based on backoff strategy
   */
  private calculateBackoffDelay(attempt: number, baseDelay: number = 1000): number {
    return Math.min(baseDelay * Math.pow(2, attempt - 1), 60000); // Max 1 minute
  }
}