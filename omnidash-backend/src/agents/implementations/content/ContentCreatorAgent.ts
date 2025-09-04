/**
 * Content Creator Agent
 * Handles AI-powered content generation for various platforms and purposes
 */

import { BaseAgent } from '../../core/BaseAgent';
import {
  IContentAgent,
  AgentConfig,
  AgentTask,
  AgentCapability,
  AIProviderConfig,
  AIRequest,
  AIResponse,
  TaskContext,
  AgentPriority
} from '../../types/AgentTypes';
import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';

export interface ContentGenerationRequest {
  type: 'text' | 'image' | 'video' | 'social-post' | 'blog-article' | 'email' | 'ad-copy';
  prompt: string;
  context?: string;
  targetAudience?: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'formal' | 'humorous' | 'persuasive';
  length?: 'short' | 'medium' | 'long' | number;
  platform?: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'youtube';
  keywords?: string[];
  style?: string;
  format?: string;
  constraints?: {
    maxWords?: number;
    minWords?: number;
    maxCharacters?: number;
    mustInclude?: string[];
    mustAvoid?: string[];
  };
  seoOptimization?: {
    targetKeywords: string[];
    metaDescription?: boolean;
    headings?: boolean;
  };
  brandGuidelines?: {
    brandName: string;
    brandVoice: string;
    brandValues: string[];
    colorScheme?: string[];
    logoUrl?: string;
  };
}

export interface ContentGenerationResult {
  content: string;
  metadata: {
    type: string;
    wordCount: number;
    characterCount: number;
    readingTime: number;
    keywords: string[];
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
  };
  variations?: string[];
  suggestions?: string[];
  seoAnalysis?: {
    keywordDensity: Record<string, number>;
    readabilityScore: number;
    metaDescription?: string;
    suggestedTags: string[];
  };
}

/**
 * AI-powered content creation agent
 */
export class ContentCreatorAgent extends BaseAgent implements IContentAgent {
  private openaiClient: OpenAI | null = null;
  private anthropicClient: Anthropic | null = null;
  private currentProvider: 'openai' | 'anthropic' | 'google' = 'openai';
  private providerConfigs: Map<string, AIProviderConfig> = new Map();
  private contentTemplates: Map<string, string> = new Map();
  private brandProfiles: Map<string, any> = new Map();

  constructor(config: AgentConfig) {
    super(config);
    this.initializeProviders();
    this.loadContentTemplates();
    this.setupCapabilities();
  }

  // =====================================
  // Agent Lifecycle
  // =====================================

  protected async onInitialize(): Promise<void> {
    await this.validateProviderConfigs();
    await this.loadBrandProfiles();
    this.logger.info('ContentCreatorAgent initialized successfully');
  }

  protected async onStart(): Promise<void> {
    await this.testProviderConnections();
    this.logger.info('ContentCreatorAgent started and ready');
  }

  // =====================================
  // Task Processing
  // =====================================

  public canHandleTask(task: AgentTask): boolean {
    const supportedTypes = [
      'generate-content',
      'analyze-content',
      'optimize-content',
      'generate-variations',
      'extract-keywords',
      'sentiment-analysis'
    ];
    return supportedTypes.includes(task.type);
  }

