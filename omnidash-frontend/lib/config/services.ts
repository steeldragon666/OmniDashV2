/**
 * Service Configuration and Factory Functions
 * Provides configured service instances based on available environment variables
 * Ensures services are only initialized when properly configured
 */

import {
  googleCloud,
  socialMedia,
  crm,
  ai,
  email,
  payment,
  monitoring,
  auth,
  database
} from './index';

/**
 * Service availability checker
 */
export class ServiceManager {
  /**
   * Get available Google Cloud services
   */
  static getGoogleCloudServices() {
    return {
      core: googleCloud.enabled,
      bigQuery: googleCloud.bigQuery.enabled,
      storage: googleCloud.storage.enabled,
      vertexAi: googleCloud.vertexAi.enabled,
      youtube: googleCloud.youtube.enabled,
      analytics: googleCloud.analytics.enabled,
    };
  }

  /**
   * Get available social media platforms
   */
  static getSocialMediaPlatforms() {
    return {
      twitter: socialMedia.twitter.enabled,
      facebook: socialMedia.facebook.enabled,
      linkedin: socialMedia.linkedin.enabled,
      tiktok: socialMedia.tiktok.enabled,
      pinterest: socialMedia.pinterest.enabled,
    };
  }

  /**
   * Get available CRM integrations
   */
  static getCRMIntegrations() {
    return {
      hubspot: crm.hubspot.enabled,
      salesforce: crm.salesforce.enabled,
      pipedrive: crm.pipedrive.enabled,
      zoho: crm.zoho.enabled,
    };
  }

  /**
   * Get available AI services
   */
  static getAIServices() {
    return {
      openai: ai.openai.enabled,
      anthropic: ai.anthropic.enabled,
      azureOpenai: ai.azureOpenai.enabled,
      replicate: ai.replicate.enabled,
      huggingface: ai.huggingface.enabled,
      vertexAi: googleCloud.vertexAi.enabled,
    };
  }

  /**
   * Get available email services
   */
  static getEmailServices() {
    return {
      sendgrid: email.sendgrid.enabled,
      resend: email.resend.enabled,
      mailgun: email.mailgun.enabled,
      smtp: email.smtp.enabled,
      twilio: email.twilio.enabled,
    };
  }

  /**
   * Get available payment processors
   */
  static getPaymentProcessors() {
    return {
      stripe: payment.stripe.enabled,
      paypal: payment.paypal.enabled,
    };
  }

  /**
   * Get comprehensive service status
   */
  static getServiceStatus() {
    return {
      googleCloud: this.getGoogleCloudServices(),
      socialMedia: this.getSocialMediaPlatforms(),
      crm: this.getCRMIntegrations(),
      ai: this.getAIServices(),
      email: this.getEmailServices(),
      payment: this.getPaymentProcessors(),
    };
  }

  /**
   * Get count of configured services
   */
  static getConfiguredServicesCount() {
    const status = this.getServiceStatus();
    let count = 0;

    // Count Google Cloud services
    Object.values(status.googleCloud).forEach(enabled => enabled && count++);

    // Count social media platforms
    Object.values(status.socialMedia).forEach(enabled => enabled && count++);

    // Count CRM integrations
    Object.values(status.crm).forEach(enabled => enabled && count++);

    // Count AI services
    Object.values(status.ai).forEach(enabled => enabled && count++);

    // Count email services
    Object.values(status.email).forEach(enabled => enabled && count++);

    // Count payment processors
    Object.values(status.payment).forEach(enabled => enabled && count++);

    return count;
  }
}

/**
 * Google Cloud Service Factory
 */
export class GoogleCloudServiceFactory {
  /**
   * Create BigQuery client configuration
   */
  static getBigQueryConfig() {
    if (!googleCloud.bigQuery.enabled) {
      throw new Error('BigQuery is not configured. Please set GOOGLE_CLOUD_PROJECT_ID and BIGQUERY_DATASET_ID.');
    }

    return {
      projectId: googleCloud.projectId!,
      datasetId: googleCloud.bigQuery.datasetId,
      location: googleCloud.bigQuery.location,
      keyFilename: googleCloud.credentials,
    };
  }

  /**
   * Create Cloud Storage configuration
   */
  static getStorageConfig() {
    if (!googleCloud.storage.enabled) {
      throw new Error('Cloud Storage is not configured. Please set GOOGLE_CLOUD_STORAGE_BUCKET.');
    }

    return {
      projectId: googleCloud.projectId!,
      bucket: googleCloud.storage.bucket!,
      uploadsBucket: googleCloud.storage.uploadsBucket,
      keyFilename: googleCloud.credentials,
    };
  }

