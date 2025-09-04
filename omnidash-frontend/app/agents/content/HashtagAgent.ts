/**
 * Hashtag Agent - AI-powered hashtag research, generation, and optimization
 * Analyzes trends and generates relevant hashtags for social media content
 */

import { BaseAgent } from '../base/BaseAgent';
import {
  AgentTask,
  AgentResult,
  AgentContext,
  AgentMetadata,
  AIProvider
} from '../base/AgentInterface';

interface HashtagTask {
  type: 'generate' | 'analyze' | 'optimize' | 'research-trends';
  content?: string;
  topic: string;
  platform: 'twitter' | 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube';
  industry?: string;
  audience?: string;
  location?: string;
  language?: string;
  count?: number;
  includePopular?: boolean;
  includeNiche?: boolean;
  competitorHashtags?: string[];
}

interface HashtagResult {
  hashtags: HashtagItem[];
  analysis: {
    totalReach: number;
    avgEngagementRate: number;
    difficulty: 'low' | 'medium' | 'high';
    recommendations: string[];
  };
  trends?: TrendData[];
  alternatives?: string[][];
}

interface HashtagItem {
  tag: string;
  popularity: number;
  difficulty: number;
  engagementRate: number;
  category: 'trending' | 'niche' | 'branded' | 'community' | 'location';
  related: string[];
  metrics?: {
    posts: number;
    reach: number;
    growth: number;
  };
}

interface TrendData {
  hashtag: string;
  growth: number;
  volume: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  platform: string;
  timeframe: string;
}

export class HashtagAgent extends BaseAgent {
  private aiProvider: AIProvider;
  private hashtagDatabase: Map<string, HashtagItem[]> = new Map();
  private trendingCache: Map<string, TrendData[]> = new Map();
  private lastTrendsUpdate: Date = new Date(0);

  constructor(aiProvider: AIProvider) {
    const metadata: AgentMetadata = {
      id: 'hashtag-agent',
      name: 'Hashtag Research Agent',
      version: '1.0.0',
      description: 'AI-powered hashtag research, generation, and trend analysis for social media optimization',
      category: 'content',
      capabilities: [
        {
          name: 'generate-hashtags',
          description: 'Generate relevant hashtags for content',
          inputSchema: {
            type: 'object',
            properties: {
              content: { type: 'string' },
              topic: { type: 'string' },
              platform: { type: 'string', enum: ['twitter', 'instagram', 'facebook', 'linkedin', 'tiktok', 'youtube'] },
              count: { type: 'number', minimum: 1, maximum: 30 }
            },
            required: ['topic', 'platform']
          }
        },
        {
          name: 'analyze-hashtags',
          description: 'Analyze hashtag performance and potential',
          inputSchema: {
            type: 'object',
            properties: {
              hashtags: { type: 'array', items: { type: 'string' } },
              platform: { type: 'string' }
            },
            required: ['hashtags', 'platform']
          }
        },
        {
          name: 'research-trends',
          description: 'Research trending hashtags and topics',
          inputSchema: {
            type: 'object',
            properties: {
              platform: { type: 'string' },
              industry: { type: 'string' },
              location: { type: 'string' }
            },
            required: ['platform']
          }
        },
        {
          name: 'optimize-hashtags',
          description: 'Optimize hashtag mix for maximum reach and engagement',
          inputSchema: {
            type: 'object',
            properties: {
              currentHashtags: { type: 'array', items: { type: 'string' } },
              content: { type: 'string' },
              platform: { type: 'string' }
            },
            required: ['currentHashtags', 'platform']
          }
        }
      ],
      tags: ['hashtags', 'social-media', 'trends', 'optimization', 'research']
    };

    super(metadata);
    this.aiProvider = aiProvider;
  }

  protected async onInitialize(): Promise<void> {
    this.log('info', 'Initializing Hashtag Agent');
    
    // Load hashtag database
    await this.loadHashtagDatabase();
    
    // Update trending hashtags
    await this.updateTrendingHashtags();
    
    // Set up periodic trend updates
    this.schedulePeriodicUpdates();
  }

