/**
 * Centralized Configuration Management
 * Provides organized, type-safe access to all environment variables
 * and service configurations throughout the application
 */

import { getEnvironmentConfig, isIntegrationConfigured } from './env-validation';

// Initialize and validate environment on import
const env = getEnvironmentConfig();

/**
 * Application Core Configuration
 */
export const appConfig = {
  env: env.nodeEnv,
  isDevelopment: env.nodeEnv === 'development',
  isProduction: env.nodeEnv === 'production',
  isTest: env.nodeEnv === 'test',

  // URLs
  url: env.appUrl,
  apiUrl: env.apiUrl,

  // Version and metadata
  version: process.env.NEXT_PUBLIC_VERSION || '2.0.0',
  name: process.env.NEXT_PUBLIC_APP_NAME || 'OmniDash',
} as const;

/**
 * Authentication Configuration
 */
export const authConfig = {
  nextAuth: {
    url: env.nextAuthUrl,
    secret: env.nextAuthSecret,
  },

  // JWT for custom authentication
  jwt: {
    secret: process.env.JWT_SECRET || env.nextAuthSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // OAuth Providers
  providers: {
    google: {
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
      enabled: !!(env.googleClientId && env.googleClientSecret),
    },

    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    },

    twitter: {
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
      enabled: !!(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET),
    },
  },

  // Security
  encryption: {
    key: process.env.ENCRYPTION_KEY,
    salt: process.env.ENCRYPTION_SALT,
  },
} as const;

/**
 * Database Configuration
 */
export const databaseConfig = {
  // Direct database connection
  url: env.databaseUrl,

  // Supabase configuration
  supabase: {
    url: env.supabaseUrl,
    anonKey: env.supabaseAnonKey,
    serviceRoleKey: env.supabaseServiceRoleKey,
    enabled: !!(env.supabaseUrl && env.supabaseServiceRoleKey),
  },

  // Redis for caching and sessions
  redis: {
    url: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD,
    enabled: !!process.env.REDIS_URL,
  },
} as const;

/**
 * Google Cloud Platform Configuration
 */
export const googleCloudConfig = {
  // Core GCP settings
  projectId: env.googleCloudProjectId,
  region: process.env.GOOGLE_CLOUD_REGION || 'us-central1',
  credentials: env.googleApplicationCredentials,
  enabled: isIntegrationConfigured('google-cloud'),

  // BigQuery Data Warehouse
  bigQuery: {
    datasetId: process.env.BIGQUERY_DATASET_ID || 'omnidash_analytics',
    tablePrefix: process.env.BIGQUERY_TABLE_PREFIX || 'omnidash_',
    location: process.env.BIGQUERY_LOCATION || 'us-central1',
    enabled: !!(env.googleCloudProjectId && process.env.BIGQUERY_DATASET_ID),
  },

  // Cloud Storage
  storage: {
    bucket: process.env.GOOGLE_CLOUD_STORAGE_BUCKET,
    uploadsBucket: process.env.GOOGLE_CLOUD_STORAGE_UPLOADS_BUCKET,
    enabled: !!(env.googleCloudProjectId && process.env.GOOGLE_CLOUD_STORAGE_BUCKET),
  },

  // Vertex AI
  vertexAi: {
    projectId: env.vertexAiProjectId || env.googleCloudProjectId,
    location: env.vertexAiLocation || 'us-central1',
    agentId: process.env.VERTEX_AI_AGENT_ID,
    modelEndpoint: process.env.VERTEX_AI_MODEL_ENDPOINT,
    enabled: isIntegrationConfigured('vertex-ai'),
  },

  // Google Workspace APIs
  workspace: {
    gmail: {
      scopes: process.env.GMAIL_API_SCOPES?.split(',') || [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send'
      ],
    },

    drive: {
      scopes: process.env.GOOGLE_DRIVE_API_SCOPES?.split(',') || [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file'
      ],
    },
  },

  // YouTube Data API
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY,
    clientId: process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
    enabled: !!process.env.YOUTUBE_API_KEY,
  },

  // Google Analytics
  analytics: {
    propertyId: process.env.GOOGLE_ANALYTICS_PROPERTY_ID,
    measurementId: process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID,
    searchConsoleUrl: process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL,
    enabled: !!process.env.GOOGLE_ANALYTICS_PROPERTY_ID,
  },
} as const;