  /**
   * Create Vertex AI configuration
   */
  static getVertexAIConfig() {
    if (!googleCloud.vertexAi.enabled) {
      throw new Error('Vertex AI is not configured. Please set VERTEX_AI_PROJECT_ID.');
    }

    return {
      projectId: googleCloud.vertexAi.projectId!,
      location: googleCloud.vertexAi.location,
      agentId: googleCloud.vertexAi.agentId,
      modelEndpoint: googleCloud.vertexAi.modelEndpoint,
      keyFilename: googleCloud.credentials,
    };
  }

  /**
   * Create YouTube API configuration
   */
  static getYouTubeConfig() {
    if (!googleCloud.youtube.enabled) {
      throw new Error('YouTube API is not configured. Please set YOUTUBE_API_KEY.');
    }

    return {
      apiKey: googleCloud.youtube.apiKey!,
      clientId: googleCloud.youtube.clientId,
      clientSecret: googleCloud.youtube.clientSecret,
    };
  }
}

/**
 * Social Media Service Factory
 */
export class SocialMediaServiceFactory {
  /**
   * Create Twitter API configuration
   */
  static getTwitterConfig() {
    if (!socialMedia.twitter.enabled) {
      throw new Error('Twitter API is not configured. Please set TWITTER_API_KEY and TWITTER_API_SECRET.');
    }

    return {
      apiKey: socialMedia.twitter.apiKey!,
      apiSecret: socialMedia.twitter.apiSecret!,
      accessToken: socialMedia.twitter.accessToken,
      accessTokenSecret: socialMedia.twitter.accessTokenSecret,
      bearerToken: socialMedia.twitter.bearerToken,
    };
  }

  /**
   * Create Facebook API configuration
   */
  static getFacebookConfig() {
    if (!socialMedia.facebook.enabled) {
      throw new Error('Facebook API is not configured. Please set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET.');
    }

    return {
      appId: socialMedia.facebook.appId!,
      appSecret: socialMedia.facebook.appSecret!,
      accessToken: socialMedia.facebook.accessToken,
      instagramBusinessAccountId: socialMedia.facebook.instagramBusinessAccountId,
    };
  }

  /**
   * Create LinkedIn API configuration
   */
  static getLinkedInConfig() {
    if (!socialMedia.linkedin.enabled) {
      throw new Error('LinkedIn API is not configured. Please set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET.');
    }

    return {
      clientId: socialMedia.linkedin.clientId!,
      clientSecret: socialMedia.linkedin.clientSecret!,
      redirectUri: socialMedia.linkedin.redirectUri,
    };
  }
}

/**
 * CRM Service Factory
 */
export class CRMServiceFactory {
  /**
   * Create HubSpot configuration
   */
  static getHubSpotConfig() {
    if (!crm.hubspot.enabled) {
      throw new Error('HubSpot is not configured. Please set HUBSPOT_API_KEY.');
    }

    return {
      apiKey: crm.hubspot.apiKey!,
      clientId: crm.hubspot.clientId,
      clientSecret: crm.hubspot.clientSecret,
      redirectUri: crm.hubspot.redirectUri,
    };
  }

  /**
   * Create Salesforce configuration
   */
  static getSalesforceConfig() {
    if (!crm.salesforce.enabled) {
      throw new Error('Salesforce is not configured. Please set SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET.');
    }

    return {
      clientId: crm.salesforce.clientId!,
      clientSecret: crm.salesforce.clientSecret!,
      username: crm.salesforce.username,
      password: crm.salesforce.password,
      securityToken: crm.salesforce.securityToken,
      loginUrl: crm.salesforce.loginUrl,
    };
  }
}

/**
 * AI Service Factory
 */
export class AIServiceFactory {
  /**
   * Create OpenAI configuration
   */
  static getOpenAIConfig() {
    if (!ai.openai.enabled) {
      throw new Error('OpenAI is not configured. Please set OPENAI_API_KEY.');
    }

    return {
      apiKey: ai.openai.apiKey!,
      organization: ai.openai.organizationId,
    };
  }

  /**
   * Create Anthropic configuration
   */
  static getAnthropicConfig() {
    if (!ai.anthropic.enabled) {
      throw new Error('Anthropic is not configured. Please set ANTHROPIC_API_KEY.');
    }

    return {
      apiKey: ai.anthropic.apiKey!,
    };
  }

  /**
   * Get best available AI service
   */
  static getBestAvailableAI(): 'openai' | 'anthropic' | 'azure' | 'vertex' | null {
    if (ai.openai.enabled) return 'openai';
    if (ai.anthropic.enabled) return 'anthropic';
    if (ai.azureOpenai.enabled) return 'azure';
    if (googleCloud.vertexAi.enabled) return 'vertex';
    return null;
  }
}

/**
 * Email Service Factory
 */
export class EmailServiceFactory {
  /**
   * Create SendGrid configuration
   */
  static getSendGridConfig() {
    if (!email.sendgrid.enabled) {
      throw new Error('SendGrid is not configured. Please set SENDGRID_API_KEY.');
    }

    return {
      apiKey: email.sendgrid.apiKey!,
      fromEmail: email.sendgrid.fromEmail!,
      fromName: email.sendgrid.fromName,
    };
  }

