/**
 * Agent Routes
 * HTTP routes for agent management and operations
 */

import { Router } from 'express';
import { AgentController } from '../controllers/AgentController';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import Joi from 'joi';

const router = Router();

// Apply authentication middleware to all agent routes
router.use(authMiddleware);

// Apply rate limiting
const agentRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

router.use(agentRateLimit);

// =====================================
// Validation Schemas
// =====================================

const createAgentSchema = {
  body: Joi.object({
    type: Joi.string()
      .valid('content-creator', 'post-scheduler', 'abn-lookup', 'workflow-coordinator', 'n8n-integration')
      .required(),
    config: Joi.object({
      name: Joi.string().required(),
      description: Joi.string(),
      version: Joi.string().default('1.0.0'),
      enabled: Joi.boolean().default(true),
      maxConcurrentTasks: Joi.number().min(1).max(100).default(5),
      retryAttempts: Joi.number().min(0).max(10).default(3),
      retryDelay: Joi.number().min(100).default(1000),
      timeout: Joi.number().min(1000).default(30000),
      priority: Joi.number().min(1).max(4).default(2),
      tags: Joi.array().items(Joi.string()).default([]),
      capabilities: Joi.array().items(Joi.string()).default([]),
      dependencies: Joi.array().items(Joi.string()).default([]),
      environment: Joi.object().default({}),
      rateLimiting: Joi.object({
        enabled: Joi.boolean().default(false),
        requestsPerMinute: Joi.number().default(60),
        requestsPerHour: Joi.number().default(1000),
        burstLimit: Joi.number().default(10)
      }).default({}),
      monitoring: Joi.object({
        enableHealthCheck: Joi.boolean().default(true),
        enablePerformanceMetrics: Joi.boolean().default(true),
        enableErrorTracking: Joi.boolean().default(true),
        healthCheckInterval: Joi.number().default(30000),
        metricsRetentionDays: Joi.number().default(7)
      }).default({})
    }).required()
  })
};

const updateAgentSchema = {
  body: Joi.object({
    config: Joi.object().required()
  })
};

const executeTaskSchema = {
  body: Joi.object({
    type: Joi.string().required(),
    payload: Joi.object().required(),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
    maxRetries: Joi.number().min(0).max(10).default(3),
    estimatedDuration: Joi.number().min(100),
    context: Joi.object().default({})
  })
};

const generateContentSchema = {
  body: Joi.object({
    type: Joi.string()
      .valid('text', 'image', 'video', 'social-post', 'blog-article', 'email', 'ad-copy')
      .required(),
    prompt: Joi.string().required(),
    context: Joi.string(),
    targetAudience: Joi.string(),
    tone: Joi.string().valid('professional', 'casual', 'friendly', 'formal', 'humorous', 'persuasive'),
    length: Joi.alternatives().try(
      Joi.string().valid('short', 'medium', 'long'),
      Joi.number().min(1)
    ),
    platform: Joi.string().valid('twitter', 'facebook', 'instagram', 'linkedin', 'tiktok', 'youtube'),
    keywords: Joi.array().items(Joi.string()),
    constraints: Joi.object({
      maxWords: Joi.number().min(1),
      minWords: Joi.number().min(1),
      maxCharacters: Joi.number().min(1),
      mustInclude: Joi.array().items(Joi.string()),
      mustAvoid: Joi.array().items(Joi.string())
    }),
    seoOptimization: Joi.object({
      targetKeywords: Joi.array().items(Joi.string()),
      metaDescription: Joi.boolean(),
      headings: Joi.boolean()
    }),
    brandGuidelines: Joi.object({
      brandName: Joi.string(),
      brandVoice: Joi.string(),
      brandValues: Joi.array().items(Joi.string()),
      colorScheme: Joi.array().items(Joi.string()),
      logoUrl: Joi.string().uri()
    })
  })
};

