# 🚀 OmniDash Frontend - Google Cloud Deployment Guide

This guide will help you deploy the OmniDash frontend application to Google Cloud Run.

## 📋 Prerequisites

### 1. Google Cloud Setup
- Google Cloud Project with billing enabled
- Google Cloud CLI installed and configured
- Docker installed (for local testing)

### 2. Required Google Cloud APIs
The following APIs will be automatically enabled during deployment:
- Cloud Run API
- Cloud Build API
- Container Registry API
- BigQuery API
- Vertex AI API
- Cloud Storage API

### 3. Environment Variables
Ensure you have all required environment variables configured. See [Environment Variables](#environment-variables) section.

## 🛠️ Installation & Setup

### 1. Install Google Cloud CLI
```bash
# For macOS
brew install google-cloud-sdk

# For Windows (PowerShell)
(New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
& $env:Temp\GoogleCloudSDKInstaller.exe

# For Linux
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### 2. Authenticate with Google Cloud
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 3. Verify Setup
```bash
gcloud auth list
gcloud config get-value project
```

## 🚀 Deployment Methods

### Method 1: Automated Deployment Script (Recommended)
```bash
# Make the script executable (Linux/macOS)
chmod +x deploy.sh

# Run the deployment
./deploy.sh
```

#### Script Options
```bash
./deploy.sh --help                           # Show help
./deploy.sh --region us-west1               # Deploy to different region
./deploy.sh --memory 4Gi --cpu 4            # Use more resources
./deploy.sh --max-instances 20              # Allow more scaling
./deploy.sh --build-only                    # Only build, don't deploy
```

### Method 2: NPM Scripts
```bash
# Quick deployment
npm run gcp:deploy

# Build using Cloud Build
npm run gcp:build

# Full production deployment
npm run deploy:production
```

### Method 3: Manual gcloud Commands
```bash
# Direct deployment from source
gcloud run deploy omnidash-frontend \
    --source . \
    --region us-central1 \
    --allow-unauthenticated \
    --memory 2Gi \
    --cpu 2

# Using Cloud Build
gcloud builds submit --config cloudbuild.yaml .
```

## 🔧 Configuration

### Environment Variables

The application requires the following environment variables for production:

#### Core Configuration
```bash
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key
```

#### Google Cloud Services
```bash
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name
```

#### Database (Supabase)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Social Media APIs
```bash
# Twitter
TWITTER_API_KEY=your-api-key
TWITTER_API_SECRET=your-api-secret
TWITTER_ACCESS_TOKEN=your-access-token
TWITTER_ACCESS_TOKEN_SECRET=your-access-token-secret

# LinkedIn
LINKEDIN_CLIENT_ID=your-client-id
LINKEDIN_CLIENT_SECRET=your-client-secret

# Facebook
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret

# Instagram
INSTAGRAM_ACCESS_TOKEN=your-access-token
INSTAGRAM_BUSINESS_ACCOUNT_ID=your-business-account-id
```

#### AI Services
```bash
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

### Setting Environment Variables in Cloud Run

#### Method 1: Using gcloud CLI
```bash
gcloud run services update omnidash-frontend \
    --region us-central1 \
    --set-env-vars "NODE_ENV=production,NEXTAUTH_URL=https://your-domain.com"
```

#### Method 2: Using Google Cloud Console
1. Go to Cloud Run in Google Cloud Console
2. Select your service
3. Click "Edit & Deploy New Revision"
4. Go to "Variables & Secrets" tab
5. Add your environment variables

#### Method 3: Using Secret Manager (Recommended for sensitive data)
```bash
# Create a secret
gcloud secrets create omnidash-env --data-file=.env.production

# Use the secret in Cloud Run
gcloud run services update omnidash-frontend \
    --region us-central1 \
    --set-secrets="/etc/secrets/.env=omnidash-env:latest"
```

## 🏗️ Build Configuration

### Dockerfile
The included `Dockerfile` uses multi-stage builds for optimal production images:
- Base image: `node:18-alpine`
- Production optimizations enabled
- Security best practices implemented
- Health checks configured

### Cloud Build
The `cloudbuild.yaml` configuration provides:
- Automated building and deployment
- Image tagging with commit SHA
- Resource optimization
- Parallel build steps

### Next.js Configuration
Production-ready settings in `next.config.js`:
- Standalone output for containerization
- Security headers configured
- Image optimization enabled
- Performance optimizations

## 🔍 Monitoring & Maintenance

### View Logs
```bash
# Real-time logs
npm run gcp:logs

# Or directly with gcloud
gcloud run logs tail omnidash-frontend --region us-central1

# View specific time range
gcloud run logs read omnidash-frontend --region us-central1 --limit 100
```

### Service Information
```bash
# Get service details
npm run gcp:describe

# Or directly with gcloud
gcloud run services describe omnidash-frontend --region us-central1
```

### Scaling Configuration
```bash
# Update scaling settings
gcloud run services update omnidash-frontend \
    --region us-central1 \
    --min-instances 1 \
    --max-instances 20 \
    --concurrency 100
```

## 🌐 Custom Domain Setup

### 1. Map Custom Domain
```bash
gcloud run domain-mappings create \
    --service omnidash-frontend \
    --domain your-domain.com \
    --region us-central1
```

### 2. Configure DNS
Add the provided DNS records to your domain provider.

### 3. Update Environment Variables
```bash
gcloud run services update omnidash-frontend \
    --region us-central1 \
    --set-env-vars "NEXTAUTH_URL=https://your-domain.com"
```

## 🔒 Security Considerations

### 1. Environment Variables
- Use Google Secret Manager for sensitive data
- Never commit secrets to version control
- Rotate secrets regularly

### 2. IAM Permissions
- Use least-privilege principle
- Create dedicated service accounts
- Regularly audit permissions

### 3. Network Security
- Configure appropriate firewall rules
- Use Cloud Armor for DDoS protection
- Enable audit logging

## 💰 Cost Optimization

### 1. Resource Configuration
- Start with minimal resources (1 CPU, 512Mi memory)
- Scale up based on actual usage
- Use min-instances=0 for cost savings

### 2. Monitoring Usage
```bash
# View service metrics
gcloud run services describe omnidash-frontend --region us-central1 --format="value(status.traffic)"

# Set up billing alerts
gcloud alpha billing budgets create \
    --billing-account BILLING_ACCOUNT_ID \
    --display-name "OmniDash Budget" \
    --budget-amount 100USD
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Check build logs
gcloud builds log [BUILD_ID]

# Test build locally
npm run docker:build
npm run docker:test
```

#### 2. Service Not Starting
```bash
# Check service logs
gcloud run logs tail omnidash-frontend --region us-central1

# Test container locally
docker run -p 3000:3000 -e NODE_ENV=production omnidash-frontend
```

#### 3. Environment Variable Issues
```bash
# List current env vars
gcloud run services describe omnidash-frontend --region us-central1 --format="value(spec.template.spec.template.spec.containers[0].env[].name)"

# Test environment validation
npm run security:check
```

### Getting Help
- Check Cloud Run documentation: https://cloud.google.com/run/docs
- View logs for specific errors
- Use Google Cloud Support for production issues

## 📚 Additional Resources

- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Google Cloud Build Documentation](https://cloud.google.com/build/docs)

## 🎯 Quick Commands Reference

```bash
# Deploy
./deploy.sh

# View logs
npm run gcp:logs

# Get service info
npm run gcp:describe

# Update environment variables
gcloud run services update omnidash-frontend --region us-central1 --set-env-vars "VAR=value"

# Scale service
gcloud run services update omnidash-frontend --region us-central1 --max-instances 20

# Delete service
npm run gcp:delete
```

---

## 🎉 Success!

Once deployed, your OmniDash application will be available at:
`https://omnidash-frontend-[hash]-uc.a.run.app`

The application includes:
- ✅ Real Google Cloud BigQuery integration
- ✅ Real Vertex AI content generation
- ✅ Real social media posting
- ✅ Real YouTube video uploads
- ✅ Real workflow automation
- ✅ Real logging and monitoring
- ✅ Production-ready security

Your OmniDash platform is now live and ready for beta testing! 🚀