  protected async executeTask(task: AgentTask, context?: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    
    try {
      this.log('info', `Executing hashtag task: ${task.type}`, { taskId: task.id });
      this.updateProgress(10);

      const taskData = task.data as HashtagTask;
      let result: HashtagResult;

      switch (task.type) {
        case 'generate-hashtags':
          result = await this.generateHashtags(taskData, context);
          break;
        case 'analyze-hashtags':
          result = await this.analyzeHashtags(taskData, context);
          break;
        case 'research-trends':
          result = await this.researchTrends(taskData, context);
          break;
        case 'optimize-hashtags':
          result = await this.optimizeHashtags(taskData, context);
          break;
        default:
          throw new Error(`Unsupported hashtag task type: ${task.type}`);
      }

      this.updateProgress(90);

      // Update hashtag database with new insights
      await this.updateHashtagDatabase(result, taskData);

      this.updateProgress(100);

      return {
        success: true,
        data: result,
        metadata: {
          executionTime: Date.now() - startTime,
          hashtagCount: result.hashtags.length,
          platform: taskData.platform
        }
      };

    } catch (error) {
      this.log('error', 'Hashtag task execution failed', { error: error.message, taskId: task.id });
      throw error;
    }
  }

  protected validateTask(task: AgentTask): boolean {
    if (!task.data) return false;

    const taskData = task.data as HashtagTask;
    
    // Validate required fields
    if (!taskData.platform) return false;
    
    const validPlatforms = ['twitter', 'instagram', 'facebook', 'linkedin', 'tiktok', 'youtube'];
    if (!validPlatforms.includes(taskData.platform)) return false;

    // Task-specific validations
    switch (task.type) {
      case 'generate-hashtags':
        return !!taskData.topic;
      case 'analyze-hashtags':
        return Array.isArray(taskData.competitorHashtags) && taskData.competitorHashtags.length > 0;
      case 'research-trends':
        return true; // Only platform is required
      case 'optimize-hashtags':
        return Array.isArray(taskData.competitorHashtags) && taskData.competitorHashtags.length > 0;
      default:
        return false;
    }
  }

  protected async getAgentSpecificMetrics(): Promise<Record<string, any>> {
    return {
      hashtagsGenerated: this.executionCount,
      databaseSize: this.hashtagDatabase.size,
      trendsCacheSize: this.trendingCache.size,
      lastTrendsUpdate: this.lastTrendsUpdate,
      popularPlatforms: this.getMostUsedPlatforms(),
      topIndustries: this.getTopIndustries()
    };
  }

  private async generateHashtags(taskData: HashtagTask, context?: AgentContext): Promise<HashtagResult> {
    this.log('info', 'Generating hashtags', { topic: taskData.topic, platform: taskData.platform });
    this.updateProgress(30);

    // Build comprehensive prompt for hashtag generation
    const prompt = this.buildHashtagGenerationPrompt(taskData);
    
    // Generate hashtags using AI
    const aiResponse = await this.aiProvider.generate(prompt, {
      temperature: 0.7,
      maxTokens: 800,
      model: this.config.ai?.model || 'gpt-4'
    });

    this.updateProgress(50);

    // Parse and process AI response
    const generatedTags = this.parseHashtagResponse(aiResponse);
    
    // Enrich hashtags with additional data
    const enrichedHashtags = await this.enrichHashtags(generatedTags, taskData.platform);
    
    this.updateProgress(70);

    // Get trending hashtags for the platform
    const trendingHashtags = await this.getTrendingForPlatform(taskData.platform, taskData.industry);
    
    // Combine and optimize hashtag mix
    const finalHashtags = this.optimizeHashtagMix(enrichedHashtags, trendingHashtags, taskData);
    
    // Generate analysis and recommendations
    const analysis = this.analyzeHashtagMix(finalHashtags, taskData.platform);

    return {
      hashtags: finalHashtags,
      analysis,
      trends: trendingHashtags,
      alternatives: await this.generateAlternatives(finalHashtags, taskData)
    };
  }

