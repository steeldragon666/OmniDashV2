import { z } from 'zod';

/**
 * Common validation schemas
 */
export const ValidationSchemas = {
  // Email validation
  email: z.string().email('Invalid email format'),
  
  // Password validation
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain uppercase, lowercase, number, and special character'),
  
  // URL validation
  url: z.string().url('Invalid URL format'),
  
  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),
  
  // Safe string (no HTML/script tags)
  safeString: z.string()
    .refine(
      (val) => !/<[^>]*>/g.test(val),
      'HTML tags are not allowed'
    ),
  
  // Alphanumeric string
  alphanumeric: z.string().regex(/^[a-zA-Z0-9]+$/, 'Only alphanumeric characters allowed'),
  
  // Workflow name
  workflowName: z.string()
    .min(1, 'Workflow name is required')
    .max(100, 'Workflow name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Workflow name contains invalid characters'),
  
  // JSON validation
  jsonString: z.string().refine(
    (val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    },
    'Invalid JSON format'
  ),
  
  // File name validation
  fileName: z.string()
    .min(1, 'File name is required')
    .max(255, 'File name too long')
    .refine(
      (val) => !/[<>:"/\\|?*]/.test(val),
      'File name contains invalid characters'
    ),
  
  // Pagination
  pagination: z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(10)
  }),
  
  // Search query
  searchQuery: z.string()
    .max(200, 'Search query too long')
    .refine(
      (val) => !/<script[^>]*>.*?<\/script>/gi.test(val),
      'Search query contains potentially dangerous content'
    )
    .optional(),
  
  // Date range
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  }).refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    'Start date must be before end date'
  ),
  
  // Workflow trigger
  workflowTrigger: z.object({
    type: z.enum(['manual', 'schedule', 'webhook', 'event']),
    schedule: z.string().optional(),
    webhook_url: z.string().url().optional(),
    event_type: z.string().optional()
  }),
  
  // Workflow action
  workflowAction: z.object({
    type: z.enum(['email', 'webhook', 'api_call', 'data_transform', 'log']),
    config: z.record(z.any())
  }),
  
  // API key validation
  apiKey: z.string()
    .min(20, 'API key too short')
    .max(200, 'API key too long')
    .regex(/^[a-zA-Z0-9\-_]+$/, 'Invalid API key format')
};

/**
 * Input sanitization functions
 */
