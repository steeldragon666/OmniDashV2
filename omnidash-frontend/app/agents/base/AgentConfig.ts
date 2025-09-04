/**
 * Configuration types and utilities for AI Agents
 * Handles configuration management, validation, and environment-specific settings
 */

import { AgentCategory } from './AgentInterface';

export interface AgentBaseConfig {
  enabled: boolean;
  maxConcurrency: number;
  timeout: number;
  retries: number;
  retryDelay: number;
  rateLimit?: {
    requests: number;
    window: number; // in milliseconds
  };
  cache?: {
    enabled: boolean;
    ttl: number; // in seconds
  };
  logging?: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enabled: boolean;
  };
  metrics?: {
    enabled: boolean;
    prefix?: string;
  };
}

export interface AIProviderConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
  apiKey: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  timeout?: number;
  retries?: number;
}

export interface DatabaseConfig {
  provider: 'supabase' | 'postgresql' | 'mysql' | 'sqlite';
  url: string;
  apiKey?: string;
  schema?: string;
  pool?: {
    min: number;
    max: number;
    idle: number;
  };
  ssl?: boolean;
  timeout?: number;
}

export interface CacheConfig {
  provider: 'redis' | 'memory' | 'file';
  url?: string;
  ttl: number; // default TTL in seconds
  maxSize?: number; // for memory cache
  keyPrefix?: string;
  serialization?: 'json' | 'msgpack';
}

export interface QueueConfig {
  provider: 'redis' | 'memory' | 'database';
  url?: string;
  defaultJobOptions?: {
    removeOnComplete?: number;
    removeOnFail?: number;
    attempts?: number;
    backoff?: {
      type: 'fixed' | 'exponential';
      delay: number;
    };
  };
}

export interface WebhookConfig {
  enabled: boolean;
  baseUrl: string;
  secret?: string;
  timeout: number;
  retries: number;
  headers?: Record<string, string>;
}

export interface SecurityConfig {
  encryption?: {
    enabled: boolean;
    algorithm: string;
    key?: string;
  };
  apiKeys?: {
    rotationInterval?: number; // in days
    environment?: 'development' | 'staging' | 'production';
  };
  cors?: {
    enabled: boolean;
    origins: string[];
    credentials: boolean;
  };
}

export interface MonitoringConfig {
  healthCheck?: {
    enabled: boolean;
    interval: number; // in milliseconds
    timeout: number;
    retries: number;
  };
  alerts?: {
    enabled: boolean;
    webhookUrl?: string;
    email?: string;
    thresholds?: {
      errorRate: number;
      responseTime: number;
      queueSize: number;
    };
  };
}

export interface GlobalAgentConfig {
  base: AgentBaseConfig;
  ai: AIProviderConfig;
  database: DatabaseConfig;
  cache: CacheConfig;
  queue: QueueConfig;
  webhook: WebhookConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  
  // Environment-specific overrides
  environments?: {
    development?: Partial<GlobalAgentConfig>;
    staging?: Partial<GlobalAgentConfig>;
    production?: Partial<GlobalAgentConfig>;
  };
}

export interface AgentSpecificConfig extends AgentBaseConfig {
  category: AgentCategory;
  capabilities: string[];
  dependencies?: string[];
  
  // Agent-specific settings
  ai?: Partial<AIProviderConfig>;
  database?: Partial<DatabaseConfig>;
  cache?: Partial<CacheConfig>;
  
  // Custom configuration for specific agents
  custom?: Record<string, any>;
}

// Configuration validation schemas
export const ConfigValidationSchema = {
  agentBase: {
    enabled: { type: 'boolean', default: true },
    maxConcurrency: { type: 'number', min: 1, max: 100, default: 5 },
    timeout: { type: 'number', min: 1000, max: 300000, default: 30000 },
    retries: { type: 'number', min: 0, max: 10, default: 3 },
    retryDelay: { type: 'number', min: 100, max: 60000, default: 1000 }
  },
  
  aiProvider: {
    provider: { type: 'string', enum: ['openai', 'anthropic', 'google', 'custom'], required: true },
    apiKey: { type: 'string', required: true },
    model: { type: 'string', required: true },
    temperature: { type: 'number', min: 0, max: 2, default: 0.7 },
    maxTokens: { type: 'number', min: 1, max: 100000, default: 1000 },
    timeout: { type: 'number', min: 1000, max: 120000, default: 30000 }
  },
  
  database: {
    provider: { type: 'string', enum: ['supabase', 'postgresql', 'mysql', 'sqlite'], required: true },
    url: { type: 'string', required: true },
    timeout: { type: 'number', min: 1000, max: 60000, default: 10000 }
  }
};

export class ConfigManager {
  private static instance: ConfigManager;
  private config: GlobalAgentConfig;
  private environment: string;

