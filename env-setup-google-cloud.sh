#!/bin/bash
# Google Cloud Environment Variables Setup Script for OmniDash V2
# This script configures environment variables across Cloud Run, Cloud Build, and Secret Manager

set -e

# Configuration variables
PROJECT_ID=${GOOGLE_CLOUD_PROJECT_ID:-"your-project-id"}
SERVICE_NAME="omnidash-frontend"
REGION="us-central1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 Setting up Google Cloud Environment Variables${NC}"
echo "Project: $PROJECT_ID"
echo "Service: $SERVICE_NAME"
echo "======================================"

# Check if gcloud is installed and authenticated
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Error: gcloud CLI is not installed${NC}"
    exit 1
fi

# Set project
echo -e "${BLUE}📋 Setting project to: $PROJECT_ID${NC}"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "${BLUE}🔧 Enabling Google Cloud APIs${NC}"
gcloud services enable secretmanager.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com

# Create secrets in Secret Manager
echo -e "${BLUE}🔒 Creating secrets in Secret Manager${NC}"

# Function to create or update secret
create_secret() {
    local secret_name=$1
    local secret_description=$2
    
    if gcloud secrets describe $secret_name >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Secret '$secret_name' already exists${NC}"
    else
        echo -e "${GREEN}✅ Creating secret: $secret_name${NC}"
        echo "placeholder-value" | gcloud secrets create $secret_name \
            --data-file=- \
            --labels="app=omnidash,environment=production" \
            >/dev/null
        echo -e "${BLUE}💡 Please update the secret value manually:${NC}"
        echo "   gcloud secrets versions add $secret_name --data-file=<your-file>"
    fi
}

# Create essential secrets
create_secret "OPENAI_API_KEY" "OpenAI API key for AI content generation"
create_secret "ANTHROPIC_API_KEY" "Anthropic API key for Claude AI integration" 
create_secret "TWITTER_API_KEY" "Twitter API key for social media integration"
create_secret "TWITTER_API_SECRET" "Twitter API secret"
create_secret "FACEBOOK_ACCESS_TOKEN" "Facebook access token for social media"
create_secret "INSTAGRAM_ACCESS_TOKEN" "Instagram access token"
create_secret "LINKEDIN_ACCESS_TOKEN" "LinkedIn access token"
create_secret "SUPABASE_SERVICE_ROLE_KEY" "Supabase service role key"
create_secret "NEXTAUTH_SECRET" "NextAuth secret for authentication"
create_secret "SENDGRID_API_KEY" "SendGrid API key for email services"
create_secret "REDIS_URL" "Redis connection URL for caching"

# Set public environment variables for Cloud Run
echo -e "${BLUE}⚙️  Setting public environment variables for Cloud Run${NC}"
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --set-env-vars="
NODE_ENV=production,
NEXT_TELEMETRY_DISABLED=1,
NEXT_PUBLIC_API_URL=https://$SERVICE_NAME-$PROJECT_ID.a.run.app,
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co,
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX,
ENVIRONMENT=production,
LOG_LEVEL=info
" \
  --quiet || echo -e "${YELLOW}⚠️  Service not deployed yet - will set on first deployment${NC}"

# Set secret environment variables for Cloud Run
echo -e "${BLUE}🔒 Setting secret environment variables for Cloud Run${NC}"
SECRET_ENV_VARS=(
    "OPENAI_API_KEY=OPENAI_API_KEY:latest"
    "ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest"
    "TWITTER_API_KEY=TWITTER_API_KEY:latest"
    "TWITTER_API_SECRET=TWITTER_API_SECRET:latest"
    "FACEBOOK_ACCESS_TOKEN=FACEBOOK_ACCESS_TOKEN:latest"
    "INSTAGRAM_ACCESS_TOKEN=INSTAGRAM_ACCESS_TOKEN:latest"
    "LINKEDIN_ACCESS_TOKEN=LINKEDIN_ACCESS_TOKEN:latest"
    "SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest"
    "NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest"
    "SENDGRID_API_KEY=SENDGRID_API_KEY:latest"
    "REDIS_URL=REDIS_URL:latest"
)

for secret_env in "${SECRET_ENV_VARS[@]}"; do
    echo "Setting secret: $secret_env"
done

# Update Cloud Run service with secrets (if service exists)
if gcloud run services describe $SERVICE_NAME --region=$REGION >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Updating Cloud Run service with secret environment variables${NC}"
    
    # Build the secret environment variables arguments
    SECRET_ARGS=""
    for secret_env in "${SECRET_ENV_VARS[@]}"; do
        SECRET_ARGS="$SECRET_ARGS --set-secrets=$secret_env"
    done
    
    gcloud run services update $SERVICE_NAME \
      --region=$REGION \
      $SECRET_ARGS \
      --quiet
else
    echo -e "${YELLOW}⚠️  Cloud Run service not found - secrets will be set on deployment${NC}"
fi

# Set environment variables for Cloud Build
echo -e "${BLUE}🔨 Setting Cloud Build environment variables${NC}"
gcloud secrets add-iam-policy-binding OPENAI_API_KEY \
    --member="serviceAccount:$PROJECT_ID@cloudbuild.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    >/dev/null 2>&1 || echo -e "${YELLOW}⚠️  Cloud Build service account may need manual IAM setup${NC}"

# Create Cloud Build substitution variables
echo -e "${BLUE}📝 Cloud Build substitution variables:${NC}"
cat << EOF
Add these substitution variables in your Cloud Build trigger:
_REGION: $REGION
_SERVICE_NAME: $SERVICE_NAME
_MEMORY: 2Gi
_CPU: 2
_MAX_INSTANCES: 10
_MIN_INSTANCES: 0
_CONCURRENCY: 80
_TIMEOUT: 300
EOF

# Display setup summary
echo -e "${GREEN}✅ Environment variables setup complete!${NC}"
echo "======================================"
echo -e "${BLUE}📋 Summary:${NC}"
echo "• Created secrets in Secret Manager"
echo "• Configured Cloud Run environment variables"  
echo "• Set up Cloud Build IAM permissions"
echo ""
echo -e "${YELLOW}🔧 Next steps:${NC}"
echo "1. Update secret values in Secret Manager:"
echo "   gcloud secrets versions add SECRET_NAME --data-file=secret-file.txt"
echo ""
echo "2. Configure Supabase URL:"
echo "   gcloud run services update $SERVICE_NAME --region=$REGION \\"
echo "     --set-env-vars NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
echo ""
echo "3. Set up custom domain (optional):"
echo "   gcloud run domain-mappings create --service=$SERVICE_NAME --domain=yourdomain.com"
echo ""
echo -e "${BLUE}🌐 Monitoring:${NC}"
echo "• Secret Manager: https://console.cloud.google.com/security/secret-manager?project=$PROJECT_ID"
echo "• Cloud Run: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/revisions?project=$PROJECT_ID"
echo "• Cloud Build: https://console.cloud.google.com/cloud-build/builds?project=$PROJECT_ID"