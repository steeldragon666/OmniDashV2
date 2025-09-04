import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ContentGenerationRequest {
  brandId: string;
  platform: 'twitter' | 'instagram' | 'linkedin' | 'tiktok' | 'facebook';
  contentType: 'post' | 'story' | 'reel' | 'article' | 'thread';
  tone: 'professional' | 'casual' | 'humorous' | 'inspirational' | 'educational';
  topic?: string;
  keywords?: string[];
  targetAudience?: string;
  customPrompt?: string;
  includeHashtags?: boolean;
  includeEmojis?: boolean;
  maxLength?: number;
}

export interface AIProvider {
  generateContent(request: ContentGenerationRequest): Promise<ContentVariation[]>;
  generateHashtags(content: string, platform: string): Promise<string[]>;
  analyzeSentiment(content: string): Promise<SentimentAnalysis>;
  improveContent(content: string, feedback: string): Promise<string>;
}

export interface ContentVariation {
  id: string;
  content: string;
  tone: string;
  hashtags: string[];
  estimatedEngagement: number;
  aiProvider: string;
  confidence: number;
}

export interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  confidence: number;
  keywords: string[];
  emotions: {
    joy: number;
    anger: number;
    fear: number;
    sadness: number;
    surprise: number;
  };
}

export class OpenAIProvider implements AIProvider {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async generateContent(request: ContentGenerationRequest): Promise<ContentVariation[]> {
    try {
      const brand = await this.getBrandContext(request.brandId);
      const systemPrompt = this.buildSystemPrompt(brand, request);
      const userPrompt = this.buildUserPrompt(request);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 1000,
        n: 5 // Generate 5 variations
      });