  private constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.config = this.loadDefaultConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadDefaultConfig(): GlobalAgentConfig {
    return {
      base: {
        enabled: true,
        maxConcurrency: 5,
        timeout: 30000,
        retries: 3,
        retryDelay: 1000,
        rateLimit: {
          requests: 100,
          window: 60000 // 1 minute
        },
        cache: {
          enabled: true,
          ttl: 3600 // 1 hour
        },
        logging: {
          level: 'info',
          enabled: true
        },
        metrics: {
          enabled: true,
          prefix: 'omnidash.agents'
        }
      },
      
      ai: {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY || '',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
        timeout: 30000,
        retries: 3
      },
      
      database: {
        provider: 'supabase',
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        apiKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        timeout: 10000
      },
      
      cache: {
        provider: 'memory',
        ttl: 3600,
        maxSize: 1000,
        keyPrefix: 'omnidash:agents'
      },
      
      queue: {
        provider: 'memory',
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 5,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      },
      
      webhook: {
        enabled: true,
        baseUrl: process.env.WEBHOOK_BASE_URL || '',
        timeout: 10000,
        retries: 3
      },
      
      security: {
        encryption: {
          enabled: this.environment === 'production',
          algorithm: 'aes-256-gcm'
        },
        cors: {
          enabled: true,
          origins: ['http://localhost:3000', 'http://localhost:3002'],
          credentials: true
        }
      },
      
      monitoring: {
        healthCheck: {
          enabled: true,
          interval: 30000, // 30 seconds
          timeout: 5000,
          retries: 3
        },
        alerts: {
          enabled: this.environment === 'production',
          thresholds: {
            errorRate: 0.05, // 5%
            responseTime: 5000, // 5 seconds
            queueSize: 1000
          }
        }
      }
    };
  }

  public getConfig(): GlobalAgentConfig {
    return this.config;
  }

  public getAgentConfig(agentId: string, category: AgentCategory): AgentSpecificConfig {
    const base = this.config.base;
    const envOverrides = this.config.environments?.[this.environment as keyof typeof this.config.environments];
    
    // Merge base config with environment-specific overrides
    const mergedConfig = this.mergeConfigs(base, envOverrides?.base || {});
    
    return {
      ...mergedConfig,
      category,
      capabilities: this.getAgentCapabilities(category),
      dependencies: this.getAgentDependencies(category),
      ai: this.mergeConfigs(this.config.ai, envOverrides?.ai || {}),
      database: this.mergeConfigs(this.config.database, envOverrides?.database || {}),
      cache: this.mergeConfigs(this.config.cache, envOverrides?.cache || {}),
      custom: this.getCustomConfig(agentId, category)
    };
  }

  private getAgentCapabilities(category: AgentCategory): string[] {
    const capabilities = {
      content: ['generate', 'edit', 'analyze', 'optimize'],
      social: ['schedule', 'engage', 'monitor', 'analyze'],
      analytics: ['collect', 'analyze', 'report', 'predict'],
      business: ['lookup', 'verify', 'monitor', 'notify'],
      orchestration: ['coordinate', 'prioritize', 'validate', 'recover'],
      integration: ['connect', 'sync', 'transform', 'notify'],
      utility: ['log', 'cache', 'queue', 'measure']
    };
    
    return capabilities[category] || [];
  }

  private getAgentDependencies(category: AgentCategory): string[] {
    const dependencies = {
      content: ['ai', 'cache', 'database'],
      social: ['ai', 'cache', 'database', 'queue'],
      analytics: ['database', 'cache', 'queue'],
      business: ['database', 'cache', 'webhook'],
      orchestration: ['database', 'cache', 'queue', 'webhook'],
      integration: ['database', 'cache', 'queue', 'webhook'],
      utility: ['database', 'cache']
    };
    
    return dependencies[category] || [];
  }

  private getCustomConfig(agentId: string, category: AgentCategory): Record<string, any> {
    // Load agent-specific configuration from environment or database
    const customConfigs = {
      // Content agents
      'content-creator': {
        templates: process.env.CONTENT_TEMPLATES_PATH || './templates',
        maxLength: 5000,
        languages: ['en', 'es', 'fr']
      },
      
      // Social agents
      'post-scheduler': {
        platforms: ['twitter', 'facebook', 'instagram', 'linkedin'],
        maxScheduledPosts: 100,
        timezones: ['UTC', 'America/New_York', 'Europe/London']
      },
      
      // Analytics agents
      'performance-analytics': {
        metrics: ['engagement', 'reach', 'conversion', 'sentiment'],
        aggregationPeriods: ['1h', '1d', '1w', '1m'],
        retentionDays: 90
      },
      
      // Business agents
      'abn-lookup': {
        apiUrl: process.env.ABR_API_URL || 'https://abr.business.gov.au',
        apiKey: process.env.ABR_API_KEY || '',
        cacheTtl: 86400 // 24 hours
      }
    };
    
    return customConfigs[agentId] || {};
  }

  private mergeConfigs<T extends Record<string, any>>(base: T, override: Partial<T>): T {
    return { ...base, ...override };
  }

  public validateConfig(config: any, schema: any): boolean {
    // Implement configuration validation logic
    // This is a simplified version - you might want to use a library like Joi or Yup
    for (const [key, rules] of Object.entries(schema)) {
      const value = config[key];
      const rule = rules as any;
      
      if (rule.required && (value === undefined || value === null)) {
        throw new Error(`Required configuration key '${key}' is missing`);
      }
      
      if (value !== undefined && rule.type && typeof value !== rule.type) {
        throw new Error(`Configuration key '${key}' must be of type ${rule.type}`);
      }
      
      if (rule.enum && !rule.enum.includes(value)) {
        throw new Error(`Configuration key '${key}' must be one of: ${rule.enum.join(', ')}`);
      }
      
      if (rule.min !== undefined && value < rule.min) {
        throw new Error(`Configuration key '${key}' must be at least ${rule.min}`);
      }
      
      if (rule.max !== undefined && value > rule.max) {
        throw new Error(`Configuration key '${key}' must be at most ${rule.max}`);
      }
    }
    
    return true;
  }

  public updateConfig(updates: Partial<GlobalAgentConfig>): void {
    this.config = this.mergeConfigs(this.config, updates);
  }

  public reloadConfig(): void {
    this.config = this.loadDefaultConfig();
  }
}