  private async analyzeHashtags(taskData: HashtagTask, context?: AgentContext): Promise<HashtagResult> {
    this.log('info', 'Analyzing hashtags', { count: taskData.competitorHashtags?.length });
    this.updateProgress(30);

    const hashtags = taskData.competitorHashtags || [];
    const enrichedHashtags: HashtagItem[] = [];

    // Analyze each hashtag
    for (const tag of hashtags) {
      this.updateProgress(30 + (hashtags.indexOf(tag) / hashtags.length) * 40);
      
      const hashtagData = await this.getHashtagData(tag, taskData.platform);
      if (hashtagData) {
        enrichedHashtags.push(hashtagData);
      }
    }

    this.updateProgress(70);

    // Generate comprehensive analysis
    const analysis = this.analyzeHashtagMix(enrichedHashtags, taskData.platform);
    
    // Get related trending hashtags
    const trends = await this.getTrendingForPlatform(taskData.platform, taskData.industry);

    return {
      hashtags: enrichedHashtags,
      analysis,
      trends,
      alternatives: await this.generateAlternatives(enrichedHashtags, taskData)
    };
  }

  private async researchTrends(taskData: HashtagTask, context?: AgentContext): Promise<HashtagResult> {
    this.log('info', 'Researching hashtag trends', { platform: taskData.platform, industry: taskData.industry });
    this.updateProgress(30);

    // Get trending hashtags
    const trends = await this.getTrendingForPlatform(taskData.platform, taskData.industry, taskData.location);
    
    this.updateProgress(60);

    // Convert trends to hashtag items
    const hashtags = trends.map(trend => this.trendToHashtagItem(trend));
    
    // Generate analysis
    const analysis = this.analyzeTrends(trends, taskData.platform);

    this.updateProgress(90);

    return {
      hashtags,
      analysis,
      trends,
      alternatives: []
    };
  }

  private async optimizeHashtags(taskData: HashtagTask, context?: AgentContext): Promise<HashtagResult> {
    this.log('info', 'Optimizing hashtag mix', { currentCount: taskData.competitorHashtags?.length });
    this.updateProgress(30);

    const currentHashtags = taskData.competitorHashtags || [];
    
    // Analyze current hashtags
    const currentAnalysis = await this.analyzeHashtags({ ...taskData, type: 'analyze' }, context);
    
    this.updateProgress(50);

    // Generate new suggestions
    const newSuggestions = await this.generateHashtags({ 
      ...taskData, 
      type: 'generate',
      topic: taskData.content || taskData.topic 
    }, context);
    
    this.updateProgress(70);

    // Create optimized mix
    const optimizedHashtags = this.createOptimizedMix(
      currentAnalysis.hashtags,
      newSuggestions.hashtags,
      taskData.platform
    );

    // Generate final analysis
    const analysis = this.analyzeHashtagMix(optimizedHashtags, taskData.platform);

    return {
      hashtags: optimizedHashtags,
      analysis,
      trends: newSuggestions.trends,
      alternatives: await this.generateAlternatives(optimizedHashtags, taskData)
    };
  }

  private buildHashtagGenerationPrompt(taskData: HashtagTask): string {
    return `Generate relevant and effective hashtags for social media content.

Content/Topic: ${taskData.content || taskData.topic}
Platform: ${taskData.platform}
Industry: ${taskData.industry || 'general'}
Target Audience: ${taskData.audience || 'general'}
Location: ${taskData.location || 'global'}
Language: ${taskData.language || 'English'}
Requested Count: ${taskData.count || 10}

Requirements:
- Mix of popular and niche hashtags
- ${taskData.includePopular ? 'Include trending/popular hashtags' : 'Focus on niche hashtags'}
- Platform-specific optimization for ${taskData.platform}
- Avoid banned or problematic hashtags
- Include industry-relevant tags
- Consider local/geographic relevance if applicable

Generate hashtags in this format:
#hashtag1 - [popularity: high/medium/low] - [category: trending/niche/branded/community/location]
#hashtag2 - [popularity: high/medium/low] - [category: trending/niche/branded/community/location]

Focus on hashtags that will maximize reach and engagement for this specific content and platform.`;
  }

