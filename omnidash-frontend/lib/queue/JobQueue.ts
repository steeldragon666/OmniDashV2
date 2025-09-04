import { Queue, Worker, Job, QueueOptions, WorkerOptions } from 'bullmq';
import { Redis } from 'ioredis';

// Job types
export interface WorkflowExecutionJob {
  workflowId: string;
  userId: string;
  executionId: string;
  triggerData?: any;
  context?: any;
}

export interface SocialPostJob {
  accountId: string;
  userId: string;
  content: {
    text?: string;
    imageUrls?: string[];
    videoUrl?: string;
    hashtags?: string[];
  };
  platforms: string[];
  scheduledAt?: string;
}

export interface EmailJob {
  userId: string;
  to: string[];
  subject: string;
  body: string;
  template?: string;
  variables?: Record<string, any>;
}

export interface WebhookJob {
  userId: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  retryAttempts?: number;
}

export interface ContentGenerationJob {
  userId: string;
  requestId: string;
  prompt: string;
  contentType: 'post' | 'article' | 'caption' | 'thread';
  platforms: string[];
  options?: {
    tone?: string;
    length?: number;
    keywords?: string[];
  };
}

type JobData = 
  | WorkflowExecutionJob
  | SocialPostJob 
  | EmailJob 
  | WebhookJob 
  | ContentGenerationJob;

