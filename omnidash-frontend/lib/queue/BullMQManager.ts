import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  lazyConnect: true
};

// Create Redis connections
const redis = new Redis(redisConfig);
const redisSubscriber = new Redis(redisConfig);
const redisPublisher = new Redis(redisConfig);

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
    mentions?: string[];
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
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  retries?: number;
}

export interface ContentGenerationJob {
  userId: string;
  requestId: string;
  prompt: string;
  contentType: 'post' | 'article' | 'caption' | 'thread';
  platforms: string[];
  aiProvider?: 'openai' | 'anthropic' | 'google';
  options?: {
    tone?: string;
    length?: number;
    includeHashtags?: boolean;
    includeMentions?: boolean;
  };
}

export class BullMQManager {
  private static instance: BullMQManager;
  
  // Queues
  private workflowQueue: Queue<WorkflowExecutionJob>;
  private socialQueue: Queue<SocialPostJob>;
  private emailQueue: Queue<EmailJob>;
  private webhookQueue: Queue<WebhookJob>;
  private contentQueue: Queue<ContentGenerationJob>;
  
  // Workers
  private workflowWorker?: Worker<WorkflowExecutionJob>;
  private socialWorker?: Worker<SocialPostJob>;
  private emailWorker?: Worker<EmailJob>;
  private webhookWorker?: Worker<WebhookJob>;
  private contentWorker?: Worker<ContentGenerationJob>;
  
  // Events
  private queueEvents: Map<string, QueueEvents> = new Map();
  
