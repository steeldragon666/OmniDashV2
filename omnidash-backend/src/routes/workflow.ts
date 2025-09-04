import { Router } from 'express';
import { WorkflowController } from '@/controllers/workflow';
import { authenticateToken, requireBrandAccess } from '@/middleware/auth';
import rateLimit from 'express-rate-limit';
import Joi from 'joi';
import { validate } from '@/middleware/validation';

const router = Router();
const workflowController = new WorkflowController();

// Rate limiting for workflow operations
const workflowRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many workflow requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const workflowExecuteRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit workflow executions to 10 per minute
  message: 'Too many workflow executions, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation schemas
const workflowSchemas = {
  create: {
    params: Joi.object({
      brandId: Joi.string().required()
    }),
    body: Joi.object({
      name: Joi.string().min(2).max(100).required(),
      description: Joi.string().max(500).optional(),
      trigger: Joi.object({
        type: Joi.string().valid('schedule', 'webhook', 'manual', 'event').required(),
        config: Joi.object().required()
      }).required(),
      actions: Joi.array().items(
        Joi.object({
          type: Joi.string().valid(
            'ai_content_generation',
            'social_post',
            'email_send',
            'data_sync',
            'notification'
          ).required(),
          config: Joi.object().required()
        })
      ).min(1).required(),
      isActive: Joi.boolean().default(false)
    })
  },
  update: {
    params: Joi.object({
      workflowId: Joi.string().required()
    }),
    body: Joi.object({
      name: Joi.string().min(2).max(100).optional(),
      description: Joi.string().max(500).optional(),
      trigger: Joi.object({
        type: Joi.string().valid('schedule', 'webhook', 'manual', 'event').required(),
        config: Joi.object().required()
      }).optional(),
      actions: Joi.array().items(
        Joi.object({
          type: Joi.string().valid(
            'ai_content_generation',
            'social_post',
            'email_send',
            'data_sync',
            'notification'
          ).required(),
          config: Joi.object().required()
        })
      ).min(1).optional(),
      isActive: Joi.boolean().optional()
    })
  },
  toggleStatus: {
    params: Joi.object({
      workflowId: Joi.string().required()
    }),
    body: Joi.object({
      isActive: Joi.boolean().required()
    })
  },
  createFromTemplate: {
    params: Joi.object({
      brandId: Joi.string().required()
    }),
    body: Joi.object({
      templateId: Joi.string().required(),
      customizations: Joi.object({
        name: Joi.string().min(2).max(100).optional(),
        description: Joi.string().max(500).optional(),
        trigger: Joi.object().optional(),
        actions: Joi.array().optional(),
        isActive: Joi.boolean().optional()
      }).optional()
    })
  }
};

// Apply rate limiting and authentication to all routes
router.use(workflowRateLimit);
router.use(authenticateToken);

// Workflow templates (public to authenticated users)
router.get('/templates',
  workflowController.getTemplates.bind(workflowController)
);

// Brand-specific workflow operations
router.post('/:brandId',
  validate(workflowSchemas.create),
  requireBrandAccess('admin'),
  workflowController.create.bind(workflowController)
);

router.post('/:brandId/from-template',
  validate(workflowSchemas.createFromTemplate),
  requireBrandAccess('admin'),
  workflowController.createFromTemplate.bind(workflowController)
);

router.get('/:brandId',
  requireBrandAccess('viewer'),
  workflowController.list.bind(workflowController)
);

router.get('/:brandId/stats',
  requireBrandAccess('viewer'),
  workflowController.getBrandWorkflowStats.bind(workflowController)
);

// Individual workflow operations
router.get('/workflow/:workflowId',
  workflowController.get.bind(workflowController)
);

router.put('/workflow/:workflowId',
  validate(workflowSchemas.update),
  workflowController.update.bind(workflowController)
);

router.delete('/workflow/:workflowId',
  workflowController.delete.bind(workflowController)
);

router.post('/workflow/:workflowId/execute',
  workflowExecuteRateLimit,
  workflowController.execute.bind(workflowController)
);

router.put('/workflow/:workflowId/status',
  validate(workflowSchemas.toggleStatus),
  workflowController.toggleStatus.bind(workflowController)
);

router.get('/workflow/:workflowId/history',
  workflowController.getExecutionHistory.bind(workflowController)
);

export default router;