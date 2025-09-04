import { Router } from 'express';
import { AnalyticsController } from '@/controllers/analytics';
import { authenticateToken, requireBrandAccess } from '@/middleware/auth';
import rateLimit from 'express-rate-limit';
import Joi from 'joi';
import { validate } from '@/middleware/validation';

const router = Router();
const analyticsController = new AnalyticsController();

// Rate limiting for analytics operations
const analyticsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per 15 minutes
  message: 'Too many analytics requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation schemas
const analyticsSchemas = {
  dashboard: {
    params: Joi.object({
      brandId: Joi.string().required()
    }),
    query: Joi.object({
      days: Joi.number().integer().min(1).max(365).optional()
    })
  },
  contentAnalytics: {
    params: Joi.object({
      brandId: Joi.string().required()
    }),
    query: Joi.object({
      days: Joi.number().integer().min(1).max(365).optional()
    })
  },
  platformMetrics: {
    params: Joi.object({
      brandId: Joi.string().required()
    }),
    query: Joi.object({
      platform: Joi.string().valid('twitter', 'instagram', 'linkedin', 'tiktok', 'facebook').optional(),
      days: Joi.number().integer().min(1).max(365).optional()
    })
  },
  postPerformance: {
    params: Joi.object({
      postId: Joi.string().required()
    })
  },
  generateReport: {
    params: Joi.object({
      brandId: Joi.string().required()
    }),
    body: Joi.object({
      type: Joi.string().valid('daily', 'weekly', 'monthly').default('weekly'),
      format: Joi.string().valid('json', 'pdf').default('json'),
      email: Joi.string().email().optional(),
      includeComparison: Joi.boolean().default(false)
    })
  },
  refreshMetrics: {
    params: Joi.object({
      brandId: Joi.string().required()
    }),
    body: Joi.object({
      platforms: Joi.array().items(
        Joi.string().valid('twitter', 'instagram', 'linkedin', 'tiktok', 'facebook')
      ).optional()
    })
  },
  engagementTrends: {
    params: Joi.object({
      brandId: Joi.string().required()
    }),
    query: Joi.object({
      days: Joi.number().integer().min(1).max(365).optional(),
      platform: Joi.string().valid('twitter', 'instagram', 'linkedin', 'tiktok', 'facebook').optional()
    })
  },
  hashtagAnalytics: {
    params: Joi.object({
      brandId: Joi.string().required()
    }),
    query: Joi.object({
      days: Joi.number().integer().min(1).max(365).optional(),
      limit: Joi.number().integer().min(5).max(100).optional()
    })
  }
};

// Apply authentication to all routes
router.use(authenticateToken);
router.use(analyticsRateLimit);

// Dashboard metrics
router.get('/dashboard/:brandId',
  validate(analyticsSchemas.dashboard),
  requireBrandAccess('viewer'),
  analyticsController.getDashboard.bind(analyticsController)
);

// Content analytics
router.get('/content/:brandId',
  validate(analyticsSchemas.contentAnalytics),
  requireBrandAccess('viewer'),
  analyticsController.getContentAnalytics.bind(analyticsController)
);

// Audience insights
router.get('/audience/:brandId',
  requireBrandAccess('viewer'),
  analyticsController.getAudienceInsights.bind(analyticsController)
);

// Platform-specific metrics
router.get('/platforms/:brandId',
  validate(analyticsSchemas.platformMetrics),
  requireBrandAccess('viewer'),
  analyticsController.getPlatformMetrics.bind(analyticsController)
);

// Individual post performance
router.get('/posts/:postId',
  validate(analyticsSchemas.postPerformance),
  analyticsController.getPostPerformance.bind(analyticsController)
);

// Engagement trends
router.get('/trends/:brandId',
  validate(analyticsSchemas.engagementTrends),
  requireBrandAccess('viewer'),
  analyticsController.getEngagementTrends.bind(analyticsController)
);

// Hashtag analytics
router.get('/hashtags/:brandId',
  validate(analyticsSchemas.hashtagAnalytics),
  requireBrandAccess('viewer'),
  analyticsController.getHashtagAnalytics.bind(analyticsController)
);

// Competitor analysis
router.get('/competitors/:brandId',
  requireBrandAccess('viewer'),
  analyticsController.getCompetitorAnalysis.bind(analyticsController)
);

// Report generation
router.post('/reports/:brandId',
  validate(analyticsSchemas.generateReport),
  requireBrandAccess('admin'),
  analyticsController.generateReport.bind(analyticsController)
);

// Metrics refresh
router.post('/refresh/:brandId',
  validate(analyticsSchemas.refreshMetrics),
  requireBrandAccess('admin'),
  analyticsController.refreshMetrics.bind(analyticsController)
);

export default router;