      return completion.choices.map((choice, index) => ({
        id: `openai-${Date.now()}-${index}`,
        content: choice.message?.content || '',
        tone: request.tone,
        hashtags: this.extractHashtags(choice.message?.content || ''),
        estimatedEngagement: this.estimateEngagement(choice.message?.content || '', request.platform),
        aiProvider: 'openai',
        confidence: 0.85
      }));
    } catch (error) {
      console.error('OpenAI content generation error:', error);
      throw new Error('Failed to generate content with OpenAI');
    }
  }

  async generateHashtags(content: string, platform: string): Promise<string[]> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: `Generate 10 relevant hashtags for this ${platform} content. Return only hashtags, one per line:\n\n${content}`
        }],
        max_tokens: 200,
        temperature: 0.3
      });

      const hashtags = completion.choices[0]?.message?.content
        ?.split('\n')
        .filter(line => line.trim().startsWith('#'))
        .map(hashtag => hashtag.trim()) || [];

      return hashtags.slice(0, 10);
    } catch (error) {
      console.error('OpenAI hashtag generation error:', error);
      return [];
    }
  }

  async analyzeSentiment(content: string): Promise<SentimentAnalysis> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: `Analyze the sentiment of this content and return a JSON response with sentiment (positive/negative/neutral), score (-1 to 1), confidence (0 to 1), keywords array, and emotions object (joy, anger, fear, sadness, surprise with scores 0-1):\n\n${content}`
        }],
        max_tokens: 300,
        temperature: 0.1
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      return {
        sentiment: result.sentiment || 'neutral',
        score: result.score || 0,
        confidence: result.confidence || 0.5,
        keywords: result.keywords || [],
        emotions: result.emotions || { joy: 0, anger: 0, fear: 0, sadness: 0, surprise: 0 }
      };
    } catch (error) {
      console.error('OpenAI sentiment analysis error:', error);
      return {
        sentiment: 'neutral',
        score: 0,
        confidence: 0,
        keywords: [],
        emotions: { joy: 0, anger: 0, fear: 0, sadness: 0, surprise: 0 }
      };
    }
  }

  async improveContent(content: string, feedback: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{
          role: 'user',
          content: `Improve this content based on the feedback provided:\n\nOriginal Content:\n${content}\n\nFeedback:\n${feedback}\n\nImproved Content:`
        }],
        max_tokens: 500,
        temperature: 0.7
      });

      return completion.choices[0]?.message?.content || content;
    } catch (error) {
      console.error('OpenAI content improvement error:', error);
      return content;
    }
  }

  private buildSystemPrompt(brand: any, request: ContentGenerationRequest): string {
    return `You are a professional social media content creator for ${brand.name}.

Brand Context:
- Name: ${brand.name}
- Industry: ${brand.industry || 'General'}
- Description: ${brand.description || 'A dynamic brand'}
- Tone: ${request.tone}
- Target Audience: ${request.targetAudience || 'General audience'}

Platform: ${request.platform}
Content Type: ${request.contentType}

Guidelines:
- Write engaging, ${request.tone} content
- Keep within platform character limits
- ${request.includeHashtags ? 'Include relevant hashtags' : 'Do not include hashtags'}
- ${request.includeEmojis ? 'Use emojis appropriately' : 'Avoid emojis'}
- Focus on ${request.topic || 'brand-relevant topics'}
- Make content shareable and engaging

Platform-specific requirements:
${this.getPlatformRequirements(request.platform)}`;
  }

  private buildUserPrompt(request: ContentGenerationRequest): string {
    let prompt = `Create ${request.contentType} content`;
    
    if (request.topic) {
      prompt += ` about ${request.topic}`;
    }
    
    if (request.keywords?.length) {
      prompt += `. Include these keywords: ${request.keywords.join(', ')}`;
    }
    
    if (request.customPrompt) {
      prompt += `\n\nAdditional requirements: ${request.customPrompt}`;
    }
    
    if (request.maxLength) {
      prompt += `\n\nKeep content under ${request.maxLength} characters.`;
    }

    return prompt;
  }

  private getPlatformRequirements(platform: string): string {
    const requirements = {
      twitter: '- Maximum 280 characters\n- Use trending hashtags\n- Be concise and impactful',
      instagram: '- Engaging captions with storytelling\n- Use up to 30 hashtags\n- Include call-to-action',
      linkedin: '- Professional tone\n- Industry insights\n- Thought leadership angle\n- Use 3-5 relevant hashtags',
      tiktok: '- Trendy and engaging\n- Hook viewers in first 3 seconds\n- Use popular hashtags and sounds',
      facebook: '- Conversational tone\n- Encourage engagement\n- Can be longer form content'
    };
    return requirements[platform as keyof typeof requirements] || '';
  }

  private extractHashtags(content: string): string[] {
    const hashtagRegex = /#[a-zA-Z0-9_]+/g;
    return content.match(hashtagRegex) || [];
  }

  private estimateEngagement(content: string, platform: string): number {
    // Simple engagement estimation based on content characteristics
    let score = 50; // Base score
    
    // Length optimization
    if (platform === 'twitter' && content.length <= 280) score += 10;
    if (platform === 'instagram' && content.length > 100) score += 5;
    
    // Hashtag presence
    const hashtags = this.extractHashtags(content);
    score += Math.min(hashtags.length * 2, 10);
    
    // Question marks (engagement triggers)
    const questions = (content.match(/\?/g) || []).length;
    score += Math.min(questions * 5, 15);
    
    // Emojis
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu;
    const emojis = (content.match(emojiRegex) || []).length;
    score += Math.min(emojis * 2, 10);
    
    return Math.min(score, 100);
  }

  private async getBrandContext(brandId: string): Promise<any> {
    return await prisma.brand.findUnique({
      where: { id: brandId },
      select: {
        name: true,
        description: true,
        industry: true,
        themeConfig: true
      }
    });
  }
}

