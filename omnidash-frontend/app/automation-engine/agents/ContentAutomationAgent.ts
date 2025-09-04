import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface ContentTemplate {
  id: string;
  name: string;
  type: 'post' | 'story' | 'article' | 'email' | 'video-script';
  template: string;
  variables: ContentVariable[];
  platforms: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'list' | 'image' | 'url';
  required: boolean;
  defaultValue?: any;
  description?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
  };
}

export interface ContentGenerationRequest {
  id: string;
  templateId?: string;
  prompt: string;
  contentType: 'post' | 'story' | 'article' | 'email' | 'video-script';
  targetPlatforms: string[];
  tone?: 'professional' | 'casual' | 'friendly' | 'formal' | 'creative' | 'humorous';
  length?: 'short' | 'medium' | 'long';
  keywords?: string[];
  hashtags?: string[];
  variables?: Record<string, any>;
  brandGuidelines?: {
    voice: string;
    restrictions: string[];
    preferences: string[];
  };
  scheduledFor?: Date;
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  completedAt?: Date;
}

export interface GeneratedContent {
  id: string;
  requestId: string;
  platform: string;
  contentType: string;
  title?: string;
  content: string;
  hashtags: string[];
  mentions: string[];
  media?: ContentMedia[];
  metadata: {
    wordCount: number;
    characterCount: number;
    estimatedReadTime?: number;
    sentiment?: 'positive' | 'neutral' | 'negative';
    topics: string[];
  };
  variations?: ContentVariation[];
  createdAt: Date;
}

export interface ContentMedia {
  id: string;
  type: 'image' | 'video' | 'gif' | 'audio';
  url?: string;
  altText?: string;
  caption?: string;
  metadata: Record<string, any>;
}

export interface ContentVariation {
  id: string;
  content: string;
  score: number;
  reason: string;
}

