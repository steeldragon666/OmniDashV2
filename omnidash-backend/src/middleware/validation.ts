import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

interface ValidationSchema {
  body?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
}

export const validate = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // Validate body
    if (schema.body) {
      const { error } = schema.body.validate(req.body);
      if (error) {
        errors.push(...error.details.map(detail => detail.message));
      }
    }

    // Validate params
    if (schema.params) {
      const { error } = schema.params.validate(req.params);
      if (error) {
        errors.push(...error.details.map(detail => detail.message));
      }
    }

    // Validate query
    if (schema.query) {
      const { error } = schema.query.validate(req.query);
      if (error) {
        errors.push(...error.details.map(detail => detail.message));
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
      return;
    }

    next();
  };
};

// Common validation schemas
export const authSchemas = {
  register: {
    body: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).max(128).required(),
      name: Joi.string().min(2).max(50).required()
    })
  },
  login: {
    body: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required()
    })
  },
  forgotPassword: {
    body: Joi.object({
      email: Joi.string().email().required()
    })
  },
  resetPassword: {
    body: Joi.object({
      token: Joi.string().required(),
      password: Joi.string().min(8).max(128).required()
    })
  }
};

export const brandSchemas = {
  create: {
    body: Joi.object({
      name: Joi.string().min(2).max(100).required(),
      description: Joi.string().max(500).optional(),
      website: Joi.string().uri().optional(),
      industry: Joi.string().max(50).optional(),
      themeConfig: Joi.object().optional()
    })
  },
  update: {
    params: Joi.object({
      brandId: Joi.string().required()
    }),
    body: Joi.object({
      name: Joi.string().min(2).max(100).optional(),
      description: Joi.string().max(500).optional().allow(''),
      website: Joi.string().uri().optional().allow(''),
      industry: Joi.string().max(50).optional().allow(''),
      themeConfig: Joi.object().optional()
    })
  },
  get: {
    params: Joi.object({
      brandId: Joi.string().required()
    })
  },
  addMember: {
    params: Joi.object({
      brandId: Joi.string().required()
    }),
    body: Joi.object({
      email: Joi.string().email().required(),
      role: Joi.string().valid('viewer', 'editor', 'admin').required(),
      permissions: Joi.object().optional()
    })
  }
};

export const socialAccountSchemas = {
  create: {
    body: Joi.object({
      brandId: Joi.string().required(),
      platform: Joi.string().valid('twitter', 'instagram', 'linkedin', 'tiktok', 'facebook').required(),
      accountId: Joi.string().required(),
      username: Joi.string().optional(),
      displayName: Joi.string().optional(),
      accessToken: Joi.string().required(),
      refreshToken: Joi.string().optional(),
      tokenExpires: Joi.date().optional()
    })
  },
  update: {
    params: Joi.object({
      accountId: Joi.string().required()
    }),
    body: Joi.object({
      username: Joi.string().optional(),
      displayName: Joi.string().optional(),
      accessToken: Joi.string().optional(),
      refreshToken: Joi.string().optional(),
      tokenExpires: Joi.date().optional(),
      isActive: Joi.boolean().optional()
    })
  }
};

export const postSchemas = {
  create: {
    body: Joi.object({
      brandId: Joi.string().required(),
      socialAccountId: Joi.string().optional(),
      platform: Joi.string().valid('twitter', 'instagram', 'linkedin', 'tiktok', 'facebook').required(),
      content: Joi.string().max(2000).optional(),
      mediaUrls: Joi.array().items(Joi.string().uri()).optional(),
      hashtags: Joi.array().items(Joi.string()).optional(),
      mentions: Joi.array().items(Joi.string()).optional(),
      scheduledAt: Joi.date().optional()
    })
  },
  update: {
    params: Joi.object({
      postId: Joi.string().required()
    }),
    body: Joi.object({
      content: Joi.string().max(2000).optional(),
      mediaUrls: Joi.array().items(Joi.string().uri()).optional(),
      hashtags: Joi.array().items(Joi.string()).optional(),
      mentions: Joi.array().items(Joi.string()).optional(),
      scheduledAt: Joi.date().optional(),
      status: Joi.string().valid('draft', 'scheduled', 'published').optional()
    })
  },
  query: {
    query: Joi.object({
      brandId: Joi.string().optional(),
      platform: Joi.string().optional(),
      status: Joi.string().optional(),
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional(),
      sortBy: Joi.string().valid('createdAt', 'publishedAt', 'scheduledAt').optional(),
      sortOrder: Joi.string().valid('asc', 'desc').optional()
    })
  }
};