export class ClaudeProvider implements AIProvider {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY
    });
  }

  async generateContent(request: ContentGenerationRequest): Promise<ContentVariation[]> {
    try {
      const brand = await this.getBrandContext(request.brandId);
      const systemPrompt = this.buildSystemPrompt(brand, request);
      const userPrompt = this.buildUserPrompt(request);

      const variations: ContentVariation[] = [];

      // Generate 5 variations with different temperature settings
      for (let i = 0; i < 5; i++) {
        const message = await this.anthropic.messages.create({
          model: 'claude-3-opus-20240229',
          max_tokens: 1000,
          temperature: 0.7 + (i * 0.1), // Vary temperature for different styles
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: userPrompt
          }]
        });

        const content = message.content[0].type === 'text' ? message.content[0].text : '';
        
        variations.push({
          id: `claude-${Date.now()}-${i}`,
          content,
          tone: request.tone,
          hashtags: this.extractHashtags(content),
          estimatedEngagement: this.estimateEngagement(content, request.platform),
          aiProvider: 'claude',
          confidence: 0.9
        });
      }

      return variations;
    } catch (error) {
      console.error('Claude content generation error:', error);
      throw new Error('Failed to generate content with Claude');
    }
  }

  async generateHashtags(content: string, platform: string): Promise<string[]> {
    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 200,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: `Generate 10 relevant hashtags for this ${platform} content. Return only hashtags, one per line:\n\n${content}`
        }]
      });

      const content_text = message.content[0].type === 'text' ? message.content[0].text : '';
      const hashtags = content_text
        .split('\n')
        .filter(line => line.trim().startsWith('#'))
        .map(hashtag => hashtag.trim());

      return hashtags.slice(0, 10);
    } catch (error) {
      console.error('Claude hashtag generation error:', error);
      return [];
    }
  }

  async analyzeSentiment(content: string): Promise<SentimentAnalysis> {
    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        temperature: 0.1,
        messages: [{
          role: 'user',
          content: `Analyze the sentiment of this content and return a JSON response with sentiment (positive/negative/neutral), score (-1 to 1), confidence (0 to 1), keywords array, and emotions object (joy, anger, fear, sadness, surprise with scores 0-1):\n\n${content}`
        }]
      });

      const result_text = message.content[0].type === 'text' ? message.content[0].text : '{}';
      const result = JSON.parse(result_text);
      
      return {
        sentiment: result.sentiment || 'neutral',
        score: result.score || 0,
        confidence: result.confidence || 0.5,
        keywords: result.keywords || [],
        emotions: result.emotions || { joy: 0, anger: 0, fear: 0, sadness: 0, surprise: 0 }
      };
    } catch (error) {
      console.error('Claude sentiment analysis error:', error);
      return {
        sentiment: 'neutral',
        score: 0,
        confidence: 0,
        keywords: [],
        emotions: { joy: 0, anger: 0, fear: 0, sadness: 0, surprise: 0 }
      };
    }
  }

  async improveContent(content: string, feedback: string): Promise<string> {
    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 500,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: `Improve this content based on the feedback provided:\n\nOriginal Content:\n${content}\n\nFeedback:\n${feedback}\n\nImproved Content:`
        }]
      });

      return message.content[0].type === 'text' ? message.content[0].text : content;
    } catch (error) {
      console.error('Claude content improvement error:', error);
      return content;
    }
  }

  private buildSystemPrompt(brand: any, request: ContentGenerationRequest): string {
    return `You are an expert social media content creator for ${brand.name}.

Brand Information:
- Company: ${brand.name}
- Industry: ${brand.industry || 'General'}
- Description: ${brand.description || 'A dynamic brand'}
- Voice: ${request.tone}
- Audience: ${request.targetAudience || 'General audience'}

Platform: ${request.platform}
Content Format: ${request.contentType}

Create engaging ${request.tone} content that:
- Aligns with the brand voice and values
- Is optimized for ${request.platform}
- Encourages audience engagement
- ${request.includeHashtags ? 'Includes strategic hashtags' : 'Excludes hashtags'}
- ${request.includeEmojis ? 'Uses emojis thoughtfully' : 'Avoids emojis'}

${this.getPlatformGuidelines(request.platform)}`;
  }

  private buildUserPrompt(request: ContentGenerationRequest): string {
    let prompt = `Generate ${request.contentType} content`;
    
    if (request.topic) {
      prompt += ` focused on: ${request.topic}`;
    }
    
    if (request.keywords?.length) {
      prompt += `\nIncorporate these keywords naturally: ${request.keywords.join(', ')}`;
    }
    
    if (request.customPrompt) {
      prompt += `\n\nSpecific requirements: ${request.customPrompt}`;
    }
    
    if (request.maxLength) {
      prompt += `\n\nCharacter limit: ${request.maxLength}`;
    }

    return prompt;
  }

  private getPlatformGuidelines(platform: string): string {
    const guidelines = {
      twitter: 'Keep it under 280 characters. Be punchy and memorable. Use trending topics when relevant.',
      instagram: 'Tell a visual story. Use line breaks for readability. Include a clear call-to-action.',
      linkedin: 'Provide professional value. Share insights or lessons learned. Use a conversational yet authoritative tone.',
      tiktok: 'Be trendy and authentic. Hook viewers immediately. Use popular hashtags and challenges.',
      facebook: 'Encourage conversation. Ask questions. Can be longer and more detailed.'
    };
    return guidelines[platform as keyof typeof guidelines] || '';
  }

  private extractHashtags(content: string): string[] {
    const hashtagRegex = /#[a-zA-Z0-9_]+/g;
    return content.match(hashtagRegex) || [];
  }

  private estimateEngagement(content: string, platform: string): number {
    let score = 55; // Claude typically performs slightly better
    
    // Platform-specific scoring
    if (platform === 'linkedin' && content.includes('insight')) score += 10;
    if (platform === 'twitter' && content.length <= 250) score += 5;
    
    // Content quality indicators
    const sentences = content.split(/[.!?]+/).length - 1;
    if (sentences >= 2 && sentences <= 4) score += 5;
    
    // Engagement triggers
    if (content.includes('?')) score += 8;
    if (content.toLowerCase().includes('you')) score += 5;
    
    return Math.min(score, 100);
  }

  private async getBrandContext(brandId: string): Promise<any> {
    return await prisma.brand.findUnique({
      where: { id: brandId },
      select: {
        name: true,
        description: true,
        industry: true,
        themeConfig: true
      }
    });
  }
}

