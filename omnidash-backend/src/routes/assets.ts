import { Router } from 'express';
import { AssetsController } from '@/controllers/assets';
import rateLimit from 'express-rate-limit';
import Joi from 'joi';
import { validate } from '@/middleware/validation';

const router = Router();
const assetsController = new AssetsController();

// Rate limiting for asset requests
const assetsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Higher limit for asset requests
  message: 'Too many asset requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation schemas
const assetSchemas = {
  getIcons: {
    query: Joi.object({
      category: Joi.string().valid(
        'brand', 'social', 'features', 'navigation', 'actions', 'status', 'utility'
      ).optional(),
      format: Joi.string().valid('svg', 'dataurl').default('svg')
    })
  },
  getIcon: {
    params: Joi.object({
      iconName: Joi.string().required()
    }),
    query: Joi.object({
      size: Joi.number().integer().min(8).max(512).optional(),
      color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
      format: Joi.string().valid('svg', 'dataurl', 'json').default('svg')
    })
  },
  generatePlatformIcons: {
    body: Joi.object({
      platform: Joi.string().valid('web', 'ios', 'android', 'pwa').required(),
      sizes: Joi.array().items(Joi.number().integer().min(8).max(1024)).optional()
    })
  },
  getSocialAssets: {
    params: Joi.object({
      platform: Joi.string().valid('twitter', 'instagram', 'linkedin', 'facebook', 'tiktok', 'youtube', 'all').required()
    })
  },
  generateBrandKit: {
    body: Joi.object({
      includeIcons: Joi.boolean().default(true),
      includeColors: Joi.boolean().default(true),
      includeLogos: Joi.boolean().default(true)
    })
  }
};

// Apply rate limiting to all routes
router.use(assetsRateLimit);

// Public routes (no authentication required for brand assets)

// Get all icons or by category
router.get('/icons',
  validate(assetSchemas.getIcons),
  assetsController.getIcons.bind(assetsController)
);

// Get specific icon
router.get('/icons/:iconName',
  validate(assetSchemas.getIcon),
  assetsController.getIcon.bind(assetsController)
);

// Get brand colors and gradients
router.get('/colors',
  assetsController.getColors.bind(assetsController)
);

// Get brand manifest (design system info)
router.get('/manifest',
  assetsController.getManifest.bind(assetsController)
);

// Generate platform-specific icons
router.post('/icons/generate',
  validate(assetSchemas.generatePlatformIcons),
  assetsController.generatePlatformIcons.bind(assetsController)
);

// Get social media assets
router.get('/social/:platform',
  validate(assetSchemas.getSocialAssets),
  assetsController.getSocialAssets.bind(assetsController)
);

// Generate complete brand kit
router.post('/brand-kit',
  validate(assetSchemas.generateBrandKit),
  assetsController.generateBrandKit.bind(assetsController)
);

export default router;