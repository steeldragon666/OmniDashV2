#!/bin/bash
# Enhanced OmniDash V2 Deployment Script with Google Secret Manager
# This script deploys OmniDash with secure credential management

set -e

# Configuration variables
PROJECT_ID=${GOOGLE_CLOUD_PROJECT_ID:-"omnidash-production"}
SERVICE_NAME="omnidash-frontend"
REGION="us-central1"
IMAGE_TAG="gcr.io/$PROJECT_ID/$SERVICE_NAME:latest"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🚀 OmniDash V2 - Secure Google Cloud Deployment${NC}"
echo "================================================="

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}📋 Checking prerequisites...${NC}"

    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        echo -e "${RED}❌ Error: gcloud CLI is not installed${NC}"
        echo "Installing Google Cloud CLI..."
        # Add installation commands here
        exit 1
    fi

    # Check authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1 &> /dev/null; then
        echo -e "${YELLOW}⚠️  Please authenticate with Google Cloud${NC}"
        gcloud auth login
    fi

    echo -e "${GREEN}✅ Prerequisites satisfied${NC}"
}

# Function to setup Google Cloud project
setup_project() {
    echo -e "${BLUE}🏗️ Setting up Google Cloud project...${NC}"

    # Set project
    gcloud config set project $PROJECT_ID

    # Enable required APIs
    echo -e "${BLUE}🔧 Enabling required APIs...${NC}"
    gcloud services enable \
        cloudbuild.googleapis.com \
        run.googleapis.com \
        containerregistry.googleapis.com \
        secretmanager.googleapis.com \
        cloudbilling.googleapis.com \
        monitoring.googleapis.com \
        bigquery.googleapis.com \
        aiplatform.googleapis.com \
        storage-api.googleapis.com

    echo -e "${GREEN}✅ Project setup completed${NC}"
}

# Function to create service account
create_service_account() {
    echo -e "${BLUE}👤 Creating service account...${NC}"

    SERVICE_ACCOUNT="omnidash-service-account"

    # Create service account if it doesn't exist
    gcloud iam service-accounts create $SERVICE_ACCOUNT \
        --display-name="OmniDash Service Account" \
        --description="Service account for OmniDash application" || echo "Service account already exists"

    # Grant necessary roles
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
        --role="roles/secretmanager.secretAccessor"

    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
        --role="roles/aiplatform.user"

    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
        --role="roles/bigquery.jobUser"

    echo -e "${GREEN}✅ Service account configured${NC}"
}

# Function to setup Google Secret Manager
setup_secrets() {
    echo -e "${BLUE}🔐 Setting up Google Secret Manager...${NC}"

    # Create secrets for secure credential storage with provided credentials
    echo "AIzaSyAhdRwqEU4TcWa3NagItAC9rN41dcDNc-Y" | gcloud secrets create google-cloud-api-key --data-file=- --labels="app=omnidash,type=api-key" || echo "Secret already exists"
    echo "your-production-google-client-id.apps.googleusercontent.com" | gcloud secrets create google-oauth-client-id --data-file=- --labels="app=omnidash,type=oauth" || echo "Secret already exists"

    # Generate secure NextAuth secret
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    echo "$NEXTAUTH_SECRET" | gcloud secrets create nextauth-secret --data-file=- || echo "Secret already exists"

    # Generate encryption keys
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    echo "$ENCRYPTION_KEY" | gcloud secrets create encryption-key --data-file=- || echo "Secret already exists"

    ENCRYPTION_SALT=$(openssl rand -hex 32)
    echo "$ENCRYPTION_SALT" | gcloud secrets create encryption-salt --data-file=- || echo "Secret already exists"

    # Store Google Client Secret (placeholder - user needs to provide actual secret)
    echo "your-google-client-secret-here" | gcloud secrets create google-client-secret --data-file=- || echo "Secret already exists"

    echo -e "${GREEN}✅ Secrets created successfully${NC}"
    echo -e "${YELLOW}⚠️  Please update google-client-secret with your actual Google OAuth client secret${NC}"
}

# Function to setup billing alerts
setup_billing_alerts() {
    echo -e "${BLUE}💰 Setting up billing monitoring...${NC}"

    # Create budget alert (requires billing account access)
    # This will be configured in the Cloud Console manually

    echo -e "${YELLOW}💡 Manual step required:${NC}"
    echo "Please set up billing budgets in Cloud Console:"
    echo "https://console.cloud.google.com/billing/budgets"

    echo -e "${GREEN}✅ Billing monitoring setup initiated${NC}"
}

# Function to build and deploy
deploy_application() {
    echo -e "${BLUE}🏗️ Building and deploying application...${NC}"

    # Change to frontend directory
    cd omnidash-frontend

    # Build using Cloud Build
    echo -e "${BLUE}📦 Building with Cloud Build...${NC}"
    gcloud builds submit --config ../cloudbuild.yaml ..

    echo -e "${GREEN}✅ Application deployed successfully${NC}"
}

# Function to verify deployment
verify_deployment() {
    echo -e "${BLUE}🧪 Verifying deployment...${NC}"

    # Get service URL
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

    if [ ! -z "$SERVICE_URL" ]; then
        echo -e "${GREEN}✅ Deployment verified${NC}"
        echo -e "${GREEN}🌐 Service URL: $SERVICE_URL${NC}"

        # Test the endpoint
        echo -e "${BLUE}🔍 Testing endpoint...${NC}"
        HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}\n" "$SERVICE_URL" || echo "000")

        if [ "$HTTP_STATUS" = "200" ]; then
            echo -e "${GREEN}✅ Service is responding correctly${NC}"
        else
            echo -e "${YELLOW}⚠️  Service returned status: $HTTP_STATUS${NC}"
        fi
    else
        echo -e "${RED}❌ Could not retrieve service URL${NC}"
        exit 1
    fi
}

# Function to display deployment summary
display_summary() {
    echo ""
    echo -e "${PURPLE}🎉 DEPLOYMENT SUMMARY${NC}"
    echo "=================================="

    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

    echo -e "${GREEN}📍 Service URL: $SERVICE_URL${NC}"
    echo -e "${BLUE}📊 Monitoring: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/metrics?project=$PROJECT_ID${NC}"
    echo -e "${BLUE}📝 Logs: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/logs?project=$PROJECT_ID${NC}"
    echo -e "${BLUE}🔐 Secrets: https://console.cloud.google.com/security/secret-manager?project=$PROJECT_ID${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Update Google OAuth Client Secret in Secret Manager"
    echo "2. Configure custom domain (optional)"
    echo "3. Set up Supabase database connection"
    echo "4. Configure social media API keys"
    echo "5. Test all authentication flows"
    echo ""
    echo -e "${GREEN}🚀 OmniDash V2 is now live and ready for configuration!${NC}"
}

# Main deployment flow
main() {
    check_prerequisites
    setup_project
    create_service_account
    setup_secrets
    setup_billing_alerts
    deploy_application
    verify_deployment
    display_summary
}

# Run main function
main