export class AIService {
  private providers: Map<string, AIProvider>;

  constructor() {
    this.providers = new Map();
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('claude', new ClaudeProvider());
  }

  async generateContent(
    request: ContentGenerationRequest,
    preferredProvider?: string
  ): Promise<ContentVariation[]> {
    const provider = this.getProvider(preferredProvider);
    const variations = await provider.generateContent(request);

    // Store content queue entries
    await this.storeContentQueue(request.brandId, request.platform, variations);

    return variations;
  }

  async generateMixedContent(
    request: ContentGenerationRequest
  ): Promise<ContentVariation[]> {
    const providers = ['openai', 'claude'];
    const allVariations: ContentVariation[] = [];

    for (const providerName of providers) {
      try {
        const provider = this.getProvider(providerName);
        const variations = await provider.generateContent({
          ...request,
          // Reduce variations per provider when mixing
        });
        allVariations.push(...variations.slice(0, 3)); // 3 per provider
      } catch (error) {
        console.error(`Error with ${providerName} provider:`, error);
      }
    }

    // Sort by estimated engagement
    allVariations.sort((a, b) => b.estimatedEngagement - a.estimatedEngagement);

    await this.storeContentQueue(request.brandId, request.platform, allVariations);

    return allVariations.slice(0, 5); // Return top 5
  }

  async improveBestContent(
    brandId: string,
    platform: string,
    feedback: string
  ): Promise<ContentVariation[]> {
    // Get the best performing content for this brand/platform
    const bestContent = await prisma.contentQueue.findMany({
      where: {
        brandId,
        platform,
        status: 'approved'
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    const improvedVariations: ContentVariation[] = [];

    for (const content of bestContent) {
      try {
        const provider = this.getProvider(content.generationData?.aiProvider || 'openai');
        const improved = await provider.improveContent(
          content.selectedContent || '',
          feedback
        );

        improvedVariations.push({
          id: `improved-${Date.now()}-${content.id}`,
          content: improved,
          tone: 'improved',
          hashtags: [],
          estimatedEngagement: 80,
          aiProvider: 'mixed',
          confidence: 0.85
        });
      } catch (error) {
        console.error('Error improving content:', error);
      }
    }

    return improvedVariations;
  }

  async analyzeContentPerformance(
    brandId: string,
    days: number = 30
  ): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const posts = await prisma.post.findMany({
      where: {
        brandId,
        publishedAt: { gte: startDate },
        status: 'published'
      },
      include: {
        analytics: {
          orderBy: { date: 'desc' },
          take: 1
        }
      }
    });

    // Analyze which AI providers and content types perform best
    const performanceData = {
      byProvider: {} as Record<string, any>,
      byPlatform: {} as Record<string, any>,
      topPerformers: [] as any[],
      insights: [] as string[]
    };

    // Group by AI provider (if stored in platformData)
    posts.forEach(post => {
      const provider = post.platformData?.aiProvider || 'unknown';
      const engagement = post.analytics[0]?.engagementRate || 0;
      
      if (!performanceData.byProvider[provider]) {
        performanceData.byProvider[provider] = {
          count: 0,
          totalEngagement: 0,
          avgEngagement: 0
        };
      }
      
      performanceData.byProvider[provider].count++;
      performanceData.byProvider[provider].totalEngagement += engagement;
      performanceData.byProvider[provider].avgEngagement = 
        performanceData.byProvider[provider].totalEngagement / 
        performanceData.byProvider[provider].count;
    });

    return performanceData;
  }

  public getProvider(providerName?: string): AIProvider {
    const provider = this.providers.get(providerName || 'openai');
    if (!provider) {
      throw new Error(`AI provider ${providerName} not found`);
    }
    return provider;
  }

  private async storeContentQueue(
    brandId: string,
    platform: string,
    variations: ContentVariation[]
  ): Promise<void> {
    await prisma.contentQueue.create({
      data: {
        brandId,
        platform,
        generatedContent: variations,
        aiProvider: variations[0]?.aiProvider || 'mixed',
        generationData: {
          timestamp: new Date().toISOString(),
          variationCount: variations.length,
          providers: [...new Set(variations.map(v => v.aiProvider))]
        }
      }
    });
  }
}