  protected async executeTask(task: AgentTask): Promise<any> {
    const startTime = Date.now();
    
    try {
      let result: any;

      switch (task.type) {
        case 'generate-content':
          result = await this.handleContentGeneration(task);
          break;
        case 'analyze-content':
          result = await this.handleContentAnalysis(task);
          break;
        case 'optimize-content':
          result = await this.handleContentOptimization(task);
          break;
        case 'generate-variations':
          result = await this.handleVariationGeneration(task);
          break;
        case 'extract-keywords':
          result = await this.handleKeywordExtraction(task);
          break;
        case 'sentiment-analysis':
          result = await this.handleSentimentAnalysis(task);
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
      case 'generate-content':
        return !!(task.payload.prompt && task.payload.type);
      case 'analyze-content':
      case 'optimize-content':
      case 'generate-variations':
      case 'extract-keywords':
      case 'sentiment-analysis':
        return !!task.payload.content;
      default:
        return false;
    }
  }

  // =====================================
  // IContentAgent Implementation
  // =====================================

  public async generateText(prompt: string, options?: any): Promise<string> {
    const request: ContentGenerationRequest = {
      type: 'text',
      prompt,
      ...options
    };

    const result = await this.generateContent(request);
    return result.content;
  }

  public async generateImage(prompt: string, options?: any): Promise<string> {
    // For now, return a placeholder - would integrate with image generation APIs
    this.logger.info('Image generation requested', { prompt, options });
    return 'https://placeholder.image.url'; // Placeholder
  }

  public async generateVideo(prompt: string, options?: any): Promise<string> {
    // For now, return a placeholder - would integrate with video generation APIs
    this.logger.info('Video generation requested', { prompt, options });
    return 'https://placeholder.video.url'; // Placeholder
  }

  public async analyzeText(text: string): Promise<any> {
    const analysisPrompt = `Please analyze the following text and provide:
1. Sentiment (positive/negative/neutral)
2. Key themes and topics
3. Readability score estimate
4. Target audience
5. Tone and style
6. Potential improvements

Text to analyze:
${text}

Please provide your analysis in JSON format.`;

    const response = await this.callAIProvider({
      prompt: analysisPrompt,
      maxTokens: 1000,
      temperature: 0.1
    });

    try {
      return JSON.parse(response.content);
    } catch {
      // Fallback if JSON parsing fails
      return {
        sentiment: this.extractSentiment(text),
        analysis: response.content,
        wordCount: text.split(' ').length,
        characterCount: text.length
      };
    }
  }

  public async analyzeSentiment(text: string): Promise<any> {
    const sentimentPrompt = `Analyze the sentiment of the following text and respond with a JSON object containing:
- sentiment: "positive", "negative", or "neutral"
- confidence: number between 0 and 1
- reasoning: brief explanation

Text: ${text}`;

    const response = await this.callAIProvider({
      prompt: sentimentPrompt,
      maxTokens: 200,
      temperature: 0.1
    });

    try {
      return JSON.parse(response.content);
    } catch {
      return {
        sentiment: this.extractSentiment(text),
        confidence: 0.5,
        reasoning: 'Fallback analysis'
      };
    }
  }

  public async extractKeywords(text: string): Promise<string[]> {
    const keywordPrompt = `Extract the most important keywords and phrases from the following text. 
Return only a JSON array of keywords, ordered by importance.

Text: ${text}`;

    const response = await this.callAIProvider({
      prompt: keywordPrompt,
      maxTokens: 300,
      temperature: 0.1
    });

    try {
      return JSON.parse(response.content);
    } catch {
      // Fallback keyword extraction
      return this.extractKeywordsFallback(text);
    }
  }

  public async optimizeForSEO(content: string, keywords: string[]): Promise<string> {
    const seoPrompt = `Optimize the following content for SEO while maintaining readability and natural flow. 
Target keywords: ${keywords.join(', ')}

Guidelines:
- Include target keywords naturally
- Improve readability
- Add relevant subheadings if appropriate
- Ensure good keyword density (1-2%)
- Maintain the original meaning and tone

Original content:
${content}

Return the optimized content:`;

    const response = await this.callAIProvider({
      prompt: seoPrompt,
      maxTokens: 2000,
      temperature: 0.3
    });

    return response.content;
  }

  public async optimizeForPlatform(content: string, platform: string): Promise<string> {
    const platformSpecs = this.getPlatformSpecs(platform);
    
    const optimizationPrompt = `Optimize the following content for ${platform}:

Platform requirements:
- Character limit: ${platformSpecs.characterLimit || 'No limit'}
- Tone: ${platformSpecs.tone || 'Platform appropriate'}
- Format: ${platformSpecs.format || 'Standard'}
- Hashtags: ${platformSpecs.useHashtags ? 'Include relevant hashtags' : 'No hashtags'}

Original content:
${content}

Return the optimized content:`;

    const response = await this.callAIProvider({
      prompt: optimizationPrompt,
      maxTokens: 1000,
      temperature: 0.3
    });

    return response.content;
  }

  public async getTokenUsage(): Promise<{
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    cost: number;
  }> {
    // This would be tracked from actual API calls
    return {
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      cost: 0
    };
  }

  public async switchModel(modelName: string): Promise<void> {
    // Implementation for switching AI models
    this.logger.info(`Switching to model: ${modelName}`);
  }

  public async getAvailableModels(): Promise<string[]> {
    return ['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet', 'claude-3-haiku'];
  }

  // =====================================
  // Content Generation Methods
  // =====================================

  private async generateContent(request: ContentGenerationRequest): Promise<ContentGenerationResult> {
    const prompt = this.buildPrompt(request);
    const response = await this.callAIProvider({
      prompt,
      maxTokens: this.calculateMaxTokens(request.length),
      temperature: this.getTemperatureForTone(request.tone)
    });

    const content = this.postProcessContent(response.content, request);
    const metadata = await this.analyzeGeneratedContent(content, request.type);

    let variations: string[] | undefined;
    if (request.type === 'social-post' || request.type === 'ad-copy') {
      variations = await this.generateVariations(content, 3);
    }

    return {
      content,
      metadata,
      variations,
      suggestions: await this.generateSuggestions(content, request),
      seoAnalysis: request.seoOptimization ? await this.analyzeSEO(content, request.seoOptimization.targetKeywords) : undefined
    };
  }

  private buildPrompt(request: ContentGenerationRequest): string {
    let prompt = '';

    // Add system context
    if (request.brandGuidelines) {
      prompt += `Brand Guidelines:
- Brand Name: ${request.brandGuidelines.brandName}
- Brand Voice: ${request.brandGuidelines.brandVoice}
- Brand Values: ${request.brandGuidelines.brandValues.join(', ')}

`;
    }

    // Add content type specific instructions
    prompt += this.getTypeSpecificInstructions(request.type);

    // Add main prompt
    prompt += `\nContent Request: ${request.prompt}\n`;

    // Add context if provided
    if (request.context) {
      prompt += `\nContext: ${request.context}\n`;
    }

    // Add specifications
    const specs: string[] = [];
    
    if (request.targetAudience) {
      specs.push(`Target Audience: ${request.targetAudience}`);
    }
    
    if (request.tone) {
      specs.push(`Tone: ${request.tone}`);
    }
    
    if (request.platform) {
      specs.push(`Platform: ${request.platform}`);
    }
    
    if (request.keywords && request.keywords.length > 0) {
      specs.push(`Keywords to include: ${request.keywords.join(', ')}`);
    }

    if (request.constraints) {
      if (request.constraints.maxWords) {
        specs.push(`Maximum words: ${request.constraints.maxWords}`);
      }
      if (request.constraints.maxCharacters) {
        specs.push(`Maximum characters: ${request.constraints.maxCharacters}`);
      }
      if (request.constraints.mustInclude) {
        specs.push(`Must include: ${request.constraints.mustInclude.join(', ')}`);
      }
      if (request.constraints.mustAvoid) {
        specs.push(`Must avoid: ${request.constraints.mustAvoid.join(', ')}`);
      }
    }

    if (specs.length > 0) {
      prompt += `\nSpecifications:\n${specs.map(spec => `- ${spec}`).join('\n')}\n`;
    }

    prompt += '\nPlease generate the content:';

    return prompt;
  }

  private getTypeSpecificInstructions(type: string): string {
    const instructions = {
      'text': 'Create clear, engaging text content.',
      'social-post': 'Create an engaging social media post that encourages interaction.',
      'blog-article': 'Write a comprehensive blog article with clear structure and headings.',
      'email': 'Create a professional email with clear subject line and call-to-action.',
      'ad-copy': 'Write compelling advertising copy that drives action.',
      'image': 'Describe the image to be generated with detailed visual elements.',
      'video': 'Outline the video concept with scenes and narrative flow.'
    };

    return instructions[type] || 'Create high-quality content.';
  }

  private calculateMaxTokens(length?: 'short' | 'medium' | 'long' | number): number {
    if (typeof length === 'number') return length;
    
    const tokenLimits = {
      'short': 500,
      'medium': 1000,
      'long': 2000
    };

    return tokenLimits[length || 'medium'];
  }

  private getTemperatureForTone(tone?: string): number {
    const temperatures = {
      'professional': 0.3,
      'formal': 0.2,
      'casual': 0.7,
      'friendly': 0.6,
      'humorous': 0.8,
      'persuasive': 0.4
    };

    return temperatures[tone || 'professional'] || 0.5;
  }

  private postProcessContent(content: string, request: ContentGenerationRequest): string {
    let processed = content.trim();

    // Apply platform-specific post-processing
    if (request.platform) {
      processed = this.applyPlatformFormatting(processed, request.platform);
    }

    // Apply constraints
    if (request.constraints?.maxCharacters) {
      processed = processed.substring(0, request.constraints.maxCharacters);
    }

    return processed;
  }

  private applyPlatformFormatting(content: string, platform: string): string {
    switch (platform) {
      case 'twitter':
        // Ensure it fits Twitter's character limit
        return content.length > 280 ? content.substring(0, 277) + '...' : content;
      
      case 'linkedin':
        // Add professional formatting
        return content;
      
      case 'instagram':
        // Add hashtags if not present
        if (!content.includes('#')) {
          content += '\n\n#content #marketing #business';
        }
        return content;
        
      default:
        return content;
    }
  }

  private async analyzeGeneratedContent(content: string, type: string): Promise<any> {
    const words = content.split(/\s+/).length;
    const characters = content.length;
    const readingTime = Math.ceil(words / 200); // Average reading speed

    return {
      type,
      wordCount: words,
      characterCount: characters,
      readingTime,
      keywords: this.extractKeywordsFallback(content),
      sentiment: this.extractSentiment(content),
      confidence: 0.8 // Placeholder confidence score
    };
  }

  // =====================================
  // Task Handlers
  // =====================================

  private async handleContentGeneration(task: AgentTask): Promise<ContentGenerationResult> {
    const request = task.payload as ContentGenerationRequest;
    return await this.generateContent(request);
  }

  private async handleContentAnalysis(task: AgentTask): Promise<any> {
    const { content } = task.payload;
    return await this.analyzeText(content);
  }

  private async handleContentOptimization(task: AgentTask): Promise<string> {
    const { content, keywords, platform } = task.payload;
    
    if (platform) {
      return await this.optimizeForPlatform(content, platform);
    } else if (keywords) {
      return await this.optimizeForSEO(content, keywords);
    } else {
      throw new Error('Either platform or keywords must be specified for optimization');
    }
  }

  private async handleVariationGeneration(task: AgentTask): Promise<string[]> {
    const { content, count = 3 } = task.payload;
    return await this.generateVariations(content, count);
  }

  private async handleKeywordExtraction(task: AgentTask): Promise<string[]> {
    const { content } = task.payload;
    return await this.extractKeywords(content);
  }

  private async handleSentimentAnalysis(task: AgentTask): Promise<any> {
    const { content } = task.payload;
    return await this.analyzeSentiment(content);
  }

  // =====================================
  // AI Provider Integration
  // =====================================

  private async callAIProvider(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      let response: AIResponse;

      switch (this.currentProvider) {
        case 'openai':
          response = await this.callOpenAI(request);
          break;
        case 'anthropic':
          response = await this.callAnthropic(request);
          break;
        default:
          throw new Error(`Unsupported AI provider: ${this.currentProvider}`);
      }

      const duration = Date.now() - startTime;
      this.metricsCollector.recordAPICall('ai-provider', 'POST', 200, duration);
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsCollector.recordAPICall('ai-provider', 'POST', 500, duration);
      throw error;
    }
  }