  private parseHashtagResponse(response: string): string[] {
    const hashtags: string[] = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      const match = line.match(/#([^\s-]+)/);
      if (match) {
        hashtags.push(match[1].toLowerCase());
      }
    }
    
    return [...new Set(hashtags)]; // Remove duplicates
  }

  private async enrichHashtags(hashtags: string[], platform: string): Promise<HashtagItem[]> {
    const enriched: HashtagItem[] = [];
    
    for (const tag of hashtags) {
      const hashtagData = await this.getHashtagData(tag, platform) || this.createHashtagItem(tag, platform);
      enriched.push(hashtagData);
    }
    
    return enriched;
  }

  private async getHashtagData(tag: string, platform: string): Promise<HashtagItem | null> {
    // Check cache first
    const cacheKey = `${platform}:${tag}`;
    const cached = this.hashtagDatabase.get(cacheKey);
    
    if (cached && cached.length > 0) {
      return cached[0];
    }

    // Generate hashtag data using AI or external APIs
    try {
      const prompt = `Analyze the hashtag #${tag} for ${platform}. Provide:
      - Popularity level (1-100)
      - Difficulty level (1-100) 
      - Estimated engagement rate
      - Category (trending/niche/branded/community/location)
      - Related hashtags (3-5)
      
      Return in JSON format.`;

      const response = await this.aiProvider.generate(prompt, {
        temperature: 0.3,
        maxTokens: 500
      });

      return this.parseHashtagAnalysis(tag, response, platform);
    } catch (error) {
      this.log('warn', `Failed to get data for hashtag #${tag}`, { error: error.message });
      return null;
    }
  }

  private createHashtagItem(tag: string, platform: string): HashtagItem {
    return {
      tag,
      popularity: Math.floor(Math.random() * 100) + 1,
      difficulty: Math.floor(Math.random() * 100) + 1,
      engagementRate: Math.random() * 10,
      category: this.categorizeHashtag(tag),
      related: [],
      metrics: {
        posts: Math.floor(Math.random() * 1000000),
        reach: Math.floor(Math.random() * 10000000),
        growth: (Math.random() - 0.5) * 200
      }
    };
  }

  private parseHashtagAnalysis(tag: string, response: string, platform: string): HashtagItem {
    try {
      const data = JSON.parse(response);
      return {
        tag,
        popularity: data.popularity || 50,
        difficulty: data.difficulty || 50,
        engagementRate: data.engagementRate || 2.5,
        category: data.category || 'niche',
        related: data.related || [],
        metrics: data.metrics || {
          posts: 0,
          reach: 0,
          growth: 0
        }
      };
    } catch {
      return this.createHashtagItem(tag, platform);
    }
  }

  private categorizeHashtag(tag: string): HashtagItem['category'] {
    // Simple categorization logic
    if (tag.includes('trend') || tag.includes('viral')) return 'trending';
    if (tag.includes('brand') || tag.includes('company')) return 'branded';
    if (tag.includes('community') || tag.includes('group')) return 'community';
    if (this.isLocationTag(tag)) return 'location';
    return 'niche';
  }

  private isLocationTag(tag: string): boolean {
    const locationKeywords = ['city', 'country', 'state', 'local', 'region', 'area'];
    return locationKeywords.some(keyword => tag.includes(keyword));
  }

  private optimizeHashtagMix(
    generated: HashtagItem[], 
    trending: TrendData[], 
    taskData: HashtagTask
  ): HashtagItem[] {
    const targetCount = taskData.count || 10;
    const mix: HashtagItem[] = [];
    
    // Add trending hashtags (30%)
    const trendingCount = Math.ceil(targetCount * 0.3);
    const trendingItems = trending.slice(0, trendingCount).map(trend => this.trendToHashtagItem(trend));
    mix.push(...trendingItems);
    
    // Add generated hashtags, avoiding duplicates
    const remaining = targetCount - mix.length;
    const uniqueGenerated = generated.filter(item => 
      !mix.some(existing => existing.tag === item.tag)
    );
    
    mix.push(...uniqueGenerated.slice(0, remaining));
    
    // Sort by effectiveness score
    return mix.sort((a, b) => this.calculateEffectivenessScore(b) - this.calculateEffectivenessScore(a));
  }

