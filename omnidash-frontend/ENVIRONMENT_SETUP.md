# 🔐 OmniDash Environment Setup Guide

## Google OAuth Configuration

Your Google OAuth credentials have been configured:
- **Client ID**: `your-google-client-id-here.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-your-google-client-secret-here`

## Required Environment Variables

Create a `.env.local` file in the `omnidash-frontend` directory with the following:

```bash
# ===========================================
# AUTHENTICATION & USER MANAGEMENT
# ===========================================
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here
JWT_SECRET=your-jwt-secret-key-here

# Google OAuth (ALREADY CONFIGURED)
GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret-here

# ===========================================
# DATABASE & STORAGE (PRIORITY 1)
# ===========================================
# Supabase - Get these from https://supabase.com
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Redis - Get these from https://upstash.com or run locally
REDIS_URL=your-redis-url
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# ===========================================
# AI & MACHINE LEARNING (PRIORITY 1)
# ===========================================
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GOOGLE_AI_API_KEY=your-google-ai-api-key

# ===========================================
# SOCIAL MEDIA PLATFORMS (PRIORITY 2)
# ===========================================
# Twitter/X
TWITTER_BEARER_TOKEN=your-twitter-bearer-token
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret

# LinkedIn
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Facebook/Meta
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# ===========================================
# PAYMENT & FINANCIAL (PRIORITY 2)
# ===========================================
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# ===========================================
# EMAIL SERVICES (PRIORITY 2)
# ===========================================
SENDGRID_API_KEY=your-sendgrid-api-key
RESEND_API_KEY=your-resend-api-key

# ===========================================
# MONITORING & SECURITY (PRIORITY 3)
# ===========================================
SENTRY_DSN=your-sentry-dsn
```

## Google Cloud Console Setup

### 1. Authorized JavaScript Origins
Add these URLs to your Google Cloud Console:
```
http://localhost:3000
https://yourdomain.com
https://your-app.vercel.app
```

### 2. Authorized Redirect URIs
Add these URLs to your Google Cloud Console:
```
http://localhost:3000/api/auth/callback/google
https://yourdomain.com/api/auth/callback/google
https://your-app.vercel.app/api/auth/callback/google
```

## Next Steps

1. **Create `.env.local`** file with the above configuration
2. **Get Supabase credentials** (highest priority)
3. **Get AI API keys** (OpenAI, Anthropic)
4. **Test authentication** by running the app
5. **Get social media API keys** as needed

## Testing Authentication

Once you have the environment variables set up:

1. Run the development server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. Click "Get Started Free" or go to `/auth/login`
4. Test Google OAuth login

## Priority Order for API Collection

### 🔥 CRITICAL (Get These First)
1. **Supabase** - Database and user management
2. **OpenAI** - AI content generation
3. **Redis** - Caching and sessions

### 🟠 HIGH (Get These Next)
4. **Stripe** - Payment processing
5. **SendGrid/Resend** - Email services
6. **Twitter API** - Social media posting

### 🟡 MEDIUM (Get These Later)
7. **LinkedIn API** - Professional networking
8. **Facebook API** - Social media management
9. **Analytics APIs** - Performance tracking

## Security Notes

- Never commit `.env.local` to version control
- Use different API keys for development and production
- Rotate API keys regularly
- Monitor API usage and costs
