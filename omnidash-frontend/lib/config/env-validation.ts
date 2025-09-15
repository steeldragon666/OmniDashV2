/**
 * Environment Variable Validation System
 * Ensures all required environment variables are present and properly formatted
 * Prevents runtime errors due to missing configuration
 */

export interface EnvironmentConfig {
  // Application Core
  nodeEnv: string;
  appUrl: string;
  apiUrl: string;

  // Authentication
  nextAuthUrl: string;
  nextAuthSecret: string;

  // Database
  databaseUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;

  // Google OAuth (Required)
  googleClientId: string;
  googleClientSecret: string;

  // Google Cloud Platform (Optional but recommended)
  googleCloudProjectId?: string;
  googleApplicationCredentials?: string;
  vertexAiProjectId?: string;
  vertexAiLocation?: string;

  // Social Media APIs (Optional)
  twitterApiKey?: string;
  twitterApiSecret?: string;
  facebookAppId?: string;
  facebookAppSecret?: string;
  linkedinClientId?: string;
  linkedinClientSecret?: string;

  // CRM Integrations (Optional)
  hubspotApiKey?: string;
  salesforceClientId?: string;
  salesforceClientSecret?: string;

  // AI Services (Optional)
  openaiApiKey?: string;
  anthropicApiKey?: string;

  // Email Services (Optional)
  sendgridApiKey?: string;
  resendApiKey?: string;

  // Payment Processing (Optional)
  stripeSecretKey?: string;
  stripePublishableKey?: string;
}

/**
 * Critical environment variables that MUST be present for the app to function
 */
const REQUIRED_ENV_VARS = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET'
] as const;

/**
 * Environment variables required for database connectivity
 * At least one database configuration must be present
 */
const DATABASE_ENV_VARS = [
  'DATABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
] as const;

/**
 * Optional environment variables that enhance functionality
 */
const OPTIONAL_ENV_VARS = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'SENDGRID_API_KEY',
  'HUBSPOT_API_KEY',
  'SALESFORCE_CLIENT_ID',
  'TWITTER_API_KEY',
  'FACEBOOK_APP_ID',
  'GOOGLE_CLOUD_PROJECT_ID',
  'VERTEX_AI_PROJECT_ID'
] as const;

/**
 * Environment variables that should be URLs
 */
const URL_ENV_VARS = [
  'NEXTAUTH_URL',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'DATABASE_URL'
] as const;

/**
 * Environment variables that should be secure strings (minimum length requirements)
 */
const SECURE_STRING_ENV_VARS = [
  { name: 'NEXTAUTH_SECRET', minLength: 32 },
  { name: 'ENCRYPTION_KEY', minLength: 32 },
  { name: 'JWT_SECRET', minLength: 24 }
] as const;

/**
 * Validation error class for environment configuration issues
 */
export class EnvironmentValidationError extends Error {
  constructor(
    message: string,
    public readonly missingVars: string[] = [],
    public readonly invalidVars: string[] = []
  ) {
    super(message);
    this.name = 'EnvironmentValidationError';
  }
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate environment variable format and requirements
 */
function validateEnvironmentVariable(name: string, value: string | undefined): string | null {
  if (!value) {
    return `${name} is required but not set`;
  }

  // Check URL format
  if (URL_ENV_VARS.includes(name as any) && !isValidUrl(value)) {
    return `${name} must be a valid URL`;
  }

  // Check secure string length
  const secureStringConfig = SECURE_STRING_ENV_VARS.find(config => config.name === name);
  if (secureStringConfig && value.length < secureStringConfig.minLength) {
    return `${name} must be at least ${secureStringConfig.minLength} characters long`;
  }

  // Check API key format
  if (name === 'OPENAI_API_KEY' && !value.startsWith('sk-')) {
    return `${name} should start with 'sk-'`;
  }

  if (name === 'ANTHROPIC_API_KEY' && !value.startsWith('sk-ant-')) {
    return `${name} should start with 'sk-ant-'`;
  }

  if (name === 'SENDGRID_API_KEY' && !value.startsWith('SG.')) {
    return `${name} should start with 'SG.'`;
  }

  return null; // Valid
}

/**
 * Check if database configuration is valid
 * Requires at least one database connection method
 */
function validateDatabaseConfiguration(): string | null {
  const hasDirectDB = !!process.env.DATABASE_URL;
  const hasSupabase = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (!hasDirectDB && !hasSupabase) {
    return 'Database configuration required: Either DATABASE_URL or Supabase configuration (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)';
  }

  return null;
}

/**
 * Validate all environment variables
 */
export function validateEnvironment(): EnvironmentConfig {
  const errors: string[] = [];
  const missingRequired: string[] = [];
  const invalidVars: string[] = [];

  // Skip validation in development if explicitly disabled
  if (process.env.SKIP_ENV_VALIDATION === 'true' && process.env.NODE_ENV !== 'production') {
    console.warn('⚠️  Environment validation is disabled. This should only be used in development.');
    return buildEnvironmentConfig();
  }

  // Validate required environment variables
  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar];
    const error = validateEnvironmentVariable(envVar, value);