  private async callOpenAI(request: AIRequest): Promise<AIResponse> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const completion = await this.openaiClient.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: request.systemMessage || 'You are a helpful content creation assistant.' },
        { role: 'user', content: request.prompt }
      ],
      max_tokens: request.maxTokens || 1000,
      temperature: request.temperature || 0.7,
    });

    const choice = completion.choices[0];
    
    return {
      content: choice.message?.content || '',
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
        cost: this.calculateCost('openai', completion.usage?.total_tokens || 0)
      },
      model: completion.model,
      finishReason: choice.finish_reason || 'unknown'
    };
  }

  private async callAnthropic(request: AIRequest): Promise<AIResponse> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const response = await this.anthropicClient.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: request.maxTokens || 1000,
      temperature: request.temperature || 0.7,
      system: request.systemMessage || 'You are a helpful content creation assistant.',
      messages: [
        { role: 'user', content: request.prompt }
      ],
    });

    const textContent = response.content.find(block => block.type === 'text');
    
    return {
      content: textContent?.text || '',
      usage: {
        promptTokens: response.usage?.input_tokens || 0,
        completionTokens: response.usage?.output_tokens || 0,
        totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
        cost: this.calculateCost('anthropic', (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0))
      },
      model: response.model,
      finishReason: response.stop_reason || 'unknown'
    };
  }

  // =====================================
  // Helper Methods
  // =====================================

  private async generateVariations(content: string, count: number): Promise<string[]> {
    const variationPrompt = `Generate ${count} variations of the following content, maintaining the same meaning but with different wording and structure:

Original: ${content}

Return only the variations, one per line:`;

    const response = await this.callAIProvider({
      prompt: variationPrompt,
      maxTokens: 1000,
      temperature: 0.8
    });

    return response.content.split('\n').filter(line => line.trim().length > 0);
  }

  private async generateSuggestions(content: string, request: ContentGenerationRequest): Promise<string[]> {
    const suggestionPrompt = `Provide 3-5 suggestions to improve the following ${request.type}:

Content: ${content}

Focus on:
- Engagement
- Clarity
- Call-to-action
- SEO optimization
- Platform best practices

Return suggestions as a numbered list:`;

    const response = await this.callAIProvider({
      prompt: suggestionPrompt,
      maxTokens: 500,
      temperature: 0.5
    });

    return response.content.split('\n').filter(line => line.trim().length > 0);
  }

  private async analyzeSEO(content: string, keywords: string[]): Promise<any> {
    const keywordDensity = this.calculateKeywordDensity(content, keywords);
    
    return {
      keywordDensity,
      readabilityScore: this.calculateReadabilityScore(content),
      suggestedTags: await this.extractKeywords(content)
    };
  }

  private calculateKeywordDensity(content: string, keywords: string[]): Record<string, number> {
    const words = content.toLowerCase().split(/\s+/);
    const totalWords = words.length;
    const density: Record<string, number> = {};

    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      const count = words.filter(word => word.includes(keywordLower)).length;
      density[keyword] = (count / totalWords) * 100;
    });

    return density;
  }

  private calculateReadabilityScore(content: string): number {
    // Simple readability score calculation (Flesch Reading Ease approximation)
    const sentences = content.split(/[.!?]+/).length - 1;
    const words = content.split(/\s+/).length;
    const syllables = this.countSyllables(content);

    if (sentences === 0 || words === 0) return 0;

    const avgSentenceLength = words / sentences;
    const avgSyllablesPerWord = syllables / words;

    return 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
  }

  private countSyllables(text: string): number {
    // Simple syllable counting
    return text.toLowerCase()
      .replace(/[^a-z]/g, '')
      .replace(/[aeiouy]+/g, 'a')
      .replace(/^a|a$/g, '')
      .length || 1;
  }

  private extractSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    // Simple sentiment analysis using basic word matching
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best'];
    const negativeWords = ['bad', 'terrible', 'awful', 'worst', 'hate', 'horrible', 'disappointing'];
    
    const words = text.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(word => positiveWords.some(pw => word.includes(pw))).length;
    const negativeCount = words.filter(word => negativeWords.some(nw => word.includes(nw))).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private extractKeywordsFallback(text: string): string[] {
    // Simple keyword extraction fallback
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const wordCounts = new Map<string, number>();
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });
    
    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private getPlatformSpecs(platform: string): any {
    const specs = {
      twitter: { characterLimit: 280, useHashtags: true, tone: 'casual' },
      facebook: { characterLimit: null, useHashtags: false, tone: 'friendly' },
      instagram: { characterLimit: 2200, useHashtags: true, tone: 'visual' },
      linkedin: { characterLimit: 3000, useHashtags: true, tone: 'professional' },
      tiktok: { characterLimit: 150, useHashtags: true, tone: 'trendy' }
    };

    return specs[platform] || { characterLimit: null, useHashtags: false, tone: 'neutral' };
  }

  private calculateCost(provider: string, tokens: number): number {
    // Placeholder cost calculation - would use real pricing
    const costs = {
      openai: 0.002 / 1000, // $0.002 per 1K tokens
      anthropic: 0.003 / 1000 // $0.003 per 1K tokens
    };

    return (costs[provider] || 0) * tokens;
  }

  // =====================================
  // Initialization Methods
  // =====================================

  private initializeProviders(): void {
    // Initialize OpenAI
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey) {
      this.openaiClient = new OpenAI({ apiKey: openaiApiKey });
      this.providerConfigs.set('openai', {
        provider: 'openai',
        apiKey: openaiApiKey,
        model: 'gpt-4',
        maxTokens: 2000,
        temperature: 0.7
      });
    }

    // Initialize Anthropic
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicApiKey) {
      this.anthropicClient = new Anthropic({ apiKey: anthropicApiKey });
      this.providerConfigs.set('anthropic', {
        provider: 'anthropic',
        apiKey: anthropicApiKey,
        model: 'claude-3-sonnet-20240229',
        maxTokens: 2000,
        temperature: 0.7
      });
    }
  }

  private loadContentTemplates(): void {
    // Load content templates for different types
    this.contentTemplates.set('social-post', 'Create an engaging social media post about {topic}. Include a call-to-action and relevant hashtags.');
    this.contentTemplates.set('blog-article', 'Write a comprehensive blog article about {topic}. Include an introduction, main points, and conclusion.');
    this.contentTemplates.set('email', 'Write a professional email about {topic}. Include a clear subject line and call-to-action.');
    this.contentTemplates.set('ad-copy', 'Create compelling advertisement copy for {topic}. Focus on benefits and include a strong call-to-action.');
  }

  private setupCapabilities(): void {
    this.capabilities.push(
      {
        name: 'content-generation',
        version: '1.0.0',
        description: 'Generate various types of content using AI',
        inputSchema: {},
        outputSchema: {},
        requirements: ['AI API access'],
        limitations: ['Rate limits apply']
      },
      {
        name: 'content-analysis',
        version: '1.0.0',
        description: 'Analyze content for sentiment, keywords, and SEO',
        inputSchema: {},
        outputSchema: {},
        requirements: ['AI API access'],
        limitations: []
      },
      {
        name: 'content-optimization',
        version: '1.0.0',
        description: 'Optimize content for different platforms and SEO',
        inputSchema: {},
        outputSchema: {},
        requirements: ['AI API access'],
        limitations: []
      }
    );
  }

  private async validateProviderConfigs(): Promise<void> {
    // Validate that at least one provider is configured
    if (this.providerConfigs.size === 0) {
      throw new Error('No AI providers configured');
    }
  }

  private async loadBrandProfiles(): Promise<void> {
    // Load brand profiles from database or config
    // This is a placeholder - would load from actual storage
  }

  private async testProviderConnections(): Promise<void> {
    // Test connections to configured providers
    for (const [provider, config] of this.providerConfigs) {
      try {
        await this.callAIProvider({
          prompt: 'Test connection',
          maxTokens: 10,
          temperature: 0.1
        });
        this.logger.info(`${provider} connection test successful`);
      } catch (error) {
        this.logger.warn(`${provider} connection test failed:`, error);
      }
    }
  }

  protected async getCustomMetrics(): Promise<Record<string, number>> {
    return {
      'content.generated': this.metricsCollector.getCounterValue('tasks.completed'),
      'ai.api_calls': this.metricsCollector.getCounterValue('api.calls'),
      'ai.tokens_used': this.metricsCollector.getCounterValue('ai.tokens') || 0
    };
  }
}