export interface AIProvider {
  name: string;
  apiKey: string;
  endpoint?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export class ContentAutomationAgent extends EventEmitter {
  private templates: Map<string, ContentTemplate> = new Map();
  private requests: Map<string, ContentGenerationRequest> = new Map();
  private generatedContent: Map<string, GeneratedContent> = new Map();
  private aiProviders: Map<string, AIProvider> = new Map();
  private isProcessing: boolean = false;
  private processingQueue: ContentGenerationRequest[] = [];

  constructor() {
    super();
    this.initialize();
  }

  private initialize() {
    this.setupDefaultTemplates();
    this.startProcessingLoop();
  }

  private setupDefaultTemplates() {
    // Social Media Post Template
    this.createTemplate({
      name: 'Social Media Post',
      type: 'post',
      template: `🎯 {{topic}}

{{content}}

#{{hashtags}}

{{cta}}`,
      variables: [
        { name: 'topic', type: 'text', required: true, description: 'Main topic or hook' },
        { name: 'content', type: 'text', required: true, description: 'Main content body' },
        { name: 'hashtags', type: 'list', required: false, description: 'Relevant hashtags' },
        { name: 'cta', type: 'text', required: false, description: 'Call to action' }
      ],
      platforms: ['twitter', 'facebook', 'instagram', 'linkedin'],
      metadata: { maxLength: 280 }
    });

    // Email Template
    this.createTemplate({
      name: 'Marketing Email',
      type: 'email',
      template: `Subject: {{subject}}

Hi {{name}},

{{opening}}

{{main_content}}

{{closing}}

Best regards,
{{sender_name}}

{{unsubscribe_link}}`,
      variables: [
        { name: 'subject', type: 'text', required: true, description: 'Email subject line' },
        { name: 'name', type: 'text', required: true, description: 'Recipient name' },
        { name: 'opening', type: 'text', required: true, description: 'Opening paragraph' },
        { name: 'main_content', type: 'text', required: true, description: 'Main email content' },
        { name: 'closing', type: 'text', required: true, description: 'Closing paragraph' },
        { name: 'sender_name', type: 'text', required: true, description: 'Sender name' }
      ],
      platforms: ['email'],
      metadata: { format: 'html' }
    });

    // Article Template
    this.createTemplate({
      name: 'Blog Article',
      type: 'article',
      template: `# {{title}}

## Introduction
{{introduction}}

## {{section_1_title}}
{{section_1_content}}

## {{section_2_title}}
{{section_2_content}}

## {{section_3_title}}
{{section_3_content}}

## Conclusion
{{conclusion}}

---
*Tags: {{tags}}*`,
      variables: [
        { name: 'title', type: 'text', required: true, description: 'Article title' },
        { name: 'introduction', type: 'text', required: true, description: 'Introduction paragraph' },
        { name: 'section_1_title', type: 'text', required: true, description: 'First section title' },
        { name: 'section_1_content', type: 'text', required: true, description: 'First section content' },
        { name: 'section_2_title', type: 'text', required: true, description: 'Second section title' },
        { name: 'section_2_content', type: 'text', required: true, description: 'Second section content' },
        { name: 'section_3_title', type: 'text', required: true, description: 'Third section title' },
        { name: 'section_3_content', type: 'text', required: true, description: 'Third section content' },
        { name: 'conclusion', type: 'text', required: true, description: 'Conclusion paragraph' },
        { name: 'tags', type: 'list', required: false, description: 'Article tags' }
      ],
      platforms: ['blog', 'medium', 'linkedin'],
      metadata: { estimatedLength: 1500 }
    });
  }

  public createTemplate(template: Omit<ContentTemplate, 'id' | 'createdAt' | 'updatedAt'>): string {
    const templateId = uuidv4();
    const fullTemplate: ContentTemplate = {
      ...template,
      id: templateId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.templates.set(templateId, fullTemplate);
    this.emit('template:created', fullTemplate);
    
    console.log(`📝 Content template created: ${template.name}`);
    return templateId;
  }

  public async generateContent(
    request: Omit<ContentGenerationRequest, 'id' | 'status' | 'createdAt'>
  ): Promise<string> {
    const requestId = uuidv4();
    const fullRequest: ContentGenerationRequest = {
      ...request,
      id: requestId,
      status: 'pending',
      createdAt: new Date()
    };

    this.requests.set(requestId, fullRequest);
    this.processingQueue.push(fullRequest);
    
    this.emit('content:requested', fullRequest);
    console.log(`🎯 Content generation requested: ${requestId}`);
    
    return requestId;
  }

  private async startProcessingLoop() {
    this.isProcessing = true;

    while (this.isProcessing) {
      if (this.processingQueue.length > 0) {
        const request = this.processingQueue.shift();
        if (request) {
          await this.processContentRequest(request);
        }
      }
      
      // Small delay to prevent CPU overload
      await this.delay(1000);
    }
  }

  private async processContentRequest(request: ContentGenerationRequest) {
    try {
      request.status = 'generating';
      this.requests.set(request.id, request);
      this.emit('content:generating', request);

      console.log(`⚡ Generating content for request: ${request.id}`);

      // Generate content for each target platform
      const generatedContents: GeneratedContent[] = [];

      for (const platform of request.targetPlatforms) {
        const content = await this.generatePlatformContent(request, platform);
        generatedContents.push(content);
        this.generatedContent.set(content.id, content);
      }

      request.status = 'completed';
      request.completedAt = new Date();
      this.requests.set(request.id, request);

      this.emit('content:completed', { request, content: generatedContents });
      console.log(`✅ Content generation completed: ${request.id}`);

    } catch (error) {
      request.status = 'failed';
      request.completedAt = new Date();
      this.requests.set(request.id, request);

      this.emit('content:failed', { request, error });
      console.error(`❌ Content generation failed: ${request.id}`, error);
    }
  }

  private async generatePlatformContent(
    request: ContentGenerationRequest,
    platform: string
  ): Promise<GeneratedContent> {
    // Simulate AI content generation
    // In production, integrate with OpenAI, Claude, or other AI services
    
    const platformSpecs = this.getPlatformSpecifications(platform);
    const template = request.templateId ? this.templates.get(request.templateId) : null;
    
    let generatedText = '';
    let title = '';

    if (template) {
      // Use template-based generation
      generatedText = await this.generateFromTemplate(template, request);
    } else {
      // Use prompt-based generation
      generatedText = await this.generateFromPrompt(request, platformSpecs);
    }

    // Extract title if it's an article
    if (request.contentType === 'article') {
      const lines = generatedText.split('\n');
      title = lines.find(line => line.startsWith('# '))?.replace('# ', '') || '';
    }

    // Generate hashtags and mentions
    const hashtags = this.extractHashtags(generatedText, request.keywords || []);
    const mentions = this.extractMentions(generatedText);

    // Analyze content
    const metadata = {
      wordCount: this.countWords(generatedText),
      characterCount: generatedText.length,
      estimatedReadTime: Math.ceil(this.countWords(generatedText) / 200), // 200 WPM
      sentiment: this.analyzeSentiment(generatedText),
      topics: this.extractTopics(generatedText)
    };

    // Generate variations
    const variations = await this.generateVariations(generatedText, request);

    const content: GeneratedContent = {
      id: uuidv4(),
      requestId: request.id,
      platform,
      contentType: request.contentType,
      title,
      content: generatedText,
      hashtags,
      mentions,
      metadata,
      variations,
      createdAt: new Date()
    };

    return content;
  }

  private async generateFromTemplate(
    template: ContentTemplate,
    request: ContentGenerationRequest
  ): Promise<string> {
    let content = template.template;
    const variables = request.variables || {};

    // Replace template variables
    for (const variable of template.variables) {
      const value = variables[variable.name] || variable.defaultValue || '';
      const placeholder = `{{${variable.name}}}`;
      content = content.replace(new RegExp(placeholder, 'g'), String(value));
    }

    // Use AI to enhance the content based on the prompt
    if (request.prompt) {
      content = await this.enhanceContentWithAI(content, request);
    }

    return content;
  }

  private async generateFromPrompt(
    request: ContentGenerationRequest,
    platformSpecs: any
  ): Promise<string> {
    // Simulate AI generation
    const { tone = 'professional', length = 'medium' } = request;
    
    let baseContent = '';

    switch (request.contentType) {
      case 'post':
        baseContent = this.generateSocialPost(request, platformSpecs);
        break;
      case 'article':
        baseContent = this.generateArticle(request);
        break;
      case 'email':
        baseContent = this.generateEmail(request);
        break;
      case 'video-script':
        baseContent = this.generateVideoScript(request);
        break;
      default:
        baseContent = `Generated content for: ${request.prompt}\n\nTone: ${tone}\nLength: ${length}`;
    }

    return baseContent;
  }

  private generateSocialPost(request: ContentGenerationRequest, platformSpecs: any): string {
    const { prompt, tone, keywords = [] } = request;
    
    // Simulate different content based on platform and tone
    let content = `🚀 ${prompt}\n\n`;
    
    if (tone === 'professional') {
      content += 'This innovative approach demonstrates significant value in today\'s competitive landscape.';
    } else if (tone === 'casual') {
      content += 'Pretty excited about this! What do you think?';
    } else if (tone === 'creative') {
      content += '✨ Imagine the possibilities when innovation meets creativity! 🌟';
    }

    if (keywords.length > 0) {
      content += `\n\n#${keywords.join(' #')}`;
    }

    return content;
  }

  private generateArticle(request: ContentGenerationRequest): string {
    const { prompt } = request;
    
    return `# ${prompt}

## Introduction
In today's rapidly evolving digital landscape, understanding ${prompt.toLowerCase()} has become increasingly important for businesses and individuals alike.

## Key Insights
This comprehensive analysis reveals several important factors that contribute to success in this area.

## Implementation Strategies
Based on current best practices, here are the recommended approaches:

1. **Strategic Planning**: Develop a clear roadmap
2. **Resource Allocation**: Ensure adequate resources
3. **Performance Monitoring**: Track key metrics

## Future Considerations
Looking ahead, several trends are likely to shape the future of ${prompt.toLowerCase()}.

## Conclusion
The implications of these findings suggest that organizations should prioritize ${prompt.toLowerCase()} in their strategic planning processes.`;
  }

  private generateEmail(request: ContentGenerationRequest): string {
    const { prompt } = request;
    
    return `Subject: ${prompt}

Hello,

I hope this message finds you well.

${prompt} represents an exciting opportunity for growth and innovation. Our team has been working diligently to develop solutions that address your specific needs.

Key benefits include:
• Enhanced efficiency
• Cost optimization
• Improved outcomes

I'd love to schedule a brief call to discuss how this can benefit your organization.

Best regards,
[Your Name]`;
  }

  private generateVideoScript(request: ContentGenerationRequest): string {
    const { prompt } = request;
    
    return `VIDEO SCRIPT: ${prompt}

[INTRO - 0:00-0:15]
Host: "Welcome back to our channel! Today we're diving deep into ${prompt.toLowerCase()}."

[HOOK - 0:15-0:30]
"Did you know that ${prompt.toLowerCase()} can significantly impact your success? Let's explore why."

[MAIN CONTENT - 0:30-2:00]
"Here are the key points you need to understand:

1. First important point
2. Second crucial element  
3. Third essential factor"

[CALL TO ACTION - 2:00-2:15]
"If you found this helpful, make sure to subscribe and hit the notification bell!"

[OUTRO - 2:15-2:30]
"Thanks for watching, and we'll see you in the next video!"`;
  }

  private async enhanceContentWithAI(content: string, request: ContentGenerationRequest): Promise<string> {
    // Simulate AI enhancement
    // In production, call actual AI API
    return content + '\n\n[AI Enhanced based on: ' + request.prompt + ']';
  }

  private async generateVariations(content: string, request: ContentGenerationRequest): Promise<ContentVariation[]> {
    // Generate 2-3 variations of the content
    const variations: ContentVariation[] = [];
    
    // Short version
    variations.push({
      id: uuidv4(),
      content: content.substring(0, Math.floor(content.length * 0.7)),
      score: 0.8,
      reason: 'Shorter version for better engagement'
    });

    // Formal version
    if (request.tone !== 'formal') {
      const formalContent = content.replace(/🚀|✨|🌟/g, '').replace(/!/g, '.');
      variations.push({
        id: uuidv4(),
        content: formalContent,
        score: 0.7,
        reason: 'More formal tone'
      });
    }

    return variations;
  }

  private getPlatformSpecifications(platform: string): any {
    const specs: Record<string, any> = {
      twitter: { maxLength: 280, supportsImages: true, supportsVideo: true },
      facebook: { maxLength: 2000, supportsImages: true, supportsVideo: true },
      instagram: { maxLength: 2200, supportsImages: true, supportsVideo: true, requiresImage: true },
      linkedin: { maxLength: 3000, supportsImages: true, supportsVideo: true },
      email: { maxLength: 10000, supportsHtml: true },
      blog: { maxLength: 50000, supportsHtml: true, supportsImages: true }
    };

    return specs[platform] || { maxLength: 1000 };
  }

  private extractHashtags(content: string, keywords: string[]): string[] {
    const existingHashtags = content.match(/#\w+/g) || [];
    const keywordHashtags = keywords.map(keyword => `#${keyword.replace(/\s/g, '')}`);
    
    return [...new Set([...existingHashtags, ...keywordHashtags])];
  }

  private extractMentions(content: string): string[] {
    return content.match(/@\w+/g) || [];
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    // Simplified sentiment analysis
    const positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointing'];
    
    const words = text.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private extractTopics(text: string): string[] {
    // Simple topic extraction based on common keywords
    const topics: string[] = [];
    const topicKeywords = {
      'technology': ['tech', 'digital', 'software', 'ai', 'automation'],
      'business': ['business', 'strategy', 'growth', 'revenue', 'market'],
      'marketing': ['marketing', 'brand', 'campaign', 'content', 'social'],
      'finance': ['finance', 'money', 'investment', 'profit', 'cost']
    };
    
    const lowerText = text.toLowerCase();
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        topics.push(topic);
      }
    }
    
    return topics;
  }

  // Public methods for configuration
  public addAIProvider(name: string, config: Omit<AIProvider, 'name'>): void {
    this.aiProviders.set(name, { name, ...config });
    console.log(`🤖 AI provider added: ${name}`);
  }

  public getTemplate(templateId: string): ContentTemplate | undefined {
    return this.templates.get(templateId);
  }

  public getTemplates(): ContentTemplate[] {
    return Array.from(this.templates.values());
  }

  public getTemplatesByType(type: ContentTemplate['type']): ContentTemplate[] {
    return this.getTemplates().filter(template => template.type === type);
  }

  public getRequest(requestId: string): ContentGenerationRequest | undefined {
    return this.requests.get(requestId);
  }

  public getRequestsByStatus(status: ContentGenerationRequest['status']): ContentGenerationRequest[] {
    return Array.from(this.requests.values()).filter(request => request.status === status);
  }

  public getGeneratedContent(contentId: string): GeneratedContent | undefined {
    return this.generatedContent.get(contentId);
  }

  public getContentByRequest(requestId: string): GeneratedContent[] {
    return Array.from(this.generatedContent.values())
      .filter(content => content.requestId === requestId);
  }

  public cancelRequest(requestId: string): boolean {
    const request = this.requests.get(requestId);
    if (!request || request.status === 'completed') return false;

    request.status = 'cancelled';
    request.completedAt = new Date();
    this.requests.set(requestId, request);

    // Remove from processing queue
    const queueIndex = this.processingQueue.findIndex(req => req.id === requestId);
    if (queueIndex !== -1) {
      this.processingQueue.splice(queueIndex, 1);
    }

    this.emit('content:cancelled', request);
    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public stop(): void {
    this.isProcessing = false;
  }
}

export const contentAgent = new ContentAutomationAgent();