  private calculateEffectivenessScore(hashtag: HashtagItem): number {
    // Balanced score considering popularity, engagement, and difficulty
    const popularityScore = hashtag.popularity * 0.3;
    const engagementScore = hashtag.engagementRate * 10;
    const difficultyPenalty = hashtag.difficulty * 0.2;
    
    return popularityScore + engagementScore - difficultyPenalty;
  }

  private analyzeHashtagMix(hashtags: HashtagItem[], platform: string): HashtagResult['analysis'] {
    const totalReach = hashtags.reduce((sum, item) => sum + (item.metrics?.reach || 0), 0);
    const avgEngagementRate = hashtags.reduce((sum, item) => sum + item.engagementRate, 0) / hashtags.length;
    const avgDifficulty = hashtags.reduce((sum, item) => sum + item.difficulty, 0) / hashtags.length;
    
    let difficulty: 'low' | 'medium' | 'high';
    if (avgDifficulty < 30) difficulty = 'low';
    else if (avgDifficulty < 70) difficulty = 'medium';
    else difficulty = 'high';

    const recommendations = this.generateRecommendations(hashtags, platform);

    return {
      totalReach,
      avgEngagementRate,
      difficulty,
      recommendations
    };
  }

  private generateRecommendations(hashtags: HashtagItem[], platform: string): string[] {
    const recommendations: string[] = [];
    
    // Check hashtag distribution
    const categories = hashtags.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    if (!categories.trending) {
      recommendations.push('Consider adding trending hashtags to increase visibility');
    }
    
    if (!categories.niche) {
      recommendations.push('Add niche hashtags to target specific communities');
    }
    
    if (hashtags.length > this.getPlatformHashtagLimit(platform)) {
      recommendations.push(`Consider reducing hashtag count for ${platform} (recommended: ${this.getPlatformHashtagLimit(platform)})`);
    }
    
    const avgPopularity = hashtags.reduce((sum, item) => sum + item.popularity, 0) / hashtags.length;
    if (avgPopularity > 80) {
      recommendations.push('Mix includes very popular hashtags - consider adding some niche ones to reduce competition');
    }
    
    return recommendations;
  }

  private getPlatformHashtagLimit(platform: string): number {
    const limits = {
      instagram: 30,
      twitter: 10,
      facebook: 10,
      linkedin: 5,
      tiktok: 20,
      youtube: 15
    };
    
    return limits[platform as keyof typeof limits] || 10;
  }

  private async getTrendingForPlatform(platform: string, industry?: string, location?: string): Promise<TrendData[]> {
    const cacheKey = `trends:${platform}:${industry || 'all'}:${location || 'global'}`;
    
    // Check cache
    if (this.trendingCache.has(cacheKey)) {
      const cached = this.trendingCache.get(cacheKey)!;
      const cacheAge = Date.now() - this.lastTrendsUpdate.getTime();
      if (cacheAge < 3600000) { // 1 hour cache
        return cached;
      }
    }

    // Fetch trending data (mock implementation)
    const trends = await this.fetchTrendingData(platform, industry, location);
    this.trendingCache.set(cacheKey, trends);
    
    return trends;
  }

  private async fetchTrendingData(platform: string, industry?: string, location?: string): Promise<TrendData[]> {
    // Mock trending data - replace with actual API calls
    const mockTrends: TrendData[] = [
      {
        hashtag: 'socialmedia',
        growth: 25.5,
        volume: 150000,
        sentiment: 'positive',
        platform,
        timeframe: '24h'
      },
      {
        hashtag: 'marketing',
        growth: 15.2,
        volume: 89000,
        sentiment: 'positive',
        platform,
        timeframe: '24h'
      },
      {
        hashtag: 'trending',
        growth: 45.8,
        volume: 250000,
        sentiment: 'neutral',
        platform,
        timeframe: '24h'
      }
    ];
    
    return mockTrends.filter(trend => 
      !industry || trend.hashtag.includes(industry.toLowerCase())
    );
  }