  private constructor() {
    // Initialize queues
    this.workflowQueue = new Queue<WorkflowExecutionJob>('workflow-execution', {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.socialQueue = new Queue<SocialPostJob>('social-posting', {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 25,
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 5000,
        },
      },
    });

    this.emailQueue = new Queue<EmailJob>('email-sending', {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 100,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });

    this.webhookQueue = new Queue<WebhookJob>('webhook-delivery', {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1500,
        },
      },
    });

    this.contentQueue = new Queue<ContentGenerationJob>('content-generation', {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 25,
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 3000,
        },
      },
    });

    // Setup queue events monitoring
    this.setupQueueEvents();
    
    console.log('🔧 BullMQ Manager initialized with queues');
  }

  public static getInstance(): BullMQManager {
    if (!BullMQManager.instance) {
      BullMQManager.instance = new BullMQManager();
    }
    return BullMQManager.instance;
  }

  private setupQueueEvents() {
    const queues = [
      { name: 'workflow-execution', queue: this.workflowQueue },
      { name: 'social-posting', queue: this.socialQueue },
      { name: 'email-sending', queue: this.emailQueue },
      { name: 'webhook-delivery', queue: this.webhookQueue },
      { name: 'content-generation', queue: this.contentQueue },
    ];

    queues.forEach(({ name, queue }) => {
      const queueEvents = new QueueEvents(name, { connection: redis });
      this.queueEvents.set(name, queueEvents);

      // Listen for job events
      queueEvents.on('completed', ({ jobId, returnvalue }) => {
        console.log(`✅ Job ${jobId} in queue ${name} completed:`, returnvalue);
      });

      queueEvents.on('failed', ({ jobId, failedReason }) => {
        console.error(`❌ Job ${jobId} in queue ${name} failed:`, failedReason);
      });

      queueEvents.on('progress', ({ jobId, data }) => {
        console.log(`⏳ Job ${jobId} progress:`, data);
      });

      queueEvents.on('stalled', ({ jobId }) => {
        console.warn(`🔄 Job ${jobId} in queue ${name} stalled`);
      });
    });
  }

  // Job addition methods
  async addWorkflowExecutionJob(
    data: WorkflowExecutionJob, 
    options?: { delay?: number; priority?: number }
  ): Promise<Job<WorkflowExecutionJob>> {
    return await this.workflowQueue.add('execute-workflow', data, {
      ...options,
      jobId: data.executionId,
    });
  }

  async addSocialPostJob(
    data: SocialPostJob, 
    options?: { scheduledAt?: Date; priority?: number }
  ): Promise<Job<SocialPostJob>> {
    const jobOptions: any = { ...options };
    
    if (options?.scheduledAt) {
      jobOptions.delay = options.scheduledAt.getTime() - Date.now();
    }

    return await this.socialQueue.add('post-to-social', data, jobOptions);
  }

  async addEmailJob(data: EmailJob): Promise<Job<EmailJob>> {
    return await this.emailQueue.add('send-email', data);
  }

  async addWebhookJob(data: WebhookJob): Promise<Job<WebhookJob>> {
    return await this.webhookQueue.add('deliver-webhook', data);
  }

  async addContentGenerationJob(data: ContentGenerationJob): Promise<Job<ContentGenerationJob>> {
    return await this.contentQueue.add('generate-content', data, {
      priority: 10, // Higher priority for AI generation
    });
  }

  // Worker creation methods
  createWorkflowWorker(processor: (job: Job<WorkflowExecutionJob>) => Promise<any>) {
    this.workflowWorker = new Worker<WorkflowExecutionJob>(
      'workflow-execution',
      processor,
      {
        connection: redis,
        concurrency: parseInt(process.env.WORKFLOW_WORKER_CONCURRENCY || '5'),
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    );

    this.workflowWorker.on('completed', (job) => {
      console.log(`✅ Workflow execution job ${job.id} completed`);
    });

    this.workflowWorker.on('failed', (job, err) => {
      console.error(`❌ Workflow execution job ${job?.id} failed:`, err);
    });

    return this.workflowWorker;
  }

  createSocialWorker(processor: (job: Job<SocialPostJob>) => Promise<any>) {
    this.socialWorker = new Worker<SocialPostJob>(
      'social-posting',
      processor,
      {
        connection: redis,
        concurrency: parseInt(process.env.SOCIAL_WORKER_CONCURRENCY || '3'),
        removeOnComplete: 50,
        removeOnFail: 25,
      }
    );

    this.socialWorker.on('completed', (job) => {
      console.log(`📱 Social posting job ${job.id} completed`);
    });

    this.socialWorker.on('failed', (job, err) => {
      console.error(`❌ Social posting job ${job?.id} failed:`, err);
    });

    return this.socialWorker;
  }

  createEmailWorker(processor: (job: Job<EmailJob>) => Promise<any>) {
    this.emailWorker = new Worker<EmailJob>(
      'email-sending',
      processor,
      {
        connection: redis,
        concurrency: parseInt(process.env.EMAIL_WORKER_CONCURRENCY || '10'),
        removeOnComplete: 200,
        removeOnFail: 100,
      }
    );

    this.emailWorker.on('completed', (job) => {
      console.log(`📧 Email job ${job.id} completed`);
    });

    this.emailWorker.on('failed', (job, err) => {
      console.error(`❌ Email job ${job?.id} failed:`, err);
    });

    return this.emailWorker;
  }

  createWebhookWorker(processor: (job: Job<WebhookJob>) => Promise<any>) {
    this.webhookWorker = new Worker<WebhookJob>(
      'webhook-delivery',
      processor,
      {
        connection: redis,
        concurrency: parseInt(process.env.WEBHOOK_WORKER_CONCURRENCY || '5'),
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    );

    this.webhookWorker.on('completed', (job) => {
      console.log(`🔗 Webhook job ${job.id} completed`);
    });

    this.webhookWorker.on('failed', (job, err) => {
      console.error(`❌ Webhook job ${job?.id} failed:`, err);
    });

    return this.webhookWorker;
  }

  createContentWorker(processor: (job: Job<ContentGenerationJob>) => Promise<any>) {
    this.contentWorker = new Worker<ContentGenerationJob>(
      'content-generation',
      processor,
      {
        connection: redis,
        concurrency: parseInt(process.env.CONTENT_WORKER_CONCURRENCY || '2'),
        removeOnComplete: 50,
        removeOnFail: 25,
      }
    );

    this.contentWorker.on('completed', (job) => {
      console.log(`🤖 Content generation job ${job.id} completed`);
    });

    this.contentWorker.on('failed', (job, err) => {
      console.error(`❌ Content generation job ${job?.id} failed:`, err);
    });

    return this.contentWorker;
  }

  // Queue management methods
  async getQueueStats() {
    const stats = await Promise.all([
      this.workflowQueue.getJobCounts(),
      this.socialQueue.getJobCounts(),
      this.emailQueue.getJobCounts(), 
      this.webhookQueue.getJobCounts(),
      this.contentQueue.getJobCounts(),
    ]);

    return {
      workflow: stats[0],
      social: stats[1],
      email: stats[2],
      webhook: stats[3],
      content: stats[4],
      timestamp: new Date().toISOString()
    };
  }

  async pauseQueue(queueName: string) {
    const queue = this.getQueue(queueName);
    if (queue) {
      await queue.pause();
      console.log(`⏸️ Queue ${queueName} paused`);
    }
  }

  async resumeQueue(queueName: string) {
    const queue = this.getQueue(queueName);
    if (queue) {
      await queue.resume();
      console.log(`▶️ Queue ${queueName} resumed`);
    }
  }

  async clearQueue(queueName: string) {
    const queue = this.getQueue(queueName);
    if (queue) {
      await queue.drain();
      console.log(`🗑️ Queue ${queueName} cleared`);
    }
  }

  private getQueue(queueName: string) {
    switch (queueName) {
      case 'workflow-execution':
        return this.workflowQueue;
      case 'social-posting':
        return this.socialQueue;
      case 'email-sending':
        return this.emailQueue;
      case 'webhook-delivery':
        return this.webhookQueue;
      case 'content-generation':
        return this.contentQueue;
      default:
        return null;
    }
  }

  // Health check
  async healthCheck() {
    try {
      await redis.ping();
      const stats = await this.getQueueStats();
      
      return {
        redis: 'connected',
        queues: Object.keys(stats).length,
        stats,
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

  // Graceful shutdown
  async shutdown() {
    console.log('🔄 Starting BullMQ graceful shutdown...');
    
    // Close workers
    const workers = [
      this.workflowWorker,
      this.socialWorker,
      this.emailWorker,
      this.webhookWorker,
      this.contentWorker,
    ];

    await Promise.all(
      workers.filter(Boolean).map(worker => worker!.close())
    );

    // Close queue events
    await Promise.all(
      Array.from(this.queueEvents.values()).map(events => events.close())
    );

    // Close queues
    const queues = [
      this.workflowQueue,
      this.socialQueue,
      this.emailQueue,
      this.webhookQueue,
      this.contentQueue,
    ];

    await Promise.all(queues.map(queue => queue.close()));

    // Close Redis connections
    await Promise.all([
      redis.quit(),
      redisSubscriber.quit(),
      redisPublisher.quit(),
    ]);

    console.log('✅ BullMQ graceful shutdown complete');
  }
}

// Export singleton instance
export const bullMQManager = BullMQManager.getInstance();