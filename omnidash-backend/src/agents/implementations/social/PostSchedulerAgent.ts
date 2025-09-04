/**
 * Post Scheduler Agent
 * Handles social media post scheduling and publishing across multiple platforms
 */

import { BaseAgent } from '../../core/BaseAgent';
import {
  ISocialAgent,
  ISchedulableAgent,
  AgentConfig,
  AgentTask,
  AgentCapability,
  TaskContext,
  ServiceConnection
} from '../../types/AgentTypes';
import axios, { AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';

export interface SocialPost {
  id: string;
  content: string;
  platforms: string[];
  scheduledTime: Date;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  mediaUrls?: string[];
  hashtags?: string[];
  mentions?: string[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    campaignId?: string;
    brandId?: string;
  };
  platformData?: Record<string, any>;
  publishResults?: Record<string, {
    success: boolean;
    postId?: string;
    error?: string;
    publishedAt?: Date;
  }>;
}

export interface PlatformConfig {
  name: string;
  enabled: boolean;
  credentials: {
    accessToken?: string;
    refreshToken?: string;
    apiKey?: string;
    apiSecret?: string;
    appId?: string;
    userId?: string;
  };
  rateLimits: {
    postsPerHour: number;
    postsPerDay: number;
    lastReset: Date;
    currentCount: number;
  };
  features: {
    supportsImages: boolean;
    supportsVideos: boolean;
    supportsHashtags: boolean;
    supportsMentions: boolean;
    supportsScheduling: boolean;
    maxTextLength: number;
    maxMediaCount: number;
  };
}

export interface SchedulingRule {
  id: string;
  name: string;
  enabled: boolean;
  platforms: string[];
  schedule: {
    timezone: string;
    days: number[]; // 0-6 (Sunday-Saturday)
    times: string[]; // HH:MM format
    frequency: 'once' | 'daily' | 'weekly' | 'monthly';
    endDate?: Date;
  };
  contentFilters: {
    tags?: string[];
    categories?: string[];
    keywords?: string[];
  };
  conditions: {
    minEngagementRate?: number;
    maxFailureRate?: number;
    accountFollowerMin?: number;
  };
}

/**
 * Social media post scheduling and publishing agent
 */
export class PostSchedulerAgent extends BaseAgent implements ISocialAgent, ISchedulableAgent {
  private platformConfigs: Map<string, PlatformConfig> = new Map();
  private scheduledPosts: Map<string, SocialPost> = new Map();
  private schedulingRules: Map<string, SchedulingRule> = new Map();
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private contentCalendar: SocialPost[] = [];
  private publishingQueue: SocialPost[] = [];
  private isProcessingQueue: boolean = false;

  constructor(config: AgentConfig) {
    super(config);
    this.initializePlatformConfigs();
    this.setupCapabilities();
    this.startQueueProcessor();
  }

  // =====================================
  // Agent Lifecycle
  // =====================================

  protected async onInitialize(): Promise<void> {
    await this.loadPlatformCredentials();
    await this.loadSchedulingRules();
    await this.loadScheduledPosts();
    this.logger.info('PostSchedulerAgent initialized successfully');
  }

  protected async onStart(): Promise<void> {
    await this.testPlatformConnections();
    await this.resumeScheduledTasks();
    this.startQueueProcessor();
    this.logger.info('PostSchedulerAgent started and ready');
  }

  protected async onStop(): Promise<void> {
    this.stopAllCronJobs();
    this.isProcessingQueue = false;
    await this.saveState();
    this.logger.info('PostSchedulerAgent stopped');
  }

  // =====================================
  // Task Processing
  // =====================================

  public canHandleTask(task: AgentTask): boolean {
    const supportedTypes = [
      'schedule-post',
      'publish-post',
      'cancel-post',
      'update-post',
      'get-post-status',
      'get-analytics',
      'manage-calendar',
      'sync-platforms'
    ];
    return supportedTypes.includes(task.type);
  }

  protected async executeTask(task: AgentTask): Promise<any> {
    const startTime = Date.now();
    
    try {
      let result: any;

      switch (task.type) {
        case 'schedule-post':
          result = await this.handleSchedulePost(task);
          break;
        case 'publish-post':
          result = await this.handlePublishPost(task);
          break;
        case 'cancel-post':
          result = await this.handleCancelPost(task);
          break;
        case 'update-post':
          result = await this.handleUpdatePost(task);
          break;
        case 'get-post-status':
          result = await this.handleGetPostStatus(task);
          break;
        case 'get-analytics':
          result = await this.handleGetAnalytics(task);
          break;
        case 'manage-calendar':
          result = await this.handleManageCalendar(task);
          break;
        case 'sync-platforms':
          result = await this.handleSyncPlatforms(task);
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
      case 'schedule-post':
        return !!(task.payload.content && task.payload.platforms && task.payload.scheduledTime);
      case 'publish-post':
        return !!(task.payload.postId || (task.payload.content && task.payload.platforms));
      case 'cancel-post':
      case 'get-post-status':
        return !!task.payload.postId;
      case 'update-post':
        return !!(task.payload.postId && task.payload.updates);
      case 'get-analytics':
        return !!(task.payload.platform || task.payload.postId);
      default:
        return true;
    }
  }

  // =====================================
  // ISocialAgent Implementation
  // =====================================

  public async connectPlatform(platform: string, credentials: any): Promise<void> {
    try {
      const config = this.createPlatformConfig(platform, credentials);
      
      // Test the connection
      const connectionTest = await this.testPlatformConnection(platform, config);
      if (!connectionTest.success) {
        throw new Error(`Failed to connect to ${platform}: ${connectionTest.error}`);
      }

      this.platformConfigs.set(platform, config);
      await this.savePlatformConfig(platform, config);
      
      this.logger.info(`Successfully connected to platform: ${platform}`);
    } catch (error) {
      this.logger.error(`Failed to connect to platform ${platform}:`, error);
      throw error;
    }
  }

  public async disconnectPlatform(platform: string): Promise<void> {
    try {
      const config = this.platformConfigs.get(platform);
      if (config) {
        config.enabled = false;
        await this.savePlatformConfig(platform, config);
        this.logger.info(`Disconnected from platform: ${platform}`);
      }
    } catch (error) {
      this.logger.error(`Failed to disconnect from platform ${platform}:`, error);
      throw error;
    }
  }

  public async getConnectedPlatforms(): Promise<string[]> {
    return Array.from(this.platformConfigs.entries())
      .filter(([_, config]) => config.enabled)
      .map(([platform, _]) => platform);
  }

  public async publishPost(platform: string, content: any): Promise<string> {
    const config = this.platformConfigs.get(platform);
    if (!config || !config.enabled) {
      throw new Error(`Platform ${platform} is not connected or disabled`);
    }

    try {
      await this.checkRateLimit(platform);
      const result = await this.publishToPlatform(platform, content, config);
      
      this.updateRateLimit(platform);
      this.metricsCollector.incrementCounter('posts.published', 1, { platform });
      
      return result.postId;
    } catch (error) {
      this.metricsCollector.incrementCounter('posts.failed', 1, { platform });
      throw error;
    }
  }

  public async schedulePost(platform: string, content: any, scheduledTime: Date): Promise<string> {
    const post: SocialPost = {
      id: uuidv4(),
      content: typeof content === 'string' ? content : content.text,
      platforms: [platform],
      scheduledTime,
      status: 'scheduled',
      mediaUrls: content.mediaUrls,
      hashtags: content.hashtags,
      mentions: content.mentions,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: content.createdBy,
        campaignId: content.campaignId,
        brandId: content.brandId
      },
      platformData: {
        [platform]: content.platformSpecific || {}
      }
    };

    await this.schedulePostInternal(post);
    return post.id;
  }

  public async deletePost(platform: string, postId: string): Promise<void> {
    const config = this.platformConfigs.get(platform);
    if (!config || !config.enabled) {
      throw new Error(`Platform ${platform} is not connected or disabled`);
    }

    try {
      await this.deletePlatformPost(platform, postId, config);
      this.logger.info(`Post ${postId} deleted from ${platform}`);
    } catch (error) {
      this.logger.error(`Failed to delete post ${postId} from ${platform}:`, error);
      throw error;
    }
  }

  public async getPostMetrics(platform: string, postId: string): Promise<any> {
    const config = this.platformConfigs.get(platform);
    if (!config || !config.enabled) {
      throw new Error(`Platform ${platform} is not connected or disabled`);
    }

    try {
      return await this.getPlatformPostMetrics(platform, postId, config);
    } catch (error) {
      this.logger.error(`Failed to get metrics for post ${postId} on ${platform}:`, error);
      throw error;
    }
  }

  public async getAccountMetrics(platform: string): Promise<any> {
    const config = this.platformConfigs.get(platform);
    if (!config || !config.enabled) {
      throw new Error(`Platform ${platform} is not connected or disabled`);
    }

    try {
      return await this.getPlatformAccountMetrics(platform, config);
    } catch (error) {
      this.logger.error(`Failed to get account metrics for ${platform}:`, error);
      throw error;
    }
  }

  public async getContentCalendar(): Promise<any[]> {
    return this.contentCalendar.map(post => ({
      id: post.id,
      content: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
      platforms: post.platforms,
      scheduledTime: post.scheduledTime,
      status: post.status,
      metadata: post.metadata
    }));
  }

  public async updateContentCalendar(posts: any[]): Promise<void> {
    // Validate and update the content calendar
    const validatedPosts = posts.map(post => this.validatePostData(post));
    this.contentCalendar = validatedPosts;
    await this.saveContentCalendar();
    
    this.logger.info(`Updated content calendar with ${posts.length} posts`);
  }

  // =====================================
  // ISchedulableAgent Implementation
  // =====================================

  public async schedule(cronExpression: string, taskData?: any): Promise<string> {
    const scheduleId = uuidv4();
    
    try {
      const task = cron.schedule(cronExpression, async () => {
        await this.executeScheduledTask(scheduleId, taskData);
      }, {
        scheduled: false,
        timezone: 'UTC'
      });

      this.cronJobs.set(scheduleId, task);
      task.start();
      
      this.logger.info(`Scheduled task ${scheduleId} with cron: ${cronExpression}`);
      return scheduleId;
    } catch (error) {
      this.logger.error(`Failed to schedule task:`, error);
      throw error;
    }
  }

  public async unschedule(scheduleId: string): Promise<void> {
    const task = this.cronJobs.get(scheduleId);
    if (task) {
      task.stop();
      this.cronJobs.delete(scheduleId);
      this.logger.info(`Unscheduled task ${scheduleId}`);
    }
  }

  public async getSchedules(): Promise<any[]> {
    return Array.from(this.cronJobs.entries()).map(([id, task]) => ({
      id,
      running: task.running
    }));
  }

  public async createRecurringTask(interval: number, taskData: any): Promise<string> {
    const taskId = uuidv4();
    
    const intervalId = setInterval(async () => {
      await this.executeScheduledTask(taskId, taskData);
    }, interval);

    // Store interval ID for cleanup
    (this as any).intervals = (this as any).intervals || new Map();
    (this as any).intervals.set(taskId, intervalId);

    return taskId;
  }

  public async cancelRecurringTask(taskId: string): Promise<void> {
    const intervals = (this as any).intervals;
    if (intervals && intervals.has(taskId)) {
      clearInterval(intervals.get(taskId));
      intervals.delete(taskId);
      this.logger.info(`Cancelled recurring task ${taskId}`);
    }
  }

  // =====================================
  // Task Handlers
  // =====================================

  private async handleSchedulePost(task: AgentTask): Promise<SocialPost> {
    const { content, platforms, scheduledTime, mediaUrls, hashtags, mentions, metadata } = task.payload;
    
    const post: SocialPost = {
      id: uuidv4(),
      content,
      platforms,
      scheduledTime: new Date(scheduledTime),
      status: 'scheduled',
      mediaUrls,
      hashtags,
      mentions,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        ...metadata
      }
    };

    await this.schedulePostInternal(post);
    return post;
  }

  private async handlePublishPost(task: AgentTask): Promise<any> {
    const { postId, content, platforms } = task.payload;
    
    if (postId) {
      // Publish existing scheduled post
      const post = this.scheduledPosts.get(postId);
      if (!post) {
        throw new Error(`Post ${postId} not found`);
      }
      return await this.publishPostNow(post);
    } else {
      // Publish new post immediately
      const post: SocialPost = {
        id: uuidv4(),
        content,
        platforms,
        scheduledTime: new Date(),
        status: 'draft',
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };
      return await this.publishPostNow(post);
    }
  }

  private async handleCancelPost(task: AgentTask): Promise<boolean> {
    const { postId } = task.payload;
    return await this.cancelScheduledPost(postId);
  }

  private async handleUpdatePost(task: AgentTask): Promise<SocialPost> {
    const { postId, updates } = task.payload;
    return await this.updateScheduledPost(postId, updates);
  }

  private async handleGetPostStatus(task: AgentTask): Promise<any> {
    const { postId } = task.payload;
    const post = this.scheduledPosts.get(postId);
    
    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }

    return {
      id: post.id,
      status: post.status,
      scheduledTime: post.scheduledTime,
      publishResults: post.publishResults,
      metadata: post.metadata
    };
  }

  private async handleGetAnalytics(task: AgentTask): Promise<any> {
    const { platform, postId, dateRange } = task.payload;
    
    if (postId) {
      return await this.getPostMetrics(platform, postId);
    } else {
      return await this.getAccountMetrics(platform);
    }
  }

  private async handleManageCalendar(task: AgentTask): Promise<any> {
    const { action, data } = task.payload;
    
    switch (action) {
      case 'get':
        return await this.getContentCalendar();
      case 'update':
        await this.updateContentCalendar(data);
        return { success: true };
      default:
        throw new Error(`Unsupported calendar action: ${action}`);
    }
  }

  private async handleSyncPlatforms(task: AgentTask): Promise<any> {
    const results = {};
    const platforms = await this.getConnectedPlatforms();
    
    for (const platform of platforms) {
      try {
        const syncResult = await this.syncPlatform(platform);
        results[platform] = { success: true, ...syncResult };
      } catch (error) {
        results[platform] = { success: false, error: error.message };
      }
    }
    
    return results;
  }

  // =====================================
  // Post Management
  // =====================================

  private async schedulePostInternal(post: SocialPost): Promise<void> {
    this.scheduledPosts.set(post.id, post);
    this.contentCalendar.push(post);
    
    // Schedule the actual publishing
    const delay = post.scheduledTime.getTime() - Date.now();
    if (delay > 0) {
      setTimeout(async () => {
        await this.publishPostNow(post);
      }, delay);
    } else {
      // Schedule for immediate publishing
      this.publishingQueue.push(post);
    }

    await this.saveScheduledPost(post);
    this.logger.info(`Post ${post.id} scheduled for ${post.scheduledTime}`);
  }

  private async publishPostNow(post: SocialPost): Promise<any> {
    post.status = 'publishing';
    post.publishResults = {};
    
    const results = await Promise.allSettled(
      post.platforms.map(platform => this.publishToSinglePlatform(post, platform))
    );

    let successCount = 0;
    let failureCount = 0;

    results.forEach((result, index) => {
      const platform = post.platforms[index];
      
      if (result.status === 'fulfilled') {
        post.publishResults![platform] = {
          success: true,
          postId: result.value.postId,
          publishedAt: new Date()
        };
        successCount++;
      } else {
        post.publishResults![platform] = {
          success: false,
          error: result.reason.message,
          publishedAt: new Date()
        };
        failureCount++;
      }
    });

    post.status = successCount > 0 ? 'published' : 'failed';
    post.metadata.updatedAt = new Date();
    
    await this.saveScheduledPost(post);
    
    this.logger.info(`Post ${post.id} published: ${successCount} success, ${failureCount} failures`);
    
    return {
      postId: post.id,
      status: post.status,
      results: post.publishResults,
      successCount,
      failureCount
    };
  }

  private async publishToSinglePlatform(post: SocialPost, platform: string): Promise<any> {
    const config = this.platformConfigs.get(platform);
    if (!config || !config.enabled) {
      throw new Error(`Platform ${platform} is not available`);
    }

    await this.checkRateLimit(platform);
    
    const content = this.formatContentForPlatform(post, platform);
    const result = await this.publishToPlatform(platform, content, config);
    
    this.updateRateLimit(platform);
    
    return result;
  }

  private async cancelScheduledPost(postId: string): Promise<boolean> {
    const post = this.scheduledPosts.get(postId);
    if (!post) {
      return false;
    }

    if (post.status === 'published') {
      throw new Error('Cannot cancel already published post');
    }

    post.status = 'cancelled';
    post.metadata.updatedAt = new Date();
    
    await this.saveScheduledPost(post);
    this.logger.info(`Post ${postId} cancelled`);
    
    return true;
  }

  private async updateScheduledPost(postId: string, updates: Partial<SocialPost>): Promise<SocialPost> {
    const post = this.scheduledPosts.get(postId);
    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }

    if (post.status === 'published') {
      throw new Error('Cannot update already published post');
    }

    // Apply updates
    Object.assign(post, updates);
    post.metadata.updatedAt = new Date();
    
    // If scheduling time changed, reschedule
    if (updates.scheduledTime) {
      await this.reschedulePost(post);
    }

    await this.saveScheduledPost(post);
    this.logger.info(`Post ${postId} updated`);
    
    return post;
  }

  // =====================================
  // Platform Integration
  // =====================================

  private async publishToPlatform(platform: string, content: any, config: PlatformConfig): Promise<any> {
    switch (platform) {
      case 'twitter':
        return await this.publishToTwitter(content, config);
      case 'facebook':
        return await this.publishToFacebook(content, config);
      case 'instagram':
        return await this.publishToInstagram(content, config);
      case 'linkedin':
        return await this.publishToLinkedIn(content, config);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private async publishToTwitter(content: any, config: PlatformConfig): Promise<any> {
    const twitterAPI = 'https://api.twitter.com/2/tweets';
    
    const data = {
      text: content.text
    };

    if (content.mediaUrls && content.mediaUrls.length > 0) {
      // Handle media uploads (simplified)
      data['media'] = { media_ids: [] }; // Would need to upload media first
    }

    const response = await axios.post(twitterAPI, data, {
      headers: {
        'Authorization': `Bearer ${config.credentials.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      success: true,
      postId: response.data.data.id,
      platformResponse: response.data
    };
  }

  private async publishToFacebook(content: any, config: PlatformConfig): Promise<any> {
    const facebookAPI = `https://graph.facebook.com/v18.0/${config.credentials.userId}/feed`;
    
    const data = {
      message: content.text,
      access_token: config.credentials.accessToken
    };

    const response = await axios.post(facebookAPI, data);

    return {
      success: true,
      postId: response.data.id,
      platformResponse: response.data
    };
  }

  private async publishToInstagram(content: any, config: PlatformConfig): Promise<any> {
    // Instagram requires media for posts
    if (!content.mediaUrls || content.mediaUrls.length === 0) {
      throw new Error('Instagram posts require media');
    }

    const instagramAPI = `https://graph.facebook.com/v18.0/${config.credentials.userId}/media`;
    
    // Create media container
    const mediaData = {
      image_url: content.mediaUrls[0],
      caption: content.text,
      access_token: config.credentials.accessToken
    };

    const mediaResponse = await axios.post(instagramAPI, mediaData);
    const creationId = mediaResponse.data.id;

    // Publish the container
    const publishAPI = `https://graph.facebook.com/v18.0/${config.credentials.userId}/media_publish`;
    const publishData = {
      creation_id: creationId,
      access_token: config.credentials.accessToken
    };

    const publishResponse = await axios.post(publishAPI, publishData);

    return {
      success: true,
      postId: publishResponse.data.id,
      platformResponse: publishResponse.data
    };
  }

  private async publishToLinkedIn(content: any, config: PlatformConfig): Promise<any> {
    const linkedinAPI = 'https://api.linkedin.com/v2/ugcPosts';
    
    const data = {
      author: `urn:li:person:${config.credentials.userId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content.text
          },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    const response = await axios.post(linkedinAPI, data, {
      headers: {
        'Authorization': `Bearer ${config.credentials.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    return {
      success: true,
      postId: response.headers['x-restli-id'],
      platformResponse: response.data
    };
  }

  // =====================================
  // Helper Methods
  // =====================================

  private formatContentForPlatform(post: SocialPost, platform: string): any {
    const config = this.platformConfigs.get(platform);
    if (!config) {
      throw new Error(`Platform ${platform} not configured`);
    }

    let text = post.content;
    
    // Truncate if necessary
    if (config.features.maxTextLength && text.length > config.features.maxTextLength) {
      text = text.substring(0, config.features.maxTextLength - 3) + '...';
    }

    // Add hashtags if supported
    if (config.features.supportsHashtags && post.hashtags && post.hashtags.length > 0) {
      text += '\n\n' + post.hashtags.map(tag => `#${tag}`).join(' ');
    }

    return {
      text,
      mediaUrls: post.mediaUrls,
      hashtags: post.hashtags,
      mentions: post.mentions,
      platformSpecific: post.platformData?.[platform] || {}
    };
  }

  private async checkRateLimit(platform: string): Promise<void> {
    const config = this.platformConfigs.get(platform);
    if (!config) return;

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Reset counters if needed
    if (config.rateLimits.lastReset < oneHourAgo) {
      config.rateLimits.currentCount = 0;
      config.rateLimits.lastReset = now;
    }

    // Check limits
    if (config.rateLimits.currentCount >= config.rateLimits.postsPerHour) {
      throw new Error(`Rate limit exceeded for ${platform}. Max ${config.rateLimits.postsPerHour} posts per hour.`);
    }
  }

  private updateRateLimit(platform: string): void {
    const config = this.platformConfigs.get(platform);
    if (config) {
      config.rateLimits.currentCount++;
    }
  }

  private async testPlatformConnection(platform: string, config: PlatformConfig): Promise<{ success: boolean; error?: string }> {
    try {
      // Test API connection for each platform
      switch (platform) {
        case 'twitter':
          await this.testTwitterConnection(config);
          break;
        case 'facebook':
          await this.testFacebookConnection(config);
          break;
        case 'instagram':
          await this.testInstagramConnection(config);
          break;
        case 'linkedin':
          await this.testLinkedInConnection(config);
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async testTwitterConnection(config: PlatformConfig): Promise<void> {
    const response = await axios.get('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${config.credentials.accessToken}`
      }
    });
    
    if (response.status !== 200) {
      throw new Error('Twitter API connection failed');
    }
  }

  private async testFacebookConnection(config: PlatformConfig): Promise<void> {
    const response = await axios.get(`https://graph.facebook.com/me?access_token=${config.credentials.accessToken}`);
    
    if (response.status !== 200) {
      throw new Error('Facebook API connection failed');
    }
  }

  private async testInstagramConnection(config: PlatformConfig): Promise<void> {
    const response = await axios.get(`https://graph.facebook.com/me?access_token=${config.credentials.accessToken}`);
    
    if (response.status !== 200) {
      throw new Error('Instagram API connection failed');
    }
  }

  private async testLinkedInConnection(config: PlatformConfig): Promise<void> {
    const response = await axios.get('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${config.credentials.accessToken}`
      }
    });
    
    if (response.status !== 200) {
      throw new Error('LinkedIn API connection failed');
    }
  }

  // =====================================
  // Initialization and State Management
  // =====================================

  private initializePlatformConfigs(): void {
    // Initialize default platform configurations
    const platforms = ['twitter', 'facebook', 'instagram', 'linkedin'];
    
    platforms.forEach(platform => {
      this.platformConfigs.set(platform, this.createDefaultPlatformConfig(platform));
    });
  }

  private createDefaultPlatformConfig(platform: string): PlatformConfig {
    const baseConfig = {
      name: platform,
      enabled: false,
      credentials: {},
      rateLimits: {
        postsPerHour: 10,
        postsPerDay: 100,
        lastReset: new Date(),
        currentCount: 0
      }
    };

    const platformFeatures = {
      twitter: {
        supportsImages: true,
        supportsVideos: true,
        supportsHashtags: true,
        supportsMentions: true,
        supportsScheduling: true,
        maxTextLength: 280,
        maxMediaCount: 4
      },
      facebook: {
        supportsImages: true,
        supportsVideos: true,
        supportsHashtags: true,
        supportsMentions: true,
        supportsScheduling: true,
        maxTextLength: 63206,
        maxMediaCount: 10
      },
      instagram: {
        supportsImages: true,
        supportsVideos: true,
        supportsHashtags: true,
        supportsMentions: true,
        supportsScheduling: true,
        maxTextLength: 2200,
        maxMediaCount: 10
      },
      linkedin: {
        supportsImages: true,
        supportsVideos: true,
        supportsHashtags: true,
        supportsMentions: true,
        supportsScheduling: true,
        maxTextLength: 3000,
        maxMediaCount: 9
      }
    };

    return {
      ...baseConfig,
      features: platformFeatures[platform] || platformFeatures.twitter
    };
  }

  private createPlatformConfig(platform: string, credentials: any): PlatformConfig {
    const defaultConfig = this.createDefaultPlatformConfig(platform);
    return {
      ...defaultConfig,
      enabled: true,
      credentials
    };
  }

  private setupCapabilities(): void {
    this.capabilities.push(
      {
        name: 'social-media-publishing',
        version: '1.0.0',
        description: 'Publish posts to social media platforms',
        inputSchema: {},
        outputSchema: {},
        requirements: ['Platform API access'],
        limitations: ['Rate limits apply']
      },
      {
        name: 'content-scheduling',
        version: '1.0.0',
        description: 'Schedule content for future publishing',
        inputSchema: {},
        outputSchema: {},
        requirements: ['Platform API access'],
        limitations: ['Platform scheduling limitations']
      },
      {
        name: 'social-analytics',
        version: '1.0.0',
        description: 'Track social media post performance',
        inputSchema: {},
        outputSchema: {},
        requirements: ['Platform API access'],
        limitations: ['Limited historical data']
      }
    );
  }

  // Placeholder methods for state management
  private async loadPlatformCredentials(): Promise<void> {
    // Load from database or configuration
  }

  private async loadSchedulingRules(): Promise<void> {
    // Load from database
  }

  private async loadScheduledPosts(): Promise<void> {
    // Load from database
  }

  private async savePlatformConfig(platform: string, config: PlatformConfig): Promise<void> {
    // Save to database
  }

  private async saveScheduledPost(post: SocialPost): Promise<void> {
    // Save to database
  }

  private async saveContentCalendar(): Promise<void> {
    // Save to database
  }

  private async saveState(): Promise<void> {
    // Save current state to database
  }

  private validatePostData(post: any): SocialPost {
    // Validate and convert post data
    return post as SocialPost;
  }

  private async executeScheduledTask(scheduleId: string, taskData: any): Promise<void> {
    // Execute scheduled task logic
  }

  private async reschedulePost(post: SocialPost): Promise<void> {
    // Reschedule post logic
  }

  private async testPlatformConnections(): Promise<void> {
    // Test all platform connections
  }

  private async resumeScheduledTasks(): Promise<void> {
    // Resume all scheduled tasks after restart
  }

  private stopAllCronJobs(): void {
    this.cronJobs.forEach(job => job.stop());
    this.cronJobs.clear();
  }

  private startQueueProcessor(): void {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    this.processPublishingQueue();
  }

  private async processPublishingQueue(): Promise<void> {
    while (this.isProcessingQueue) {
      if (this.publishingQueue.length > 0) {
        const post = this.publishingQueue.shift()!;
        try {
          await this.publishPostNow(post);
        } catch (error) {
          this.logger.error(`Failed to publish queued post ${post.id}:`, error);
        }
      }
      
      // Wait before checking queue again
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  private async syncPlatform(platform: string): Promise<any> {
    // Sync platform data
    return { synced: new Date() };
  }

  private async getPlatformPostMetrics(platform: string, postId: string, config: PlatformConfig): Promise<any> {
    // Get post metrics from platform
    return { views: 0, likes: 0, shares: 0, comments: 0 };
  }

  private async getPlatformAccountMetrics(platform: string, config: PlatformConfig): Promise<any> {
    // Get account metrics from platform
    return { followers: 0, following: 0, posts: 0 };
  }

  private async deletePlatformPost(platform: string, postId: string, config: PlatformConfig): Promise<void> {
    // Delete post from platform
  }

  protected async getCustomMetrics(): Promise<Record<string, number>> {
    return {
      'posts.scheduled': this.scheduledPosts.size,
      'posts.in_queue': this.publishingQueue.length,
      'platforms.connected': (await this.getConnectedPlatforms()).length,
      'cron_jobs.active': this.cronJobs.size
    };
  }
}