    if (!value) {
      missingRequired.push(envVar);
    } else if (error) {
      errors.push(error);
      invalidVars.push(envVar);
    }
  }

  // Validate database configuration
  const dbError = validateDatabaseConfiguration();
  if (dbError) {
    errors.push(dbError);
  }

  // Validate optional variables that are present
  for (const envVar of OPTIONAL_ENV_VARS) {
    const value = process.env[envVar];
    if (value) {
      const error = validateEnvironmentVariable(envVar, value);
      if (error) {
        errors.push(error);
        invalidVars.push(envVar);
      }
    }
  }

  // Check for potential security issues in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NEXTAUTH_SECRET === 'your_nextauth_secret_here_minimum_32_characters') {
      errors.push('NEXTAUTH_SECRET is using the default placeholder value in production');
    }

    if (process.env.GOOGLE_CLIENT_SECRET?.includes('your-google-client-secret')) {
      errors.push('GOOGLE_CLIENT_SECRET is using a placeholder value in production');
    }
  }

  // Report validation results
  if (missingRequired.length > 0 || errors.length > 0) {
    const errorMessage = [
      '❌ Environment validation failed!',
      '',
      missingRequired.length > 0 ? `Missing required variables:\n${missingRequired.map(v => `  - ${v}`).join('\n')}` : '',
      errors.length > 0 ? `\nValidation errors:\n${errors.map(e => `  - ${e}`).join('\n')}` : '',
      '',
      '💡 Tip: Copy .env.example to .env.local and fill in your values',
      '📚 Setup guide: See docs/ENVIRONMENT_SETUP.md'
    ].filter(Boolean).join('\n');

    throw new EnvironmentValidationError(errorMessage, missingRequired, invalidVars);
  }

  // Log successful validation
  const optionalPresent = OPTIONAL_ENV_VARS.filter(v => !!process.env[v]).length;
  console.log(`✅ Environment validation passed! ${optionalPresent}/${OPTIONAL_ENV_VARS.length} optional integrations configured.`);

  return buildEnvironmentConfig();
}

/**
 * Build the validated environment configuration object
 */
function buildEnvironmentConfig(): EnvironmentConfig {
  return {
    // Application Core
    nodeEnv: process.env.NODE_ENV || 'development',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',

    // Authentication (Required)
    nextAuthUrl: process.env.NEXTAUTH_URL!,
    nextAuthSecret: process.env.NEXTAUTH_SECRET!,

    // Database
    databaseUrl: process.env.DATABASE_URL,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

    // Google OAuth (Required)
    googleClientId: process.env.GOOGLE_CLIENT_ID!,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET!,

    // Google Cloud Platform
    googleCloudProjectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    googleApplicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    vertexAiProjectId: process.env.VERTEX_AI_PROJECT_ID,
    vertexAiLocation: process.env.VERTEX_AI_LOCATION,

    // Social Media APIs
    twitterApiKey: process.env.TWITTER_API_KEY,
    twitterApiSecret: process.env.TWITTER_API_SECRET,
    facebookAppId: process.env.FACEBOOK_APP_ID,
    facebookAppSecret: process.env.FACEBOOK_APP_SECRET,
    linkedinClientId: process.env.LINKEDIN_CLIENT_ID,
    linkedinClientSecret: process.env.LINKEDIN_CLIENT_SECRET,

    // CRM Integrations
    hubspotApiKey: process.env.HUBSPOT_API_KEY,
    salesforceClientId: process.env.SALESFORCE_CLIENT_ID,
    salesforceClientSecret: process.env.SALESFORCE_CLIENT_SECRET,

    // AI Services
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,

    // Email Services
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    resendApiKey: process.env.RESEND_API_KEY,

    // Payment Processing
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  };
}

/**
 * Get validated environment configuration (singleton)
 */
let environmentConfig: EnvironmentConfig | null = null;

export function getEnvironmentConfig(): EnvironmentConfig {
  if (!environmentConfig) {
    environmentConfig = validateEnvironment();
  }
  return environmentConfig;
}

/**
 * Check if a specific integration is configured
 */
export function isIntegrationConfigured(integration: string): boolean {
  const config = getEnvironmentConfig();

  switch (integration.toLowerCase()) {
    case 'google-cloud':
    case 'gcp':
      return !!(config.googleCloudProjectId && config.googleApplicationCredentials);

    case 'vertex-ai':
      return !!(config.vertexAiProjectId && config.vertexAiLocation);

    case 'openai':
      return !!config.openaiApiKey;

    case 'anthropic':
    case 'claude':
      return !!config.anthropicApiKey;

    case 'twitter':
      return !!(config.twitterApiKey && config.twitterApiSecret);

    case 'facebook':
      return !!(config.facebookAppId && config.facebookAppSecret);

    case 'linkedin':
      return !!(config.linkedinClientId && config.linkedinClientSecret);

    case 'hubspot':
      return !!config.hubspotApiKey;

    case 'salesforce':
      return !!(config.salesforceClientId && config.salesforceClientSecret);

    case 'sendgrid':
      return !!config.sendgridApiKey;

    case 'resend':
      return !!config.resendApiKey;

    case 'stripe':
      return !!(config.stripeSecretKey && config.stripePublishableKey);

    default:
      return false;
  }
}

/**
 * Get integration status report
 */
export function getIntegrationStatus() {
  const integrations = [
    'google-cloud',
    'vertex-ai',
    'openai',
    'anthropic',
    'twitter',
    'facebook',
    'linkedin',
    'hubspot',
    'salesforce',
    'sendgrid',
    'stripe'
  ];

  return integrations.map(integration => ({
    name: integration,
    configured: isIntegrationConfigured(integration),
    required: ['google-cloud'].includes(integration) // Add required integrations here
  }));
}