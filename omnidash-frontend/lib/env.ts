/**
 * Environment Variable Validation
 * Ensures all required environment variables are set before application starts
 */

export interface EnvConfig {
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  
  // NextAuth Configuration
  NEXTAUTH_URL: string;
  NEXTAUTH_SECRET: string;
  
  // OAuth Providers
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  TWITTER_CLIENT_ID: string;
  TWITTER_CLIENT_SECRET: string;
  FACEBOOK_CLIENT_ID: string;
  FACEBOOK_CLIENT_SECRET: string;
  LINKEDIN_CLIENT_ID: string;
  LINKEDIN_CLIENT_SECRET: string;
  
  // Optional - Application Configuration
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_API_URL?: string;
  NEXT_PUBLIC_BACKEND_URL?: string;
  
  // Optional - Feature Flags
  NEXT_PUBLIC_ENABLE_ANALYTICS?: string;
  NEXT_PUBLIC_ENABLE_ERROR_REPORTING?: string;
}

class EnvironmentValidator {
  private static instance: EnvironmentValidator;
  private validated = false;
  private config: Partial<EnvConfig> = {};
  
  private constructor() {}
  
  public static getInstance(): EnvironmentValidator {
    if (!EnvironmentValidator.instance) {
      EnvironmentValidator.instance = new EnvironmentValidator();
    }
    return EnvironmentValidator.instance;
  }
  
  /**
   * Validates required environment variables
   * @throws Error if required variables are missing
   */
  public validate(): EnvConfig {
    if (this.validated) {
      return this.config as EnvConfig;
    }
    
    // Skip validation during build or in development if explicitly disabled
    if (process.env.SKIP_ENV_VALIDATION === 'true' || 
        (process.env.NODE_ENV === 'development' && process.env.STRICT_ENV_VALIDATION !== 'true')) {
      // Load what's available without validation
      const allKeys = Object.keys(process.env).filter(key => 
        key.startsWith('NEXT_PUBLIC_') || 
        key.startsWith('NEXTAUTH_') || 
        key.includes('CLIENT_ID') ||
        key.includes('CLIENT_SECRET') ||
        key === 'SUPABASE_SERVICE_ROLE_KEY'
      );
      
      for (const key of allKeys) {
        if (process.env[key]) {
          this.config[key as keyof EnvConfig] = process.env[key];
        }
      }
      
      this.validated = true;
      return this.config as EnvConfig;
    }
    
    const required: (keyof EnvConfig)[] = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL'
    ];
    
    // Additional required vars for production
    if (process.env.NODE_ENV === 'production') {
      required.push(
        'SUPABASE_SERVICE_ROLE_KEY',
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET'
      );
    }
    
    const missing: string[] = [];
    const invalid: string[] = [];
    
    // Check required variables
    for (const key of required) {
      const value = process.env[key];
      
      if (!value) {
        missing.push(key);
      } else if (this.isPlaceholder(value)) {
        invalid.push(`${key} (contains placeholder value)`);
      } else {
        this.config[key] = value;
      }
    }
    
    // Check optional OAuth providers
    const oauthProviders = [
      ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
      ['TWITTER_CLIENT_ID', 'TWITTER_CLIENT_SECRET'],
      ['FACEBOOK_CLIENT_ID', 'FACEBOOK_CLIENT_SECRET'],
      ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET']
    ];
    
    for (const [clientId, clientSecret] of oauthProviders) {
      const id = process.env[clientId];
      const secret = process.env[clientSecret];
      
      if (id && secret) {
        if (this.isPlaceholder(id) || this.isPlaceholder(secret)) {
          invalid.push(`${clientId}/${clientSecret} (contains placeholder values)`);
        } else {
          this.config[clientId as keyof EnvConfig] = id;
          this.config[clientSecret as keyof EnvConfig] = secret;
        }
      }
    }
    
    // Load optional variables
    const optional: (keyof EnvConfig)[] = [
      'NEXT_PUBLIC_APP_URL',
      'NEXT_PUBLIC_API_URL',
      'NEXT_PUBLIC_BACKEND_URL',
      'NEXT_PUBLIC_ENABLE_ANALYTICS',
      'NEXT_PUBLIC_ENABLE_ERROR_REPORTING'
    ];
    
    for (const key of optional) {
      const value = process.env[key];
      if (value && !this.isPlaceholder(value)) {
        this.config[key] = value;
      }
    }
    
    // Validate Supabase URL format
    if (this.config.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const url = new URL(this.config.NEXT_PUBLIC_SUPABASE_URL);
        if (!url.hostname.includes('supabase')) {
          invalid.push('NEXT_PUBLIC_SUPABASE_URL (invalid Supabase URL format)');
        }
      } catch {
        invalid.push('NEXT_PUBLIC_SUPABASE_URL (invalid URL format)');
      }
    }
    
    // Validate NextAuth URL format
    if (this.config.NEXTAUTH_URL) {
      try {
        new URL(this.config.NEXTAUTH_URL);
      } catch {
        invalid.push('NEXTAUTH_URL (invalid URL format)');
      }
    }
    
    // Report errors
    if (missing.length > 0 || invalid.length > 0) {
      let errorMessage = 'Environment configuration errors:\n';
      
      if (missing.length > 0) {
        errorMessage += `\nMissing required variables:\n${missing.map(v => `  - ${v}`).join('\n')}`;
      }
      
      if (invalid.length > 0) {
        errorMessage += `\n\nInvalid variables:\n${invalid.map(v => `  - ${v}`).join('\n')}`;
      }
      
      errorMessage += '\n\nPlease check your .env.local file and ensure all required variables are set correctly.';
      
      throw new Error(errorMessage);
    }
    
    this.validated = true;
    return this.config as EnvConfig;
  }
  
  /**
   * Checks if a value is a placeholder
   */
  private isPlaceholder(value: string): boolean {
    const placeholderPatterns = [
      'placeholder',
      'your-',
      'your_',
      'YOUR_',
      'REPLACE_THIS',
      'example.com',
      'localhost',
      'xxx',
      'test',
      'demo'
    ];
    
    const lowerValue = value.toLowerCase();
    return placeholderPatterns.some(pattern => lowerValue.includes(pattern));
  }
  
  /**
   * Get a specific environment variable
   */
  public get(key: keyof EnvConfig): string | undefined {
    if (!this.validated) {
      this.validate();
    }
    return this.config[key];
  }
  
  /**
   * Get all validated environment variables
   */
  public getAll(): Partial<EnvConfig> {
    if (!this.validated) {
      this.validate();
    }
    return { ...this.config };
  }
  
  /**
   * Check if running in production
   */
  public isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }
  
  /**
   * Check if running in development
   */
  public isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }
  
  /**
   * Get safe public configuration for client-side use
   */
  public getPublicConfig() {
    const publicKeys = Object.keys(this.config).filter(key => 
      key.startsWith('NEXT_PUBLIC_')
    );
    
    const publicConfig: Record<string, string> = {};
    for (const key of publicKeys) {
      publicConfig[key] = this.config[key as keyof EnvConfig] as string;
    }
    
    return publicConfig;
  }
}

// Export singleton instance
export const env = EnvironmentValidator.getInstance();

// Export validation function for use in server components
export function validateEnvironment(): EnvConfig {
  return env.validate();
}

// Export helper to get specific env var
export function getEnv(key: keyof EnvConfig): string {
  const value = env.get(key);
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

// Export helper to check if env var exists
export function hasEnv(key: keyof EnvConfig): boolean {
  return !!env.get(key);
}