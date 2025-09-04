import { Request, Response } from 'express';
import { AIService, ContentGenerationRequest } from '@/services/ai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const aiService = new AIService();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class AIController {
  async generateContent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        brandId,
        platform,
        contentType = 'post',
        tone = 'professional',
        topic,
        keywords,
        targetAudience,
        customPrompt,
        includeHashtags = true,
        includeEmojis = true,
        maxLength,
        provider,
        mixed = false
      } = req.body;

      const request: ContentGenerationRequest = {
        brandId,
        platform,
        contentType,
        tone,
        topic,
        keywords,
        targetAudience,
        customPrompt,
        includeHashtags,
        includeEmojis,
        maxLength
      };

      let variations;
      if (mixed) {
        variations = await aiService.generateMixedContent(request);
      } else {
        variations = await aiService.generateContent(request, provider);
      }

      res.json({
        success: true,
        variations,
        meta: {
          generatedAt: new Date().toISOString(),
          brandId,
          platform,
          provider: mixed ? 'mixed' : provider || 'openai',
          variationCount: variations.length
        }
      });
    } catch (error) {
      console.error('AI content generation error:', error);
      res.status(500).json({
        error: 'Failed to generate content',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async generateHashtags(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { content, platform, provider = 'openai' } = req.body;

      if (!content || !platform) {
        res.status(400).json({
          error: 'Content and platform are required'
        });
        return;
      }

      const aiProvider = aiService.getProvider(provider);
      const hashtags = await aiProvider.generateHashtags(content, platform);

      res.json({
        success: true,
        hashtags,
        platform,
        provider
      });
    } catch (error) {
      console.error('Hashtag generation error:', error);
      res.status(500).json({
        error: 'Failed to generate hashtags',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async analyzeSentiment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { content, provider = 'openai' } = req.body;

      if (!content) {
        res.status(400).json({
          error: 'Content is required'
        });
        return;
      }

      const aiProvider = aiService.getProvider(provider);
      const sentiment = await aiProvider.analyzeSentiment(content);

      res.json({
        success: true,
        sentiment,
        provider,
        analyzedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      res.status(500).json({
        error: 'Failed to analyze sentiment',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async improveContent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { content, feedback, provider = 'claude' } = req.body;

      if (!content || !feedback) {
        res.status(400).json({
          error: 'Content and feedback are required'
        });
        return;
      }

      const aiProvider = aiService.getProvider(provider);
      const improvedContent = await aiProvider.improveContent(content, feedback);

      res.json({
        success: true,
        original: content,
        improved: improvedContent,
        feedback,
        provider,
        improvedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Content improvement error:', error);
      res.status(500).json({
        error: 'Failed to improve content',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getContentQueue(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { 
        platform, 
        status = 'pending',
        page = 1, 
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const where: any = { brandId };
      if (platform) where.platform = platform;
      if (status) where.status = status;

      const [contentQueue, total] = await Promise.all([
        prisma.contentQueue.findMany({
          where,
          skip,
          take,
          orderBy: { [sortBy as string]: sortOrder },
          include: {
            brand: {
              select: {
                name: true,
                slug: true
              }
            }
          }
        }),
        prisma.contentQueue.count({ where })
      ]);

      res.json({
        success: true,
        contentQueue,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      });
    } catch (error) {
      console.error('Get content queue error:', error);
      res.status(500).json({
        error: 'Failed to fetch content queue'
      });
    }
  }

  async approveContent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { queueId } = req.params;
      const { selectedContent, variationId, feedback } = req.body;
      const userId = req.user!.id;

      const queueItem = await prisma.contentQueue.findUnique({
        where: { id: queueId }
      });

      if (!queueItem) {
        res.status(404).json({
          error: 'Content queue item not found'
        });
        return;
      }

      const updatedQueue = await prisma.contentQueue.update({
        where: { id: queueId },
        data: {
          status: 'approved',
          approvalStatus: 'approved',
          approvedBy: userId,
          selectedContent,
          generationData: {
            ...queueItem.generationData as any,
            approvedVariationId: variationId,
            approvalFeedback: feedback,
            approvedAt: new Date().toISOString()
          }
        }
      });

      res.json({
        success: true,
        contentQueue: updatedQueue
      });
    } catch (error) {
      console.error('Approve content error:', error);
      res.status(500).json({
        error: 'Failed to approve content'
      });
    }
  }

  async rejectContent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { queueId } = req.params;
      const { feedback, regenerate = false } = req.body;
      const userId = req.user!.id;

      const queueItem = await prisma.contentQueue.findUnique({
        where: { id: queueId }
      });

      if (!queueItem) {
        res.status(404).json({
          error: 'Content queue item not found'
        });
        return;
      }

      if (regenerate && feedback) {
        // Generate improved content based on feedback
        const improvedVariations = await aiService.improveBestContent(
          queueItem.brandId,
          queueItem.platform,
          feedback
        );

        await prisma.contentQueue.update({
          where: { id: queueId },
          data: {
            generatedContent: improvedVariations,
            status: 'pending',
            approvalStatus: 'pending',
            generationData: {
              ...queueItem.generationData as any,
              rejectionFeedback: feedback,
              regeneratedAt: new Date().toISOString(),
              regenerationCount: ((queueItem.generationData as any)?.regenerationCount || 0) + 1
            }
          }
        });

        res.json({
          success: true,
          message: 'Content regenerated based on feedback',
          variations: improvedVariations
        });
      } else {
        await prisma.contentQueue.update({
          where: { id: queueId },
          data: {
            status: 'rejected',
            approvalStatus: 'rejected',
            approvedBy: userId,
            generationData: {
              ...queueItem.generationData as any,
              rejectionFeedback: feedback,
              rejectedAt: new Date().toISOString()
            }
          }
        });

        res.json({
          success: true,
          message: 'Content rejected'
        });
      }
    } catch (error) {
      console.error('Reject content error:', error);
      res.status(500).json({
        error: 'Failed to reject content'
      });
    }
  }

  async getContentTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { category, platform } = req.query;

      const where: any = { brandId };
      if (category) where.category = category;
      if (platform) {
        where.platforms = {
          has: platform
        };
      }

      const templates = await prisma.contentTemplate.findMany({
        where,
        orderBy: [
          { usageCount: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      res.json({
        success: true,
        templates
      });
    } catch (error) {
      console.error('Get content templates error:', error);
      res.status(500).json({
        error: 'Failed to fetch content templates'
      });
    }
  }

  async createContentTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const {
        name,
        description,
        category,
        template,
        variables,
        platforms
      } = req.body;

      const contentTemplate = await prisma.contentTemplate.create({
        data: {
          brandId,
          name,
          description,
          category,
          template,
          variables,
          platforms
        }
      });

      res.status(201).json({
        success: true,
        template: contentTemplate
      });
    } catch (error) {
      console.error('Create content template error:', error);
      res.status(500).json({
        error: 'Failed to create content template'
      });
    }
  }

  async generateFromTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const { variables, platform, provider = 'openai' } = req.body;

      const template = await prisma.contentTemplate.findUnique({
        where: { id: templateId },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              industry: true,
              description: true
            }
          }
        }
      });

      if (!template) {
        res.status(404).json({
          error: 'Template not found'
        });
        return;
      }

      // Replace variables in template
      let processedTemplate = template.template;
      if (variables) {
        Object.entries(variables).forEach(([key, value]) => {
          processedTemplate = processedTemplate.replace(
            new RegExp(`{{${key}}}`, 'g'),
            value as string
          );
        });
      }

      // Generate content using the processed template as custom prompt
      const request: ContentGenerationRequest = {
        brandId: template.brandId,
        platform,
        contentType: 'post',
        tone: 'professional',
        customPrompt: processedTemplate
      };

      const variations = await aiService.generateContent(request, provider);

      // Update template usage count
      await prisma.contentTemplate.update({
        where: { id: templateId },
        data: {
          usageCount: template.usageCount + 1
        }
      });

      res.json({
        success: true,
        template: {
          id: template.id,
          name: template.name,
          processedContent: processedTemplate
        },
        variations,
        variables
      });
    } catch (error) {
      console.error('Generate from template error:', error);
      res.status(500).json({
        error: 'Failed to generate content from template'
      });
    }
  }

  async getAIAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { days = 30 } = req.query;

      const analytics = await aiService.analyzeContentPerformance(
        brandId,
        parseInt(days as string)
      );

      res.json({
        success: true,
        analytics,
        period: {
          days: parseInt(days as string),
          endDate: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Get AI analytics error:', error);
      res.status(500).json({
        error: 'Failed to fetch AI analytics'
      });
    }
  }

  async batchGenerateContent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        brandId,
        requests, // Array of ContentGenerationRequest objects
        provider = 'mixed'
      } = req.body;

      if (!Array.isArray(requests) || requests.length === 0) {
        res.status(400).json({
          error: 'Requests array is required and must not be empty'
        });
        return;
      }

      if (requests.length > 10) {
        res.status(400).json({
          error: 'Maximum 10 requests per batch'
        });
        return;
      }

      const results = [];

      for (const request of requests) {
        try {
          const variations = provider === 'mixed' 
            ? await aiService.generateMixedContent({ ...request, brandId })
            : await aiService.generateContent({ ...request, brandId }, provider);
          
          results.push({
            success: true,
            request,
            variations,
            generatedAt: new Date().toISOString()
          });
        } catch (error) {
          results.push({
            success: false,
            request,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      res.json({
        success: true,
        results,
        summary: {
          total: requests.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      });
    } catch (error) {
      console.error('Batch generate content error:', error);
      res.status(500).json({
        error: 'Failed to batch generate content'
      });
    }
  }
}