  /**
   * Create Resend configuration
   */
  static getResendConfig() {
    if (!email.resend.enabled) {
      throw new Error('Resend is not configured. Please set RESEND_API_KEY.');
    }

    return {
      apiKey: email.resend.apiKey!,
    };
  }

  /**
   * Get best available email service
   */
  static getBestAvailableEmailService(): 'sendgrid' | 'resend' | 'mailgun' | 'smtp' | null {
    if (email.sendgrid.enabled) return 'sendgrid';
    if (email.resend.enabled) return 'resend';
    if (email.mailgun.enabled) return 'mailgun';
    if (email.smtp.enabled) return 'smtp';
    return null;
  }
}

/**
 * Payment Service Factory
 */
export class PaymentServiceFactory {
  /**
   * Create Stripe configuration
   */
  static getStripeConfig() {
    if (!payment.stripe.enabled) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY.');
    }

    return {
      publishableKey: payment.stripe.publishableKey!,
      secretKey: payment.stripe.secretKey!,
      webhookSecret: payment.stripe.webhookSecret,
      priceId: payment.stripe.priceId,
    };
  }

  /**
   * Create PayPal configuration
   */
  static getPayPalConfig() {
    if (!payment.paypal.enabled) {
      throw new Error('PayPal is not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.');
    }

    return {
      clientId: payment.paypal.clientId!,
      clientSecret: payment.paypal.clientSecret!,
      environment: payment.paypal.environment as 'live' | 'sandbox',
    };
  }
}

/**
 * Database Service Factory
 */
export class DatabaseServiceFactory {
  /**
   * Get database configuration
   */
  static getDatabaseConfig() {
    if (database.supabase.enabled) {
      return {
        type: 'supabase' as const,
        url: database.supabase.url!,
        anonKey: database.supabase.anonKey!,
        serviceRoleKey: database.supabase.serviceRoleKey!,
      };
    }

    if (database.url) {
      return {
        type: 'postgresql' as const,
        url: database.url,
      };
    }

    throw new Error('No database configuration found. Please configure either Supabase or PostgreSQL.');
  }

  /**
   * Get Redis configuration if available
   */
  static getRedisConfig() {
    if (!database.redis.enabled) {
      return null;
    }

    return {
      url: database.redis.url!,
      password: database.redis.password,
    };
  }
}

/**
 * Service initialization helpers
 */
export const initializeServices = {
  /**
   * Initialize all configured services
   */
  async all() {
    const results = {
      database: null as any,
      redis: null as any,
      email: null as any,
      ai: null as any,
      errors: [] as string[],
    };

    try {
      // Initialize database
      results.database = DatabaseServiceFactory.getDatabaseConfig();
    } catch (error) {
      results.errors.push(`Database: ${(error as Error).message}`);
    }

    try {
      // Initialize Redis if available
      results.redis = DatabaseServiceFactory.getRedisConfig();
    } catch (error) {
      // Redis is optional, so don't add to errors
    }

    try {
      // Initialize email service
      const emailService = EmailServiceFactory.getBestAvailableEmailService();
      if (emailService) {
        switch (emailService) {
          case 'sendgrid':
            results.email = { type: emailService, config: EmailServiceFactory.getSendGridConfig() };
            break;
          case 'resend':
            results.email = { type: emailService, config: EmailServiceFactory.getResendConfig() };
            break;
        }
      }
    } catch (error) {
      results.errors.push(`Email: ${(error as Error).message}`);
    }

    try {
      // Initialize AI service
      const aiService = AIServiceFactory.getBestAvailableAI();
      if (aiService) {
        switch (aiService) {
          case 'openai':
            results.ai = { type: aiService, config: AIServiceFactory.getOpenAIConfig() };
            break;
          case 'anthropic':
            results.ai = { type: aiService, config: AIServiceFactory.getAnthropicConfig() };
            break;
        }
      }
    } catch (error) {
      // AI is optional for basic functionality
    }

    return results;
  },

  /**
   * Get service initialization summary
   */
  getSummary() {
    const serviceCount = ServiceManager.getConfiguredServicesCount();
    const status = ServiceManager.getServiceStatus();

    return {
      totalConfigured: serviceCount,
      core: {
        database: database.supabase.enabled || !!database.url,
        authentication: auth.providers.google.enabled,
        email: EmailServiceFactory.getBestAvailableEmailService() !== null,
      },
      integrations: status,
    };
  },
};

// Export service factories for convenience
export {
  GoogleCloudServiceFactory as GoogleCloud,
  SocialMediaServiceFactory as SocialMedia,
  CRMServiceFactory as CRM,
  AIServiceFactory as AI,
  EmailServiceFactory as Email,
  PaymentServiceFactory as Payment,
  DatabaseServiceFactory as Database,
};