  private trendToHashtagItem(trend: TrendData): HashtagItem {
    return {
      tag: trend.hashtag,
      popularity: Math.min(100, trend.volume / 1000),
      difficulty: 100 - Math.min(100, trend.growth),
      engagementRate: trend.growth * 0.1,
      category: 'trending',
      related: [],
      metrics: {
        posts: trend.volume,
        reach: trend.volume * 10,
        growth: trend.growth
      }
    };
  }

  private analyzeTrends(trends: TrendData[], platform: string): HashtagResult['analysis'] {
    const totalReach = trends.reduce((sum, trend) => sum + trend.volume * 10, 0);
    const avgEngagementRate = trends.reduce((sum, trend) => sum + trend.growth * 0.1, 0) / trends.length;
    
    return {
      totalReach,
      avgEngagementRate,
      difficulty: 'medium',
      recommendations: [
        'These are currently trending hashtags',
        'Act quickly as trends change rapidly',
        'Monitor performance and adjust strategy'
      ]
    };
  }

  private createOptimizedMix(
    current: HashtagItem[], 
    suggestions: HashtagItem[], 
    platform: string
  ): HashtagItem[] {
    // Combine and deduplicate
    const combined = [...current];
    
    suggestions.forEach(suggestion => {
      if (!combined.some(item => item.tag === suggestion.tag)) {
        combined.push(suggestion);
      }
    });
    
    // Sort by effectiveness and take top ones
    const limit = this.getPlatformHashtagLimit(platform);
    return combined
      .sort((a, b) => this.calculateEffectivenessScore(b) - this.calculateEffectivenessScore(a))
      .slice(0, limit);
  }

  private async generateAlternatives(hashtags: HashtagItem[], taskData: HashtagTask): Promise<string[][]> {
    const alternatives: string[][] = [];
    
    for (let i = 0; i < 3; i++) {
      const alternative: string[] = [];
      
      for (const hashtag of hashtags.slice(0, 5)) {
        if (hashtag.related.length > 0) {
          const randomRelated = hashtag.related[Math.floor(Math.random() * hashtag.related.length)];
          alternative.push(randomRelated);
        } else {
          alternative.push(hashtag.tag);
        }
      }
      
      alternatives.push(alternative);
    }
    
    return alternatives;
  }

  private async loadHashtagDatabase(): Promise<void> {
    // Load from persistent storage
    this.log('info', 'Loading hashtag database');
    // Implementation would load from database
  }

  private async updateHashtagDatabase(result: HashtagResult, taskData: HashtagTask): Promise<void> {
    // Update database with new insights
    const cacheKey = `${taskData.platform}:${taskData.topic}`;
    this.hashtagDatabase.set(cacheKey, result.hashtags);
  }

  private async updateTrendingHashtags(): Promise<void> {
    this.log('info', 'Updating trending hashtags');
    
    const platforms = ['instagram', 'twitter', 'facebook', 'linkedin', 'tiktok'];
    
    for (const platform of platforms) {
      try {
        const trends = await this.fetchTrendingData(platform);
        this.trendingCache.set(`trends:${platform}:all:global`, trends);
      } catch (error) {
        this.log('warn', `Failed to update trends for ${platform}`, { error: error.message });
      }
    }
    
    this.lastTrendsUpdate = new Date();
  }

  private schedulePeriodicUpdates(): void {
    // Update trends every hour
    setInterval(() => {
      this.updateTrendingHashtags().catch(error => {
        this.log('error', 'Scheduled trend update failed', { error: error.message });
      });
    }, 3600000); // 1 hour
  }

  private getMostUsedPlatforms(): string[] {
    // Analyze usage patterns
    return ['instagram', 'twitter', 'linkedin']; // Mock data
  }

  private getTopIndustries(): string[] {
    // Analyze industry patterns
    return ['technology', 'marketing', 'business']; // Mock data
  }
}