/**
 * Social Media Platforms Configuration
 */
export const socialMediaConfig = {
  // Twitter/X API v2
  twitter: {
    apiKey: env.twitterApiKey,
    apiSecret: env.twitterApiSecret,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    bearerToken: process.env.TWITTER_BEARER_TOKEN,
    clientId: process.env.TWITTER_CLIENT_ID, // For OAuth 2.0
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
    enabled: isIntegrationConfigured('twitter'),
  },

  // Facebook & Instagram Graph API
  facebook: {
    appId: env.facebookAppId,
    appSecret: env.facebookAppSecret,
    accessToken: process.env.FACEBOOK_ACCESS_TOKEN,
    instagramBusinessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
    enabled: isIntegrationConfigured('facebook'),
  },

  // LinkedIn API
  linkedin: {
    clientId: env.linkedinClientId,
    clientSecret: env.linkedinClientSecret,
    redirectUri: process.env.LINKEDIN_REDIRECT_URI,
    enabled: isIntegrationConfigured('linkedin'),
  },

  // TikTok for Business API
  tiktok: {
    clientKey: process.env.TIKTOK_CLIENT_KEY,
    clientSecret: process.env.TIKTOK_CLIENT_SECRET,
    accessToken: process.env.TIKTOK_ACCESS_TOKEN,
    enabled: !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET),
  },

  // Pinterest API
  pinterest: {
    appId: process.env.PINTEREST_APP_ID,
    appSecret: process.env.PINTEREST_APP_SECRET,
    enabled: !!(process.env.PINTEREST_APP_ID && process.env.PINTEREST_APP_SECRET),
  },
} as const;

/**
 * CRM & Sales Platforms Configuration
 */
export const crmConfig = {
  // HubSpot CRM
  hubspot: {
    apiKey: env.hubspotApiKey,
    clientId: process.env.HUBSPOT_CLIENT_ID,
    clientSecret: process.env.HUBSPOT_CLIENT_SECRET,
    redirectUri: process.env.HUBSPOT_REDIRECT_URI,
    enabled: isIntegrationConfigured('hubspot'),
  },

  // Salesforce CRM
  salesforce: {
    clientId: env.salesforceClientId,
    clientSecret: env.salesforceClientSecret,
    username: process.env.SALESFORCE_USERNAME,
    password: process.env.SALESFORCE_PASSWORD,
    securityToken: process.env.SALESFORCE_SECURITY_TOKEN,
    loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com',
    enabled: isIntegrationConfigured('salesforce'),
  },

  // Pipedrive CRM
  pipedrive: {
    apiToken: process.env.PIPEDRIVE_API_TOKEN,
    companyDomain: process.env.PIPEDRIVE_COMPANY_DOMAIN,
    enabled: !!(process.env.PIPEDRIVE_API_TOKEN && process.env.PIPEDRIVE_COMPANY_DOMAIN),
  },

  // Zoho CRM
  zoho: {
    clientId: process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_CLIENT_SECRET,
    refreshToken: process.env.ZOHO_REFRESH_TOKEN,
    enabled: !!(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET),
  },
} as const;

/**
 * AI & Machine Learning Services Configuration
 */
export const aiConfig = {
  // OpenAI GPT
  openai: {
    apiKey: env.openaiApiKey,
    organizationId: process.env.OPENAI_ORGANIZATION_ID,
    enabled: isIntegrationConfigured('openai'),
  },

  // Anthropic Claude
  anthropic: {
    apiKey: env.anthropicApiKey,
    enabled: isIntegrationConfigured('anthropic'),
  },

  // Azure OpenAI
  azureOpenai: {
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2023-12-01-preview',
    enabled: !!(process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT),
  },

  // Additional AI Services
  replicate: {
    apiToken: process.env.REPLICATE_API_TOKEN,
    enabled: !!process.env.REPLICATE_API_TOKEN,
  },

  huggingface: {
    apiToken: process.env.HUGGINGFACE_API_TOKEN,
    enabled: !!process.env.HUGGINGFACE_API_TOKEN,
  },
} as const;

/**
 * Email & Communication Services Configuration
 */