export const Sanitizers = {
  /**
   * Sanitize HTML content
   */
  html: (input: string): string => {
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  },
  
  /**
   * Sanitize SQL input (basic protection)
   */
  sql: (input: string): string => {
    return input
      .replace(/['";]/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '')
      .replace(/\bUNION\b/gi, '')
      .replace(/\bSELECT\b/gi, '')
      .replace(/\bINSERT\b/gi, '')
      .replace(/\bUPDATE\b/gi, '')
      .replace(/\bDELETE\b/gi, '')
      .replace(/\bDROP\b/gi, '');
  },
  
  /**
   * Sanitize file path
   */
  filePath: (input: string): string => {
    return input
      .replace(/\.\./g, '')
      .replace(/[<>:"|?*]/g, '')
      .replace(/^\//g, '');
  },
  
  /**
   * Sanitize user input for display
   */
  userInput: (input: string): string => {
    return input
      .trim()
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .substring(0, 1000); // Limit length
  },
  
  /**
   * Sanitize JSON input
   */
  json: (input: string): string => {
    try {
      const parsed = JSON.parse(input);
      return JSON.stringify(parsed);
    } catch {
      throw new Error('Invalid JSON format');
    }
  }
};

/**
 * Request validation middleware
 */
export class RequestValidator {
  /**
   * Validate request body against schema
   */
  static validateBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
    const result = schema.safeParse(body);
    
    if (!result.success) {
      const errors = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }));
      
      throw new ValidationError('Request validation failed', errors);
    }
    
    return result.data;
  }
  
  /**
   * Validate query parameters
   */
  static validateQuery<T>(schema: z.ZodSchema<T>, query: URLSearchParams): T {
    const queryObject: Record<string, string | string[]> = {};
    
    for (const [key, value] of query.entries()) {
      if (queryObject[key]) {
        if (Array.isArray(queryObject[key])) {
          (queryObject[key] as string[]).push(value);
        } else {
          queryObject[key] = [queryObject[key] as string, value];
        }
      } else {
        queryObject[key] = value;
      }
    }
    
    return this.validateBody(schema, queryObject);
  }
  
  /**
   * Validate headers
   */
  static validateHeaders<T>(schema: z.ZodSchema<T>, headers: Headers): T {
    const headersObject: Record<string, string> = {};
    
    headers.forEach((value, key) => {
      headersObject[key.toLowerCase()] = value;
    });
    
    return this.validateBody(schema, headersObject);
  }
}

/**
 * Custom validation error
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Rate limiting validation
 */
export const RateLimitSchemas = {
  // Login attempts
  loginAttempt: z.object({
    email: ValidationSchemas.email,
    ip: z.string().ip('Invalid IP address'),
    userAgent: z.string().max(500)
  }),
  
  // API requests
  apiRequest: z.object({
    endpoint: z.string().max(200),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    ip: z.string().ip(),
    userId: ValidationSchemas.uuid.optional()
  })
};

/**
 * File upload validation
 */
export const FileValidation = {
  // Allowed file types
  allowedTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json'
  ],
  
  // Maximum file size (10MB)
  maxSize: 10 * 1024 * 1024,
  
  // Validate file
  validateFile: (file: File): boolean => {
    if (!FileValidation.allowedTypes.includes(file.type)) {
      throw new ValidationError('Invalid file type', [
        { field: 'file', message: 'File type not allowed' }
      ]);
    }
    
    if (file.size > FileValidation.maxSize) {
      throw new ValidationError('File too large', [
        { field: 'file', message: 'File size exceeds maximum limit' }
      ]);
    }
    
    return true;
  }
};

/**
 * Workflow-specific validation schemas
 */
export const WorkflowSchemas = {
  createWorkflow: z.object({
    name: ValidationSchemas.workflowName,
    description: z.string().max(500).optional(),
    triggers: z.array(ValidationSchemas.workflowTrigger).min(1),
    actions: z.array(ValidationSchemas.workflowAction).min(1),
    enabled: z.boolean().default(true)
  }),
  
  updateWorkflow: z.object({
    name: ValidationSchemas.workflowName.optional(),
    description: z.string().max(500).optional(),
    triggers: z.array(ValidationSchemas.workflowTrigger).optional(),
    actions: z.array(ValidationSchemas.workflowAction).optional(),
    enabled: z.boolean().optional()
  }),
  
  executeWorkflow: z.object({
    workflowId: ValidationSchemas.uuid,
    parameters: z.record(z.any()).optional()
  })
};

/**
 * Security validation helpers
 */
export const SecurityValidation = {
  /**
   * Check for SQL injection patterns
   */
  hasSQLInjection: (input: string): boolean => {
    const sqlPatterns = [
      /(\bUNION\b.*\bSELECT\b)/i,
      /(\bSELECT\b.*\bFROM\b)/i,
      /(\bINSERT\b.*\bINTO\b)/i,
      /(\bUPDATE\b.*\bSET\b)/i,
      /(\bDELETE\b.*\bFROM\b)/i,
      /(\bDROP\b.*\bTABLE\b)/i,
      /(--|\/\*|\*\/)/,
      /(\bOR\b.*=.*)/i,
      /(\bAND\b.*=.*)/i
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  },
  
  /**
   * Check for XSS patterns
   */
  hasXSS: (input: string): boolean => {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<img[^>]*src[^>]*>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>.*?<\/embed>/gi
    ];
    
    return xssPatterns.some(pattern => pattern.test(input));
  },
  
  /**
   * Check for path traversal
   */
  hasPathTraversal: (input: string): boolean => {
    const traversalPatterns = [
      /\.\.\//,
      /\.\.\\|\\/,
      /%2e%2e%2f/i,
      /%2e%2e%5c/i
    ];
    
    return traversalPatterns.some(pattern => pattern.test(input));
  }
};