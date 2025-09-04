/**
 * Content Creator Agent - AI-powered content generation
 * Handles creation of social media posts, articles, and marketing copy
 */

import { BaseAgent } from '../base/BaseAgent';
import {
  AgentTask,
  AgentResult,
  AgentContext,
  AgentMetadata,
  AIProvider
} from '../base/AgentInterface';

interface ContentCreationTask {
  type: 'social-post' | 'article' | 'marketing-copy' | 'blog-post' | 'email-campaign';
  topic: string;
  audience: string;
  tone: 'professional' | 'casual' | 'friendly' | 'authoritative' | 'humorous';
  length: 'short' | 'medium' | 'long';
  platform?: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'tiktok';
  keywords?: string[];
  references?: string[];
  brandGuidelines?: {
    voice: string;
    style: string;
    restrictions: string[];
  };
  includeHashtags?: boolean;
  includeCTA?: boolean;
  language?: string;
}

interface GeneratedContent {
  content: string;
  hashtags?: string[];
  metadata: {
    wordCount: number;
    characterCount: number;
    estimatedReadTime?: number;
    sentiment?: 'positive' | 'neutral' | 'negative';
    keywords: string[];
  };
  alternatives?: string[];
}

export class ContentCreatorAgent extends BaseAgent {
  private aiProvider: AIProvider;
  private contentTemplates: Map<string, string> = new Map();
  private brandGuidelines: Map<string, any> = new Map();

