# OmniDash V2 - Environment Configuration Guide

This guide covers setting up environment variables across different deployment platforms for the OmniDash V2 platform.

## 🔐 Required Environment Variables

### Core Application Settings
```bash
# Application Environment
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
LOG_LEVEL=info
ENVIRONMENT=production

# URLs and Endpoints  
NEXT_PUBLIC_API_URL=https://your-app-url.com
NEXTAUTH_URL=https://your-app-url.com
```

### Database & Backend Services
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Redis Cache (Optional)
REDIS_URL=redis://your-redis-url:6379
```

### AI Services
```bash
# OpenAI API
OPENAI_API_KEY=sk-your-openai-key

# Anthropic API  
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
```

### Social Media APIs
```bash
# Twitter/X API
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_BEARER_TOKEN=your_twitter_bearer_token

# Facebook/Meta API
FACEBOOK_ACCESS_TOKEN=your_facebook_access_token
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# Instagram API
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token

# LinkedIn API
LINKEDIN_ACCESS_TOKEN=your_linkedin_access_token
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
```

### Authentication
```bash
# NextAuth Secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your_nextauth_secret_key

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Email Services
```bash
# SendGrid
SENDGRID_API_KEY=SG.your_sendgrid_key

# Nodemailer SMTP (Alternative)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### Analytics & Monitoring
```bash
# Google Analytics
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX

# Mixpanel (Optional)
MIXPANEL_TOKEN=your_mixpanel_token

# Sentry (Optional)
SENTRY_DSN=https://your-sentry-dsn.sentry.io
```

## 🚀 Platform-Specific Setup

### Google Cloud Run

#### 1. Using Secret Manager (Recommended)
```bash
# Create secrets
gcloud secrets create OPENAI_API_KEY --data-file=openai-key.txt
gcloud secrets create SUPABASE_SERVICE_ROLE_KEY --data-file=supabase-key.txt

# Update Cloud Run service
gcloud run services update omnidash-frontend \
  --region=us-central1 \
  --set-secrets="OPENAI_API_KEY=OPENAI_API_KEY:latest" \
  --set-secrets="SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest"
```

#### 2. Using Environment Variables
```bash
gcloud run services update omnidash-frontend \
  --region=us-central1 \
  --set-env-vars="NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1"
```

#### 3. Using the Setup Script
```bash
# Run the automated setup script
chmod +x env-setup-google-cloud.sh
./env-setup-google-cloud.sh
```

### Firebase Hosting

#### 1. Using Firebase Functions
```bash
# Set environment config
firebase functions:config:set openai.key="your-key"
firebase functions:config:set supabase.url="your-url"

# Deploy with config
firebase deploy --only functions
```

#### 2. Using GitHub Secrets (for Actions)
```bash
# In GitHub repository settings, add secrets:
FIREBASE_SERVICE_ACCOUNT # Service account JSON
FIREBASE_PROJECT_ID      # Firebase project ID
OPENAI_API_KEY          # OpenAI API key
SUPABASE_SERVICE_ROLE_KEY # Supabase service key
```

### Vercel

#### 1. Using Vercel CLI
```bash
# Set environment variables
vercel env add OPENAI_API_KEY
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

#### 2. Using Vercel Dashboard
1. Go to Project Settings → Environment Variables
2. Add each variable with appropriate environments (Production, Preview, Development)

### Railway

#### 1. Using Railway CLI
```bash
# Set environment variables
railway variables set OPENAI_API_KEY=your-key
railway variables set NODE_ENV=production
```

#### 2. Using Railway Dashboard
1. Go to your project dashboard
2. Navigate to Variables tab
3. Add environment variables

### Docker Deployment

#### 1. Using Environment File
```bash
# Create .env.production
cp .env.example .env.production
# Edit .env.production with your values

# Run with environment file
docker run --env-file .env.production your-image
```

#### 2. Using Docker Secrets
```bash
# Create secrets
echo "your-openai-key" | docker secret create openai_key -

# Run with secrets
docker service create \
  --secret openai_key \
  --env OPENAI_API_KEY_FILE=/run/secrets/openai_key \
  your-image
```

## 🔒 Security Best Practices

### 1. Secret Management
- **Never commit secrets to version control**
- Use platform-native secret management (Cloud Secret Manager, Vercel Secrets)
- Rotate API keys regularly
- Use different keys for staging/production

### 2. Environment Separation
```bash
# Development
NODE_ENV=development
LOG_LEVEL=debug

# Staging  
NODE_ENV=staging
LOG_LEVEL=info

# Production
NODE_ENV=production
LOG_LEVEL=warn
```

### 3. Access Control
- Use service accounts with minimal required permissions
- Implement proper IAM roles
- Audit secret access regularly

## 🧪 Testing Environment Setup

### Local Development
```bash
# Copy example file
cp .env.example .env.local

# Edit with development values
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
OPENAI_API_KEY=your-dev-key
NODE_ENV=development
```

### Environment Validation
```bash
# Run environment check
npm run security:check

# Validate all required variables
node -e "
const required = ['OPENAI_API_KEY', 'NEXT_PUBLIC_SUPABASE_URL'];
const missing = required.filter(key => !process.env[key]);
if (missing.length) {
  console.error('Missing environment variables:', missing);
  process.exit(1);
}
console.log('✅ All required environment variables are set');
"
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Check if all required variables are set
printenv | grep -E "(NEXT_PUBLIC_|OPENAI_|SUPABASE_)"
```

#### 2. API Connection Issues
```bash
# Test API connectivity
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models
```

#### 3. Supabase Connection
```bash
# Verify Supabase URL and key
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/"
```

### Environment Variable Precedence
1. Platform environment variables (highest priority)
2. `.env.local` file
3. `.env.production` / `.env.staging` / `.env.development`
4. `.env` file (lowest priority)

## 📋 Deployment Checklist

- [ ] All required environment variables are set
- [ ] Secrets are stored securely (not in version control)
- [ ] API keys have proper permissions and quotas
- [ ] Environment-specific configurations are correct
- [ ] Health check endpoint returns 200 OK
- [ ] External API connections are working
- [ ] Logging and monitoring are configured
- [ ] SSL certificates are properly configured
- [ ] Domain mapping is set up (if using custom domain)

## 🆘 Support

For environment setup issues:
1. Check the logs in your deployment platform
2. Verify all required environment variables are set
3. Test API connections manually
4. Review security group/firewall settings
5. Check service account permissions

---

**Security Notice:** Always use secure secret management practices. Never expose sensitive credentials in logs, error messages, or client-side code.