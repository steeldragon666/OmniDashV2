import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface SocialMediaAccount {
  id: string;
  platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'youtube';
  accountId: string;
  username: string;
  displayName: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpires?: Date;
  isActive: boolean;
  permissions: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostRequest {
  id: string;
  accountId: string;
  platform: string;
  content: {
    text?: string;
    title?: string;
    description?: string;
    media?: MediaAttachment[];
    hashtags?: string[];
    mentions?: string[];
  };
  options: {
    scheduledFor?: Date;
    publishImmediately?: boolean;
    isDraft?: boolean;
    isPrivate?: boolean;
    allowComments?: boolean;
    locationTag?: string;
    crossPostTo?: string[];
  };
  status: 'pending' | 'scheduled' | 'published' | 'failed' | 'cancelled';
  createdAt: Date;
  publishedAt?: Date;
  platformPostId?: string;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'gif' | 'audio';
  url: string;
  thumbnailUrl?: string;
  altText?: string;
  caption?: string;
  duration?: number;
  size: number;
  dimensions?: {
    width: number;
    height: number;
  };
  metadata: Record<string, any>;
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  url?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PlatformLimits {
  maxTextLength: number;
  maxMediaCount: number;
  supportedMediaTypes: string[];
  maxVideoSize: number;
  maxImageSize: number;
  maxHashtags: number;
  maxMentions: number;
  requiresMedia?: boolean;
}

export class SocialMediaPublisher extends EventEmitter {
  private accounts: Map<string, SocialMediaAccount> = new Map();
  private postQueue: Map<string, PostRequest> = new Map();
  private publishingQueue: PostRequest[] = [];
  private isProcessing: boolean = false;
  private platformLimits: Map<string, PlatformLimits> = new Map();
  private rateLimits: Map<string, { count: number; resetTime: Date }> = new Map();

  constructor() {
    super();
    this.initialize();
  }

  private initialize() {
    this.setupPlatformLimits();
    this.startPublishingLoop();
  }

  private setupPlatformLimits() {
    this.platformLimits.set('twitter', {
      maxTextLength: 280,
      maxMediaCount: 4,
      supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
      maxVideoSize: 512 * 1024 * 1024, // 512MB
      maxImageSize: 5 * 1024 * 1024, // 5MB
      maxHashtags: 2,
      maxMentions: 10
    });

    this.platformLimits.set('facebook', {
      maxTextLength: 2000,
      maxMediaCount: 10,
      supportedMediaTypes: ['image/jpeg', 'image/png', 'video/mp4', 'video/mov'],
      maxVideoSize: 4 * 1024 * 1024 * 1024, // 4GB
      maxImageSize: 4 * 1024 * 1024, // 4MB
      maxHashtags: 30,
      maxMentions: 50
    });

    this.platformLimits.set('instagram', {
      maxTextLength: 2200,
      maxMediaCount: 10,
      supportedMediaTypes: ['image/jpeg', 'image/png', 'video/mp4'],
      maxVideoSize: 100 * 1024 * 1024, // 100MB
      maxImageSize: 8 * 1024 * 1024, // 8MB
      maxHashtags: 30,
      maxMentions: 20,
      requiresMedia: true
    });

    this.platformLimits.set('linkedin', {
      maxTextLength: 3000,
      maxMediaCount: 9,
      supportedMediaTypes: ['image/jpeg', 'image/png', 'video/mp4', 'application/pdf'],
      maxVideoSize: 5 * 1024 * 1024 * 1024, // 5GB
      maxImageSize: 100 * 1024 * 1024, // 100MB
      maxHashtags: 20,
      maxMentions: 30
    });

    this.platformLimits.set('tiktok', {
      maxTextLength: 150,
      maxMediaCount: 1,
      supportedMediaTypes: ['video/mp4', 'video/mov'],
      maxVideoSize: 4 * 1024 * 1024 * 1024, // 4GB
      maxImageSize: 0,
      maxHashtags: 20,
      maxMentions: 20,
      requiresMedia: true
    });

    this.platformLimits.set('youtube', {
      maxTextLength: 5000,
      maxMediaCount: 1,
      supportedMediaTypes: ['video/mp4', 'video/mov', 'video/avi'],
      maxVideoSize: 256 * 1024 * 1024 * 1024, // 256GB
      maxImageSize: 2 * 1024 * 1024, // 2MB (thumbnails)
      maxHashtags: 15,
      maxMentions: 100,
      requiresMedia: true
    });
  }

  public addAccount(account: Omit<SocialMediaAccount, 'id' | 'createdAt' | 'updatedAt'>): string {
    const accountId = uuidv4();
    const fullAccount: SocialMediaAccount = {
      ...account,
      id: accountId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.accounts.set(accountId, fullAccount);
    this.emit('account:added', fullAccount);
    
    console.log(`📱 Social media account added: ${account.platform} - ${account.username}`);
    return accountId;
  }

  public async schedulePost(
    accountId: string,
    content: PostRequest['content'],
    options: PostRequest['options'] = {}
  ): Promise<string> {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    if (!account.isActive) {
      throw new Error(`Account is inactive: ${account.username}`);
    }

    // Validate content against platform limits
    const validation = this.validateContent(account.platform, content);
    if (!validation.valid) {
      throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
    }

    const postId = uuidv4();
    const postRequest: PostRequest = {
      id: postId,
      accountId,
      platform: account.platform,
      content,
      options,
      status: options.scheduledFor ? 'scheduled' : 'pending',
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 3
    };

    this.postQueue.set(postId, postRequest);

    if (options.publishImmediately || !options.scheduledFor) {
      this.publishingQueue.push(postRequest);
    }

    this.emit('post:scheduled', postRequest);
    console.log(`📅 Post scheduled: ${postId} for ${account.platform}`);

    return postId;
  }

  public async publishPost(postId: string): Promise<PublishResult> {
    const postRequest = this.postQueue.get(postId);
    if (!postRequest) {
      throw new Error(`Post not found: ${postId}`);
    }

    const account = this.accounts.get(postRequest.accountId);
    if (!account) {
      throw new Error(`Account not found: ${postRequest.accountId}`);
    }

    try {
      postRequest.status = 'pending';
      this.postQueue.set(postId, postRequest);
      this.emit('post:publishing', postRequest);

      // Check rate limits
      if (this.isRateLimited(account.platform)) {
        throw new Error(`Rate limit exceeded for ${account.platform}`);
      }

      // Publish to platform
      const result = await this.publishToPlatform(account, postRequest);

      if (result.success) {
        postRequest.status = 'published';
        postRequest.publishedAt = new Date();
        postRequest.platformPostId = result.platformPostId;
        
        this.updateRateLimit(account.platform);
        this.emit('post:published', { postRequest, result });
        
        console.log(`✅ Post published successfully: ${postId} to ${account.platform}`);
      } else {
        throw new Error(result.error || 'Unknown publishing error');
      }

      this.postQueue.set(postId, postRequest);
      return result;

    } catch (error) {
      postRequest.status = 'failed';
      postRequest.error = (error as Error).message;
      postRequest.retryCount++;
      
      this.postQueue.set(postId, postRequest);
      this.emit('post:failed', { postRequest, error });
      
      console.error(`❌ Post publishing failed: ${postId}`, error);
      
      // Schedule retry if within limits
      if (postRequest.retryCount < postRequest.maxRetries) {
        setTimeout(() => {
          this.retryPost(postId);
        }, this.calculateRetryDelay(postRequest.retryCount));
      }

      throw error;
    }
  }

  private async publishToPlatform(
    account: SocialMediaAccount,
    postRequest: PostRequest
  ): Promise<PublishResult> {
    // This is where you'd integrate with actual platform APIs
    // For now, we'll simulate the API calls
    
    switch (account.platform) {
      case 'twitter':
        return this.publishToTwitter(account, postRequest);
      case 'facebook':
        return this.publishToFacebook(account, postRequest);
      case 'instagram':
        return this.publishToInstagram(account, postRequest);
      case 'linkedin':
        return this.publishToLinkedIn(account, postRequest);
      case 'tiktok':
        return this.publishToTikTok(account, postRequest);
      case 'youtube':
        return this.publishToYouTube(account, postRequest);
      default:
        throw new Error(`Unsupported platform: ${account.platform}`);
    }
  }

  private async publishToTwitter(
    account: SocialMediaAccount,
    postRequest: PostRequest
  ): Promise<PublishResult> {
    // Simulate Twitter API call
    await this.delay(1000);
    
    const success = Math.random() > 0.1; // 90% success rate
    
    if (success) {
      return {
        success: true,
        platformPostId: `twitter_${Date.now()}`,
        url: `https://twitter.com/${account.username}/status/${Date.now()}`,
        metadata: {
          retweets: 0,
          likes: 0,
          replies: 0
        }
      };
    } else {
      return {
        success: false,
        error: 'Twitter API error: Rate limit exceeded'
      };
    }
  }

  private async publishToFacebook(
    account: SocialMediaAccount,
    postRequest: PostRequest
  ): Promise<PublishResult> {
    await this.delay(1500);
    
    return {
      success: true,
      platformPostId: `facebook_${Date.now()}`,
      url: `https://facebook.com/${account.accountId}/posts/${Date.now()}`,
      metadata: {
        reactions: 0,
        comments: 0,
        shares: 0
      }
    };
  }

  private async publishToInstagram(
    account: SocialMediaAccount,
    postRequest: PostRequest
  ): Promise<PublishResult> {
    await this.delay(2000);
    
    if (!postRequest.content.media || postRequest.content.media.length === 0) {
      return {
        success: false,
        error: 'Instagram requires at least one media attachment'
      };
    }
    
    return {
      success: true,
      platformPostId: `instagram_${Date.now()}`,
      url: `https://instagram.com/p/${Date.now()}`,
      metadata: {
        likes: 0,
        comments: 0
      }
    };
  }

  private async publishToLinkedIn(
    account: SocialMediaAccount,
    postRequest: PostRequest
  ): Promise<PublishResult> {
    await this.delay(1200);
    
    return {
      success: true,
      platformPostId: `linkedin_${Date.now()}`,
      url: `https://linkedin.com/posts/${account.accountId}_${Date.now()}`,
      metadata: {
        reactions: 0,
        comments: 0,
        reposts: 0
      }
    };
  }

  private async publishToTikTok(
    account: SocialMediaAccount,
    postRequest: PostRequest
  ): Promise<PublishResult> {
    await this.delay(3000);
    
    if (!postRequest.content.media || !postRequest.content.media.find(m => m.type === 'video')) {
      return {
        success: false,
        error: 'TikTok requires a video attachment'
      };
    }
    
    return {
      success: true,
      platformPostId: `tiktok_${Date.now()}`,
      url: `https://tiktok.com/@${account.username}/video/${Date.now()}`,
      metadata: {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0
      }
    };
  }

  private async publishToYouTube(
    account: SocialMediaAccount,
    postRequest: PostRequest
  ): Promise<PublishResult> {
    await this.delay(5000); // YouTube uploads take longer
    
    return {
      success: true,
      platformPostId: `youtube_${Date.now()}`,
      url: `https://youtube.com/watch?v=${Date.now()}`,
      metadata: {
        views: 0,
        likes: 0,
        dislikes: 0,
        comments: 0
      }
    };
  }

  private validateContent(platform: string, content: PostRequest['content']): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const limits = this.platformLimits.get(platform);
    
    if (!limits) {
      errors.push(`Unknown platform: ${platform}`);
      return { valid: false, errors };
    }

    // Check text length
    if (content.text && content.text.length > limits.maxTextLength) {
      errors.push(`Text exceeds maximum length of ${limits.maxTextLength} characters`);
    }

    // Check media count
    if (content.media && content.media.length > limits.maxMediaCount) {
      errors.push(`Media count exceeds maximum of ${limits.maxMediaCount}`);
    }

    // Check if media is required
    if (limits.requiresMedia && (!content.media || content.media.length === 0)) {
      errors.push(`${platform} requires at least one media attachment`);
    }

    // Check hashtag count
    if (content.hashtags && content.hashtags.length > limits.maxHashtags) {
      errors.push(`Hashtag count exceeds maximum of ${limits.maxHashtags}`);
    }

    // Check mention count
    if (content.mentions && content.mentions.length > limits.maxMentions) {
      errors.push(`Mention count exceeds maximum of ${limits.maxMentions}`);
    }

    // Validate media types and sizes
    if (content.media) {
      for (const media of content.media) {
        if (!limits.supportedMediaTypes.includes(media.type)) {
          errors.push(`Unsupported media type: ${media.type}`);
        }

        if (media.type.startsWith('video/') && media.size > limits.maxVideoSize) {
          errors.push(`Video size exceeds maximum of ${this.formatBytes(limits.maxVideoSize)}`);
        }

        if (media.type.startsWith('image/') && media.size > limits.maxImageSize) {
          errors.push(`Image size exceeds maximum of ${this.formatBytes(limits.maxImageSize)}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private async startPublishingLoop() {
    this.isProcessing = true;

    while (this.isProcessing) {
      // Process scheduled posts
      await this.processScheduledPosts();
      
      // Process publishing queue
      if (this.publishingQueue.length > 0) {
        const postRequest = this.publishingQueue.shift();
        if (postRequest) {
          try {
            await this.publishPost(postRequest.id);
          } catch (error) {
            // Error already handled in publishPost
          }
        }
      }

      await this.delay(10000); // Check every 10 seconds
    }
  }

  private async processScheduledPosts() {
    const now = new Date();
    const scheduledPosts = Array.from(this.postQueue.values())
      .filter(post => 
        post.status === 'scheduled' && 
        post.options.scheduledFor && 
        post.options.scheduledFor <= now
      );

    for (const post of scheduledPosts) {
      this.publishingQueue.push(post);
    }
  }

  private isRateLimited(platform: string): boolean {
    const rateLimit = this.rateLimits.get(platform);
    if (!rateLimit) return false;

    if (new Date() > rateLimit.resetTime) {
      this.rateLimits.delete(platform);
      return false;
    }

    // Platform-specific rate limits (simplified)
    const limits: Record<string, number> = {
      twitter: 50,      // 50 posts per hour
      facebook: 100,    // 100 posts per hour
      instagram: 25,    // 25 posts per hour
      linkedin: 30,     // 30 posts per hour
      tiktok: 10,       // 10 posts per hour
      youtube: 5        // 5 videos per hour
    };

    return rateLimit.count >= (limits[platform] || 50);
  }

  private updateRateLimit(platform: string) {
    const existing = this.rateLimits.get(platform);
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 3600000);

    if (existing && now < existing.resetTime) {
      existing.count++;
    } else {
      this.rateLimits.set(platform, {
        count: 1,
        resetTime: oneHourLater
      });
    }
  }

  private async retryPost(postId: string) {
    const postRequest = this.postQueue.get(postId);
    if (!postRequest || postRequest.retryCount >= postRequest.maxRetries) {
      return;
    }

    console.log(`🔄 Retrying post: ${postId} (attempt ${postRequest.retryCount + 1})`);
    this.publishingQueue.push(postRequest);
  }

  private calculateRetryDelay(retryCount: number): number {
    // Exponential backoff: 1min, 2min, 4min
    return Math.min(60000 * Math.pow(2, retryCount), 240000);
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public query methods
  public getAccount(accountId: string): SocialMediaAccount | undefined {
    return this.accounts.get(accountId);
  }

  public getAccounts(): SocialMediaAccount[] {
    return Array.from(this.accounts.values());
  }

  public getActiveAccounts(): SocialMediaAccount[] {
    return this.getAccounts().filter(account => account.isActive);
  }

  public getAccountsByPlatform(platform: string): SocialMediaAccount[] {
    return this.getAccounts().filter(account => account.platform === platform);
  }

  public getPost(postId: string): PostRequest | undefined {
    return this.postQueue.get(postId);
  }

  public getPostsByAccount(accountId: string): PostRequest[] {
    return Array.from(this.postQueue.values())
      .filter(post => post.accountId === accountId);
  }

  public getPostsByStatus(status: PostRequest['status']): PostRequest[] {
    return Array.from(this.postQueue.values())
      .filter(post => post.status === status);
  }

  public getScheduledPosts(): PostRequest[] {
    return this.getPostsByStatus('scheduled');
  }

  public getPlatformLimits(platform: string): PlatformLimits | undefined {
    return this.platformLimits.get(platform);
  }

  public cancelPost(postId: string): boolean {
    const post = this.postQueue.get(postId);
    if (!post || post.status === 'published') return false;

    post.status = 'cancelled';
    this.postQueue.set(postId, post);

    // Remove from publishing queue
    const queueIndex = this.publishingQueue.findIndex(p => p.id === postId);
    if (queueIndex !== -1) {
      this.publishingQueue.splice(queueIndex, 1);
    }

    this.emit('post:cancelled', post);
    return true;
  }

  public updateAccount(accountId: string, updates: Partial<SocialMediaAccount>): boolean {
    const account = this.accounts.get(accountId);
    if (!account) return false;

    const updatedAccount = { ...account, ...updates, updatedAt: new Date() };
    this.accounts.set(accountId, updatedAccount);

    this.emit('account:updated', updatedAccount);
    return true;
  }

  public removeAccount(accountId: string): boolean {
    const account = this.accounts.get(accountId);
    if (!account) return false;

    // Cancel all pending posts for this account
    const accountPosts = this.getPostsByAccount(accountId);
    accountPosts.forEach(post => {
      if (post.status !== 'published') {
        this.cancelPost(post.id);
      }
    });

    this.accounts.delete(accountId);
    this.emit('account:removed', account);
    return true;
  }

  public stop(): void {
    this.isProcessing = false;
  }
}

export const socialMediaPublisher = new SocialMediaPublisher();