  constructor(aiProvider: AIProvider) {
    const metadata: AgentMetadata = {
      id: 'content-creator',
      name: 'Content Creator Agent',
      version: '1.0.0',
      description: 'AI-powered content creation for social media, marketing, and communications',
      category: 'content',
      capabilities: [
        {
          name: 'generate-social-post',
          description: 'Create engaging social media posts',
          inputSchema: {
            type: 'object',
            properties: {
              topic: { type: 'string' },
              platform: { type: 'string', enum: ['twitter', 'facebook', 'instagram', 'linkedin', 'tiktok'] },
              tone: { type: 'string' },
              includeHashtags: { type: 'boolean' }
            },
            required: ['topic', 'platform']
          }
        },
        {
          name: 'generate-article',
          description: 'Create long-form articles and blog posts',
          inputSchema: {
            type: 'object',
            properties: {
              topic: { type: 'string' },
              length: { type: 'string', enum: ['short', 'medium', 'long'] },
              keywords: { type: 'array', items: { type: 'string' } }
            },
            required: ['topic']
          }
        },
        {
          name: 'generate-marketing-copy',
          description: 'Create marketing and advertising copy',
          inputSchema: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              audience: { type: 'string' },
              includeCTA: { type: 'boolean' }
            },
            required: ['type', 'audience']
          }
        }
      ],
      tags: ['content', 'ai', 'social-media', 'marketing']
    };

    super(metadata);
    this.aiProvider = aiProvider;
    this.initializeTemplates();
  }

  protected async onInitialize(): Promise<void> {
    this.log('info', 'Initializing Content Creator Agent');
    
    // Load brand guidelines from database
    await this.loadBrandGuidelines();
    
    // Validate AI provider connection
    await this.validateAIProvider();
  }

  protected async executeTask(task: AgentTask, context?: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    
    try {
      this.log('info', `Executing content creation task: ${task.type}`, { taskId: task.id });
      this.updateProgress(10);

      const taskData = task.data as ContentCreationTask;
      let result: GeneratedContent;

      switch (task.type) {
        case 'generate-social-post':
          result = await this.generateSocialPost(taskData, context);
          break;
        case 'generate-article':
          result = await this.generateArticle(taskData, context);
          break;
        case 'generate-marketing-copy':
          result = await this.generateMarketingCopy(taskData, context);
          break;
        default:
          throw new Error(`Unsupported content creation task type: ${task.type}`);
      }

      this.updateProgress(90);

      // Store generated content for future reference
      if (context?.organizationId) {
        await this.storeGeneratedContent(result, taskData, context);
      }

      this.updateProgress(100);

      return {
        success: true,
        data: result,
        metadata: {
          executionTime: Date.now() - startTime,
          contentType: taskData.type,
          wordCount: result.metadata.wordCount,
          characterCount: result.metadata.characterCount
        }
      };

    } catch (error) {
      this.log('error', 'Content creation failed', { error: error.message, taskId: task.id });
      throw error;
    }
  }

  protected validateTask(task: AgentTask): boolean {
    if (!task.data) return false;

    const taskData = task.data as ContentCreationTask;
    
    // Validate required fields
    if (!taskData.topic || typeof taskData.topic !== 'string' || taskData.topic.trim() === '') {
      return false;
    }

    if (!taskData.audience || typeof taskData.audience !== 'string') {
      return false;
    }

    // Validate content type specific requirements
    switch (task.type) {
      case 'generate-social-post':
        return !!taskData.platform;
      case 'generate-article':
        return !!taskData.length;
      case 'generate-marketing-copy':
        return !!taskData.type;
      default:
        return false;
    }
  }

  protected async getAgentSpecificMetrics(): Promise<Record<string, any>> {
    return {
      contentGenerated: this.executionCount,
      averageContentLength: await this.calculateAverageContentLength(),
      topPlatforms: await this.getTopPlatforms(),
      topTopics: await this.getTopTopics(),
      aiProviderStatus: await this.checkAIProviderStatus()
    };
  }

  private async generateSocialPost(taskData: ContentCreationTask, context?: AgentContext): Promise<GeneratedContent> {
    this.log('info', 'Generating social media post', { platform: taskData.platform, topic: taskData.topic });
    this.updateProgress(30);

    const prompt = this.buildSocialPostPrompt(taskData);
    const content = await this.aiProvider.generate(prompt, {
      temperature: 0.8,
      maxTokens: this.getMaxTokensForPlatform(taskData.platform!),
      model: this.config.ai?.model || 'gpt-4'
    });

    this.updateProgress(70);

    const processedContent = await this.processGeneratedContent(content, taskData);
    
    if (taskData.includeHashtags) {
      processedContent.hashtags = await this.generateHashtags(taskData.topic, taskData.platform);
    }

    return processedContent;
  }

  private async generateArticle(taskData: ContentCreationTask, context?: AgentContext): Promise<GeneratedContent> {
    this.log('info', 'Generating article', { topic: taskData.topic, length: taskData.length });
    this.updateProgress(30);

    const prompt = this.buildArticlePrompt(taskData);
    const content = await this.aiProvider.generate(prompt, {
      temperature: 0.7,
      maxTokens: this.getMaxTokensForLength(taskData.length),
      model: this.config.ai?.model || 'gpt-4'
    });

    this.updateProgress(70);

    const processedContent = await this.processGeneratedContent(content, taskData);
    processedContent.metadata.estimatedReadTime = this.calculateReadTime(processedContent.content);

    return processedContent;
  }

  private async generateMarketingCopy(taskData: ContentCreationTask, context?: AgentContext): Promise<GeneratedContent> {
    this.log('info', 'Generating marketing copy', { type: taskData.type, audience: taskData.audience });
    this.updateProgress(30);

    const prompt = this.buildMarketingCopyPrompt(taskData);
    const content = await this.aiProvider.generate(prompt, {
      temperature: 0.8,
      maxTokens: 1000,
      model: this.config.ai?.model || 'gpt-4'
    });

    this.updateProgress(70);

    return await this.processGeneratedContent(content, taskData);
  }

  private buildSocialPostPrompt(taskData: ContentCreationTask): string {
    const brandGuidelines = this.brandGuidelines.get(taskData.brandGuidelines?.voice || 'default');
    const template = this.contentTemplates.get(`social-${taskData.platform}`) || this.contentTemplates.get('social-default');

    return `${template}

Topic: ${taskData.topic}
Platform: ${taskData.platform}
Audience: ${taskData.audience}
Tone: ${taskData.tone}
Length: ${taskData.length}

${brandGuidelines ? `Brand Guidelines: ${JSON.stringify(brandGuidelines)}` : ''}
${taskData.keywords ? `Keywords to include: ${taskData.keywords.join(', ')}` : ''}
${taskData.references ? `References: ${taskData.references.join(', ')}` : ''}

Create an engaging ${taskData.platform} post that:
- Resonates with the ${taskData.audience} audience
- Uses a ${taskData.tone} tone
- Stays within platform character limits
- ${taskData.includeHashtags ? 'Includes relevant hashtags' : 'Does not include hashtags'}
- ${taskData.includeCTA ? 'Includes a compelling call-to-action' : ''}
- Follows best practices for ${taskData.platform}

Generate only the post content without any additional commentary.`;
  }

  private buildArticlePrompt(taskData: ContentCreationTask): string {
    const template = this.contentTemplates.get('article') || this.contentTemplates.get('default');

    return `${template}

Topic: ${taskData.topic}
Target Audience: ${taskData.audience}
Tone: ${taskData.tone}
Length: ${taskData.length}
Language: ${taskData.language || 'English'}

${taskData.keywords ? `SEO Keywords: ${taskData.keywords.join(', ')}` : ''}
${taskData.references ? `References to include: ${taskData.references.join(', ')}` : ''}

Create a well-structured article that:
- Provides valuable information on ${taskData.topic}
- Is written for ${taskData.audience}
- Uses a ${taskData.tone} tone
- Is ${taskData.length} in length
- Includes proper headings and structure
- ${taskData.keywords ? `Naturally incorporates the keywords: ${taskData.keywords.join(', ')}` : ''}
- Is engaging and informative

Generate only the article content with proper formatting.`;
  }

  private buildMarketingCopyPrompt(taskData: ContentCreationTask): string {
    const template = this.contentTemplates.get('marketing') || this.contentTemplates.get('default');

    return `${template}

Content Type: ${taskData.type}
Target Audience: ${taskData.audience}
Tone: ${taskData.tone}

Create compelling marketing copy that:
- Speaks directly to ${taskData.audience}
- Uses a ${taskData.tone} tone
- Highlights key benefits and value propositions
- ${taskData.includeCTA ? 'Includes a strong call-to-action' : ''}
- Is persuasive and engaging
- Follows marketing best practices

Generate only the marketing copy without additional commentary.`;
  }

  private async processGeneratedContent(content: string, taskData: ContentCreationTask): Promise<GeneratedContent> {
    const processedContent: GeneratedContent = {
      content: content.trim(),
      metadata: {
        wordCount: this.countWords(content),
        characterCount: content.length,
        keywords: taskData.keywords || [],
        sentiment: await this.analyzeSentiment(content)
      }
    };

    // Generate alternatives if requested
    if (this.config.custom?.generateAlternatives) {
      processedContent.alternatives = await this.generateAlternatives(content, taskData);
    }

    return processedContent;
  }

  private async generateHashtags(topic: string, platform?: string): Promise<string[]> {
    const prompt = `Generate 5-8 relevant hashtags for a ${platform || 'social media'} post about "${topic}". 
    Return only the hashtags, one per line, without the # symbol.`;
    
    const response = await this.aiProvider.generate(prompt, {
      temperature: 0.6,
      maxTokens: 200
    });

    return response
      .split('\n')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .slice(0, 8);
  }

  private async generateAlternatives(content: string, taskData: ContentCreationTask): Promise<string[]> {
    const prompt = `Create 2-3 alternative versions of this content while maintaining the same message and tone:

Original: ${content}

Generate alternatives that are different in structure and wording but convey the same message.`;

    const response = await this.aiProvider.generate(prompt, {
      temperature: 0.8,
      maxTokens: content.length * 2
    });

    return response
      .split('\n\n')
      .map(alt => alt.trim())
      .filter(alt => alt.length > 0)
      .slice(0, 3);
  }

  private async analyzeSentiment(content: string): Promise<'positive' | 'neutral' | 'negative'> {
    try {
      const result = await this.aiProvider.moderate(content);
      // Simple sentiment analysis - you might want to use a dedicated service
      const positiveWords = ['great', 'amazing', 'excellent', 'wonderful', 'fantastic', 'love', 'perfect'];
      const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointing'];
      
      const words = content.toLowerCase().split(/\s+/);
      const positiveCount = words.filter(word => positiveWords.includes(word)).length;
      const negativeCount = words.filter(word => negativeWords.includes(word)).length;
      
      if (positiveCount > negativeCount) return 'positive';
      if (negativeCount > positiveCount) return 'negative';
      return 'neutral';
    } catch {
      return 'neutral';
    }
  }

  private getMaxTokensForPlatform(platform: string): number {
    const limits = {
      twitter: 300,
      facebook: 800,
      instagram: 600,
      linkedin: 1000,
      tiktok: 400
    };
    
    return limits[platform as keyof typeof limits] || 500;
  }

  private getMaxTokensForLength(length: string): number {
    const limits = {
      short: 1000,
      medium: 2500,
      long: 4000
    };
    
    return limits[length as keyof typeof limits] || 2000;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private calculateReadTime(content: string): number {
    const wordsPerMinute = 200; // Average reading speed
    const wordCount = this.countWords(content);
    return Math.ceil(wordCount / wordsPerMinute);
  }

  private initializeTemplates(): void {
    this.contentTemplates.set('social-twitter', `Create a Twitter/X post that is engaging, concise, and optimized for Twitter's format.`);
    this.contentTemplates.set('social-facebook', `Create a Facebook post that encourages engagement and community interaction.`);
    this.contentTemplates.set('social-instagram', `Create an Instagram post with a visual-first approach and engaging caption.`);
    this.contentTemplates.set('social-linkedin', `Create a professional LinkedIn post that provides value to a business audience.`);
    this.contentTemplates.set('article', `Write a comprehensive, well-researched article with clear structure and valuable insights.`);
    this.contentTemplates.set('marketing', `Create persuasive marketing copy that drives action and converts readers.`);
    this.contentTemplates.set('default', `Create high-quality content that engages the target audience.`);
  }

  private async loadBrandGuidelines(): Promise<void> {
    // This would typically load from a database
    this.brandGuidelines.set('default', {
      voice: 'professional yet approachable',
      style: 'clear and concise',
      restrictions: ['avoid jargon', 'keep sentences short', 'use active voice']
    });
  }

  private async validateAIProvider(): Promise<void> {
    try {
      await this.aiProvider.generate('Test', { maxTokens: 10 });
      this.log('info', 'AI provider connection validated');
    } catch (error) {
      this.log('error', 'AI provider validation failed', { error: error.message });
      throw new Error('AI provider is not available');
    }
  }

  private async storeGeneratedContent(content: GeneratedContent, taskData: ContentCreationTask, context: AgentContext): Promise<void> {
    // Store in database for future reference and analytics
    // Implementation depends on your database setup
    this.log('info', 'Storing generated content', { 
      type: taskData.type, 
      wordCount: content.metadata.wordCount,
      organizationId: context.organizationId 
    });
  }

  private async calculateAverageContentLength(): Promise<number> {
    // Calculate from stored metrics
    return 250; // Placeholder
  }

  private async getTopPlatforms(): Promise<string[]> {
    // Get most used platforms from metrics
    return ['instagram', 'twitter', 'linkedin']; // Placeholder
  }

  private async getTopTopics(): Promise<string[]> {
    // Get most common topics from metrics
    return ['marketing', 'technology', 'business']; // Placeholder
  }

  private async checkAIProviderStatus(): Promise<string> {
    try {
      await this.validateAIProvider();
      return 'healthy';
    } catch {
      return 'unhealthy';
    }
  }
}