export class JobQueue {
  private redis: Redis;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });

    this.setupQueues();
  }

  private setupQueues() {
    const queueConfig: QueueOptions = {
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    };

    // Create queues for different job types
    const queueTypes = [
      'workflow-execution',
      'social-posting',
      'email-sending',
      'webhook-delivery',
      'content-generation',
      'image-processing',
      'analytics-collection'
    ];

    queueTypes.forEach(queueName => {
      this.queues.set(queueName, new Queue(queueName, queueConfig));
    });
  }

  // Workflow Execution Jobs
  async addWorkflowExecutionJob(
    data: WorkflowExecutionJob, 
    options?: {
      priority?: number;
      delay?: number;
      attempts?: number;
    }
  ): Promise<Job<WorkflowExecutionJob>> {
    const queue = this.queues.get('workflow-execution')!;
    return queue.add('execute-workflow', data, {
      priority: options?.priority || 0,
      delay: options?.delay || 0,
      attempts: options?.attempts || 3,
      jobId: `workflow-${data.executionId}`
    });
  }

  // Social Media Posting Jobs
  async addSocialPostJob(
    data: SocialPostJob,
    options?: {
      scheduledAt?: Date;
      priority?: number;
    }
  ): Promise<Job<SocialPostJob>> {
    const queue = this.queues.get('social-posting')!;
    
    const jobOptions: any = {
      priority: options?.priority || 0,
      jobId: `social-post-${data.userId}-${Date.now()}`
    };

    if (options?.scheduledAt) {
      jobOptions.delay = options.scheduledAt.getTime() - Date.now();
    }

    return queue.add('post-to-social', data, jobOptions);
  }

  // Email Jobs
  async addEmailJob(
    data: EmailJob,
    options?: {
      priority?: number;
      delay?: number;
    }
  ): Promise<Job<EmailJob>> {
    const queue = this.queues.get('email-sending')!;
    return queue.add('send-email', data, {
      priority: options?.priority || 0,
      delay: options?.delay || 0,
      jobId: `email-${data.userId}-${Date.now()}`
    });
  }

  // Webhook Jobs
  async addWebhookJob(
    data: WebhookJob,
    options?: {
      priority?: number;
      delay?: number;
    }
  ): Promise<Job<WebhookJob>> {
    const queue = this.queues.get('webhook-delivery')!;
    return queue.add('deliver-webhook', data, {
      priority: options?.priority || 0,
      delay: options?.delay || 0,
      attempts: data.retryAttempts || 3,
      jobId: `webhook-${data.userId}-${Date.now()}`
    });
  }

  // Content Generation Jobs
  async addContentGenerationJob(
    data: ContentGenerationJob,
    options?: {
      priority?: number;
    }
  ): Promise<Job<ContentGenerationJob>> {
    const queue = this.queues.get('content-generation')!;
    return queue.add('generate-content', data, {
      priority: options?.priority || 0,
      jobId: `content-${data.requestId}`
    });
  }

  // Worker Management
  createWorkflowWorker(processor: (job: Job<WorkflowExecutionJob>) => Promise<any>) {
    const worker = new Worker(
      'workflow-execution',
      async (job: Job<WorkflowExecutionJob>) => {
        console.log(`Processing workflow execution: ${job.data.executionId}`);
        return processor(job);
      },
      {
        connection: this.redis,
        concurrency: parseInt(process.env.WORKFLOW_WORKER_CONCURRENCY || '5'),
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    );

    this.workers.set('workflow-execution', worker);
    this.setupWorkerEvents(worker, 'workflow-execution');
    return worker;
  }

  createSocialWorker(processor: (job: Job<SocialPostJob>) => Promise<any>) {
    const worker = new Worker(
      'social-posting',
      async (job: Job<SocialPostJob>) => {
        console.log(`Processing social post for user: ${job.data.userId}`);
        return processor(job);
      },
      {
        connection: this.redis,
        concurrency: parseInt(process.env.SOCIAL_WORKER_CONCURRENCY || '3'),
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    );

    this.workers.set('social-posting', worker);
    this.setupWorkerEvents(worker, 'social-posting');
    return worker;
  }

  createEmailWorker(processor: (job: Job<EmailJob>) => Promise<any>) {
    const worker = new Worker(
      'email-sending',
      async (job: Job<EmailJob>) => {
        console.log(`Processing email for user: ${job.data.userId}`);
        return processor(job);
      },
      {
        connection: this.redis,
        concurrency: parseInt(process.env.EMAIL_WORKER_CONCURRENCY || '10'),
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    );

    this.workers.set('email-sending', worker);
    this.setupWorkerEvents(worker, 'email-sending');
    return worker;
  }

  createWebhookWorker(processor: (job: Job<WebhookJob>) => Promise<any>) {
    const worker = new Worker(
      'webhook-delivery',
      async (job: Job<WebhookJob>) => {
        console.log(`Processing webhook for user: ${job.data.userId}`);
        return processor(job);
      },
      {
        connection: this.redis,
        concurrency: parseInt(process.env.WEBHOOK_WORKER_CONCURRENCY || '5'),
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    );

    this.workers.set('webhook-delivery', worker);
    this.setupWorkerEvents(worker, 'webhook-delivery');
    return worker;
  }

  createContentWorker(processor: (job: Job<ContentGenerationJob>) => Promise<any>) {
    const worker = new Worker(
      'content-generation',
      async (job: Job<ContentGenerationJob>) => {
        console.log(`Processing content generation: ${job.data.requestId}`);
        return processor(job);
      },
      {
        connection: this.redis,
        concurrency: parseInt(process.env.CONTENT_WORKER_CONCURRENCY || '2'),
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    );

    this.workers.set('content-generation', worker);
    this.setupWorkerEvents(worker, 'content-generation');
    return worker;
  }

  private setupWorkerEvents(worker: Worker, workerName: string) {
    worker.on('completed', (job) => {
      console.log(`✅ ${workerName} job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`❌ ${workerName} job ${job?.id} failed:`, err.message);
    });

    worker.on('progress', (job, progress) => {
      console.log(`⏳ ${workerName} job ${job.id} progress: ${progress}%`);
    });

    worker.on('stalled', (jobId) => {
      console.warn(`⚠️  ${workerName} job ${jobId} stalled`);
    });

    worker.on('error', (err) => {
      console.error(`❌ ${workerName} worker error:`, err);
    });
  }

  // Queue Management
  async getQueueStats(queueName: string) {
    const queue = this.queues.get(queueName);
    if (!queue) return null;

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  async getAllQueueStats() {
    const stats: Record<string, any> = {};
    
    for (const [queueName] of this.queues) {
      stats[queueName] = await this.getQueueStats(queueName);
    }

    return stats;
  }

  async pauseQueue(queueName: string) {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.pause();
    }
  }

  async resumeQueue(queueName: string) {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.resume();
    }
  }

  async clearQueue(queueName: string, jobState: 'completed' | 'failed' | 'active' | 'waiting' = 'completed') {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.clean(0, 1000, jobState);
    }
  }

  // Job Management
  async getJob(queueName: string, jobId: string) {
    const queue = this.queues.get(queueName);
    if (!queue) return null;

    return queue.getJob(jobId);
  }

  async removeJob(queueName: string, jobId: string) {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
      return true;
    }
    return false;
  }

  async retryJob(queueName: string, jobId: string) {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    const job = await queue.getJob(jobId);
    if (job && job.failedReason) {
      await job.retry();
      return true;
    }
    return false;
  }

  async getJobLogs(queueName: string, jobId: string) {
    const queue = this.queues.get(queueName);
    if (!queue) return null;

    const job = await queue.getJob(jobId);
    if (job) {
      return job.log;
    }
    return null;
  }

  // Batch Operations
  async addBulkJobs(queueName: string, jobs: Array<{
    name: string;
    data: JobData;
    opts?: any;
  }>) {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);

    return queue.addBulk(jobs);
  }

  // Scheduled Jobs
  async addRecurringJob(
    queueName: string,
    jobName: string,
    data: JobData,
    cronExpression: string,
    options?: any
  ) {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);

    return queue.add(jobName, data, {
      repeat: { cron: cronExpression },
      ...options
    });
  }

  async removeRecurringJob(queueName: string, jobKey: string) {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    await queue.removeRepeatable(jobKey);
    return true;
  }

  // Health Check
  async healthCheck() {
    try {
      await this.redis.ping();
      
      const queueStats = await this.getAllQueueStats();
      const workerStats = Array.from(this.workers.entries()).map(([name, worker]) => ({
        name,
        isRunning: !worker.isRunning(),
        isPaused: worker.isPaused()
      }));

      return {
        redis: 'connected',
        queues: queueStats,
        workers: workerStats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        redis: 'disconnected',
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Cleanup
  async shutdown() {
    console.log('Shutting down job queue...');

    // Close all workers
    await Promise.all(
      Array.from(this.workers.values()).map(worker => worker.close())
    );

    // Close all queues
    await Promise.all(
      Array.from(this.queues.values()).map(queue => queue.close())
    );

    // Close Redis connection
    this.redis.disconnect();

    console.log('Job queue shutdown complete');
  }
}

// Singleton instance
export const jobQueue = new JobQueue();