export const emailConfig = {
  // SendGrid
  sendgrid: {
    apiKey: env.sendgridApiKey,
    fromEmail: process.env.SENDGRID_FROM_EMAIL,
    fromName: process.env.SENDGRID_FROM_NAME || 'OmniDash',
    enabled: isIntegrationConfigured('sendgrid'),
  },

  // Resend
  resend: {
    apiKey: env.resendApiKey,
    enabled: isIntegrationConfigured('resend'),
  },

  // Mailgun
  mailgun: {
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
    enabled: !!(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN),
  },

  // SMTP (fallback)
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.EMAIL_FROM,
    enabled: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
  },

  // Twilio (SMS & Voice)
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    enabled: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
  },
} as const;

/**
 * Payment Processing Configuration
 */
export const paymentConfig = {
  // Stripe
  stripe: {
    publishableKey: env.stripePublishableKey,
    secretKey: env.stripeSecretKey,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    priceId: process.env.STRIPE_PRICE_ID,
    enabled: isIntegrationConfigured('stripe'),
  },

  // PayPal
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox',
    enabled: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
  },
} as const;

/**
 * Monitoring & Analytics Configuration
 */
export const monitoringConfig = {
  // Sentry (Error Monitoring)
  sentry: {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  },

  // PostHog (Product Analytics)
  posthog: {
    key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    enabled: !!process.env.NEXT_PUBLIC_POSTHOG_KEY,
  },

  // Mixpanel
  mixpanel: {
    token: process.env.MIXPANEL_TOKEN,
    enabled: !!process.env.MIXPANEL_TOKEN,
  },

  // LogRocket
  logrocket: {
    appId: process.env.LOGROCKET_APP_ID,
    enabled: !!process.env.LOGROCKET_APP_ID,
  },
} as const;

/**
 * Security Configuration
 */
export const securityConfig = {
  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || [appConfig.url],
  },

  // Rate Limiting
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  },

  // CSRF Protection
  csrf: {
    enabled: process.env.CSRF_ENABLED !== 'false',
    secret: process.env.CSRF_SECRET,
  },

  // Content Security Policy
  csp: {
    enabled: process.env.CSP_ENABLED === 'true',
  },
} as const;

/**
 * Feature Flags Configuration
 */
export const featureFlags = {
  analytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  errorReporting: process.env.NEXT_PUBLIC_ENABLE_ERROR_REPORTING === 'true',
  maintenanceMode: process.env.NEXT_PUBLIC_ENABLE_MAINTENANCE_MODE === 'true',
  betaFeatures: process.env.NEXT_PUBLIC_ENABLE_BETA_FEATURES === 'true',
  aiFeatures: process.env.NEXT_PUBLIC_ENABLE_AI_FEATURES !== 'false',
  socialFeatures: process.env.NEXT_PUBLIC_ENABLE_SOCIAL_FEATURES !== 'false',
  crmFeatures: process.env.NEXT_PUBLIC_ENABLE_CRM_FEATURES !== 'false',
  paymentFeatures: process.env.NEXT_PUBLIC_ENABLE_PAYMENT_FEATURES === 'true',
} as const;

/**
 * Export all configurations
 */
export const config = {
  app: appConfig,
  auth: authConfig,
  database: databaseConfig,
  googleCloud: googleCloudConfig,
  socialMedia: socialMediaConfig,
  crm: crmConfig,
  ai: aiConfig,
  email: emailConfig,
  payment: paymentConfig,
  monitoring: monitoringConfig,
  security: securityConfig,
  features: featureFlags,
} as const;

// Export individual configs for convenience
export {
  appConfig as app,
  authConfig as auth,
  databaseConfig as database,
  googleCloudConfig as googleCloud,
  socialMediaConfig as socialMedia,
  crmConfig as crm,
  aiConfig as ai,
  emailConfig as email,
  paymentConfig as payment,
  monitoringConfig as monitoring,
  securityConfig as security,
  featureFlags as features,
};

// Export types for TypeScript
export type Config = typeof config;
export type AppConfig = typeof appConfig;
export type AuthConfig = typeof authConfig;
export type DatabaseConfig = typeof databaseConfig;
export type GoogleCloudConfig = typeof googleCloudConfig;
export type SocialMediaConfig = typeof socialMediaConfig;
export type CRMConfig = typeof crmConfig;
export type AIConfig = typeof aiConfig;
export type EmailConfig = typeof emailConfig;
export type PaymentConfig = typeof paymentConfig;
export type MonitoringConfig = typeof monitoringConfig;
export type SecurityConfig = typeof securityConfig;
export type FeatureFlags = typeof featureFlags;