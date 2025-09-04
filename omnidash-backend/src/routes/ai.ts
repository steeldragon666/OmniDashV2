import { Router } from 'express';
import { AIController } from '@/controllers/ai';
import { authenticateToken, requireBrandAccess } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import rateLimit from 'express-rate-limit';
import Joi from 'joi';

const router = Router();
const aiController = new AIController();

// Rate limiting for AI operations (more restrictive due to API costs)
const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 AI requests per 15 minutes
  message: 'Too many AI requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const expensiveAIRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit expensive operations to 10 per minute
  message: 'Rate limit exceeded for AI operations, please try again in a minute.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation schemas
const aiSchemas = {
  generateContent: {
    body: Joi.object({
      brandId: Joi.string().required(),
      platform: Joi.string().valid('twitter', 'instagram', 'linkedin', 'tiktok', 'facebook').required(),
      contentType: Joi.string().valid('post', 'story', 'reel', 'article', 'thread').default('post'),
      tone: Joi.string().valid('professional', 'casual', 'humorous', 'inspirational', 'educational').default('professional'),
      topic: Joi.string().max(200).optional(),
      keywords: Joi.array().items(Joi.string().max(50)).max(10).optional(),
      targetAudience: Joi.string().max(200).optional(),
      customPrompt: Joi.string().max(1000).optional(),
      includeHashtags: Joi.boolean().default(true),
      includeEmojis: Joi.boolean().default(true),
      maxLength: Joi.number().integer().min(10).max(2000).optional(),
      provider: Joi.string().valid('openai', 'claude').optional(),
      mixed: Joi.boolean().default(false)
    })
  },
  generateHashtags: {
    body: Joi.object({
      content: Joi.string().min(10).max(2000).required(),
      platform: Joi.string().valid('twitter', 'instagram', 'linkedin', 'tiktok', 'facebook').required(),
      provider: Joi.string().valid('openai', 'claude').default('openai')
    })
  },
  analyzeSentiment: {
    body: Joi.object({
      content: Joi.string().min(1).max(2000).required(),
      provider: Joi.string().valid('openai', 'claude').default('openai')
    })
  },
  improveContent: {
    body: Joi.object({
      content: Joi.string().min(10).max(2000).required(),
      feedback: Joi.string().min(5).max(500).required(),
      provider: Joi.string().valid('openai', 'claude').default('claude')
    })
  },
  approveContent: {
    params: Joi.object({
      queueId: Joi.string().required()
    }),
    body: Joi.object({
      selectedContent: Joi.string().min(1).max(2000).required(),
      variationId: Joi.string().optional(),
      feedback: Joi.string().max(500).optional()
    })
  },
  rejectContent: {
    params: Joi.object({
      queueId: Joi.string().required()
    }),
    body: Joi.object({
      feedback: Joi.string().min(5).max(500).required(),
      regenerate: Joi.boolean().default(false)
    })
  },
  createTemplate: {
    params: Joi.object({
      brandId: Joi.string().required()
    }),
    body: Joi.object({
      name: Joi.string().min(2).max(100).required(),
      description: Joi.string().max(500).optional(),
      category: Joi.string().max(50).optional(),
      template: Joi.string().min(10).max(2000).required(),
      variables: Joi.object().optional(),
      platforms: Joi.array().items(
        Joi.string().valid('twitter', 'instagram', 'linkedin', 'tiktok', 'facebook')
      ).min(1).required()
    })
  },
  generateFromTemplate: {
    params: Joi.object({
      templateId: Joi.string().required()
    }),
    body: Joi.object({
      variables: Joi.object().optional(),
      platform: Joi.string().valid('twitter', 'instagram', 'linkedin', 'tiktok', 'facebook').required(),
      provider: Joi.string().valid('openai', 'claude').default('openai')
    })
  },
  batchGenerate: {
    body: Joi.object({
      brandId: Joi.string().required(),
      requests: Joi.array().items(
        Joi.object({
          platform: Joi.string().valid('twitter', 'instagram', 'linkedin', 'tiktok', 'facebook').required(),
          contentType: Joi.string().valid('post', 'story', 'reel', 'article', 'thread').default('post'),
          tone: Joi.string().valid('professional', 'casual', 'humorous', 'inspirational', 'educational').default('professional'),
          topic: Joi.string().max(200).optional(),
          keywords: Joi.array().items(Joi.string().max(50)).max(10).optional(),
          targetAudience: Joi.string().max(200).optional(),
          customPrompt: Joi.string().max(1000).optional(),
          includeHashtags: Joi.boolean().default(true),
          includeEmojis: Joi.boolean().default(true),
          maxLength: Joi.number().integer().min(10).max(2000).optional()
        })
      ).min(1).max(10).required(),
      provider: Joi.string().valid('openai', 'claude', 'mixed').default('mixed')
    })
  }
};

// Apply authentication to all routes
router.use(authenticateToken);

// Content generation routes
router.post('/generate',
  aiRateLimit,
  validate(aiSchemas.generateContent),
  requireBrandAccess('editor'),
  aiController.generateContent.bind(aiController)
);

router.post('/generate/batch',
  expensiveAIRateLimit,
  validate(aiSchemas.batchGenerate),
  requireBrandAccess('editor'),
  aiController.batchGenerateContent.bind(aiController)
);

router.post('/hashtags',
  aiRateLimit,
  validate(aiSchemas.generateHashtags),
  aiController.generateHashtags.bind(aiController)
);

router.post('/sentiment',
  aiRateLimit,
  validate(aiSchemas.analyzeSentiment),
  aiController.analyzeSentiment.bind(aiController)
);

router.post('/improve',
  aiRateLimit,
  validate(aiSchemas.improveContent),
  aiController.improveContent.bind(aiController)
);

// Content queue management
router.get('/queue/:brandId',
  requireBrandAccess('viewer'),
  aiController.getContentQueue.bind(aiController)
);

router.put('/queue/:queueId/approve',
  validate(aiSchemas.approveContent),
  aiController.approveContent.bind(aiController)
);

router.put('/queue/:queueId/reject',
  validate(aiSchemas.rejectContent),
  aiController.rejectContent.bind(aiController)
);

// Content templates
router.get('/templates/:brandId',
  requireBrandAccess('viewer'),
  aiController.getContentTemplates.bind(aiController)
);

router.post('/templates/:brandId',
  validate(aiSchemas.createTemplate),
  requireBrandAccess('editor'),
  aiController.createContentTemplate.bind(aiController)
);

router.post('/templates/:templateId/generate',
  aiRateLimit,
  validate(aiSchemas.generateFromTemplate),
  aiController.generateFromTemplate.bind(aiController)
);

// Analytics
router.get('/analytics/:brandId',
  requireBrandAccess('viewer'),
  aiController.getAIAnalytics.bind(aiController)
);

export default router;