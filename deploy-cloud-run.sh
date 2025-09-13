#!/bin/bash
# Google Cloud Run Deployment Script for OmniDash V2
# This script deploys the OmniDash frontend to Google Cloud Run

set -e

# Configuration variables
PROJECT_ID=${GOOGLE_CLOUD_PROJECT_ID:-"your-project-id"}
SERVICE_NAME="omnidash-frontend"
REGION="us-central1"
IMAGE_TAG="gcr.io/$PROJECT_ID/$SERVICE_NAME:latest"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting OmniDash V2 Cloud Run Deployment${NC}"
echo "======================================"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Error: gcloud CLI is not installed${NC}"
    echo "Please install gcloud CLI: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1 &> /dev/null; then
    echo -e "${YELLOW}⚠️  Please authenticate with Google Cloud${NC}"
    gcloud auth login
fi

# Set project
echo -e "${BLUE}📋 Setting project to: $PROJECT_ID${NC}"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "${BLUE}🔧 Enabling required Google Cloud APIs${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build the Docker image
echo -e "${BLUE}🔨 Building Docker image${NC}"
cd omnidash-frontend
gcloud builds submit --tag $IMAGE_TAG .

# Deploy to Cloud Run
echo -e "${BLUE}🚀 Deploying to Cloud Run${NC}"
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_TAG \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --memory 2Gi \
  --cpu 2 \
  --concurrency 80 \
  --max-instances 10 \
  --timeout 300 \
  --set-env-vars "NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1" \
  --labels "app=omnidash,version=v2,environment=production"

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

echo -e "${GREEN}✅ Deployment successful!${NC}"
echo "======================================"
echo -e "${GREEN}🌐 Service URL: $SERVICE_URL${NC}"
echo -e "${BLUE}📊 Monitor: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/metrics?project=$PROJECT_ID${NC}"
echo -e "${BLUE}📝 Logs: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/logs?project=$PROJECT_ID${NC}"
echo ""
echo -e "${YELLOW}💡 To set up continuous deployment:${NC}"
echo "1. Go to Cloud Build triggers: https://console.cloud.google.com/cloud-build/triggers"
echo "2. Connect your GitHub repository: steeldragon666/OmniDashV2"
echo "3. The cloudbuild.yaml file will handle automatic deployments"