const schedulePostSchema = {
  body: Joi.object({
    content: Joi.string().required(),
    platforms: Joi.array().items(
      Joi.string().valid('twitter', 'facebook', 'instagram', 'linkedin', 'tiktok')
    ).required(),
    scheduledTime: Joi.date().iso().required(),
    mediaUrls: Joi.array().items(Joi.string().uri()),
    hashtags: Joi.array().items(Joi.string()),
    mentions: Joi.array().items(Joi.string()),
    metadata: Joi.object({
      campaignId: Joi.string(),
      brandId: Joi.string(),
      createdBy: Joi.string()
    })
  })
};

const executeWorkflowSchema = {
  body: Joi.object({
    workflowId: Joi.string(),
    workflow: Joi.object(),
    input: Joi.object(),
    context: Joi.object()
  }).xor('workflowId', 'workflow') // Either workflowId OR workflow is required, but not both
};

// =====================================
// Agent Registry Management Routes
// =====================================

/**
 * @route GET /api/agents
 * @description Get all registered agents
 */
router.get('/', AgentController.getAllAgents);

/**
 * @route GET /api/agents/search
 * @description Find agents by criteria
 */
router.get('/search', AgentController.findAgents);

/**
 * @route GET /api/agents/capability/:capability
 * @description Get agents by capability
 */
router.get('/capability/:capability', AgentController.getAgentsByCapability);

/**
 * @route GET /api/agents/:agentId
 * @description Get agent by ID
 */
router.get('/:agentId', AgentController.getAgent);

/**
 * @route POST /api/agents
 * @description Create and register a new agent
 */
router.post('/', validate(createAgentSchema), AgentController.createAgent);

/**
 * @route PUT /api/agents/:agentId
 * @description Update agent configuration
 */
router.put('/:agentId', validate(updateAgentSchema), AgentController.updateAgent);

/**
 * @route DELETE /api/agents/:agentId
 * @description Delete (unregister) an agent
 */
router.delete('/:agentId', AgentController.deleteAgent);

// =====================================
// Agent Control Routes
// =====================================

/**
 * @route POST /api/agents/:agentId/start
 * @description Start an agent
 */
router.post('/:agentId/start', AgentController.startAgent);

/**
 * @route POST /api/agents/:agentId/stop
 * @description Stop an agent
 */
router.post('/:agentId/stop', AgentController.stopAgent);

/**
 * @route POST /api/agents/:agentId/restart
 * @description Restart an agent
 */
router.post('/:agentId/restart', AgentController.restartAgent);

/**
 * @route POST /api/agents/:agentId/tasks
 * @description Execute a task on an agent
 */
router.post('/:agentId/tasks', validate(executeTaskSchema), AgentController.executeTask);

// =====================================
// Health and Monitoring Routes
// =====================================

/**
 * @route GET /api/agents/system/health
 * @description Get system health of all agents
 */
router.get('/system/health', AgentController.getSystemHealth);

/**
 * @route GET /api/agents/system/metrics
 * @description Get system metrics for all agents
 */
router.get('/system/metrics', AgentController.getSystemMetrics);

/**
 * @route GET /api/agents/:agentId/health
 * @description Get agent health
 */
router.get('/:agentId/health', AgentController.getAgentHealth);

/**
 * @route GET /api/agents/:agentId/metrics
 * @description Get agent metrics
 */
router.get('/:agentId/metrics', AgentController.getAgentMetrics);

// =====================================
// Specialized Agent Routes
// =====================================

// Content Creator Agent Routes
/**
 * @route POST /api/agents/content/generate
 * @description Generate content using ContentCreatorAgent
 */
router.post('/content/generate', validate(generateContentSchema), AgentController.generateContent);

// Post Scheduler Agent Routes
/**
 * @route POST /api/agents/social/schedule
 * @description Schedule a social media post
 */
router.post('/social/schedule', validate(schedulePostSchema), AgentController.schedulePost);

// ABN Lookup Agent Routes
/**
 * @route GET /api/agents/business/abn/:abn
 * @description Lookup business by ABN
 */
router.get('/business/abn/:abn', AgentController.lookupABN);

// Workflow Coordinator Agent Routes
/**
 * @route POST /api/agents/workflow/execute
 * @description Execute a workflow
 */
router.post('/workflow/execute', validate(executeWorkflowSchema), AgentController.executeWorkflow);

export default router;