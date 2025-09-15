#!/bin/bash
set -e

# OmniDash Frontend - Google Cloud Run Deployment Script
# This script deploys the OmniDash frontend to Google Cloud Run

echo "🚀 OmniDash Frontend - Google Cloud Deployment"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
REGION="us-central1"
SERVICE_NAME="omnidash-frontend"
PROJECT_ID=""
MEMORY="2Gi"
CPU="2"
MAX_INSTANCES="10"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check if gcloud is installed
if ! command_exists gcloud; then
    print_error "Google Cloud CLI is not installed."
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if docker is installed (for local testing)
if ! command_exists docker; then
    print_warning "Docker is not installed. You won't be able to test locally."
fi

print_status "Google Cloud CLI found"

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    print_error "Not authenticated with Google Cloud."
    echo "Please run: gcloud auth login"
    exit 1
fi

print_status "Google Cloud authentication verified"

# Get current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    print_error "No Google Cloud project is set."
    echo "Please run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

print_status "Using project: $PROJECT_ID"

# Enable required APIs
echo "🔧 Enabling required Google Cloud APIs..."
gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    containerregistry.googleapis.com \
    bigquery.googleapis.com \
    aiplatform.googleapis.com \
    storage-api.googleapis.com \
    --quiet

print_status "Required APIs enabled"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --region)
            REGION="$2"
            shift 2
            ;;
        --service-name)
            SERVICE_NAME="$2"
            shift 2
            ;;
        --memory)
            MEMORY="$2"
            shift 2
            ;;
        --cpu)
            CPU="$2"
            shift 2
            ;;
        --max-instances)
            MAX_INSTANCES="$2"
            shift 2
            ;;
        --build-only)
            BUILD_ONLY=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --region REGION              Set deployment region (default: us-central1)"
            echo "  --service-name NAME          Set service name (default: omnidash-frontend)"
            echo "  --memory MEMORY              Set memory limit (default: 2Gi)"
            echo "  --cpu CPU                    Set CPU limit (default: 2)"
            echo "  --max-instances MAX          Set max instances (default: 10)"
            echo "  --build-only                 Only build, don't deploy"
            echo "  --help                       Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Show deployment configuration
echo "📝 Deployment Configuration:"
echo "   Project ID: $PROJECT_ID"
echo "   Region: $REGION"
echo "   Service Name: $SERVICE_NAME"
echo "   Memory: $MEMORY"
echo "   CPU: $CPU"
echo "   Max Instances: $MAX_INSTANCES"
echo

# Confirmation prompt
read -p "🤔 Do you want to proceed with this deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Run production readiness check
echo "🧪 Running production readiness check..."
if npm run production:check; then
    print_status "Production readiness check passed"
else
    print_warning "Production readiness check had warnings, but continuing..."
fi

# Build the application
echo "🏗️  Building application..."
if npm run build; then
    print_status "Application built successfully"
else
    print_error "Build failed"
    exit 1
fi

# Deploy to Cloud Run
echo "🚀 Deploying to Google Cloud Run..."

if [ "$BUILD_ONLY" = true ]; then
    echo "📦 Building container image only..."
    gcloud builds submit --config cloudbuild.yaml .
    print_status "Container image built successfully"
    echo "To deploy later, run:"
    echo "gcloud run deploy $SERVICE_NAME --image gcr.io/$PROJECT_ID/omnidash-frontend:latest --region $REGION --allow-unauthenticated"
else
    echo "🚀 Deploying to Cloud Run..."
    gcloud run deploy "$SERVICE_NAME" \
        --source . \
        --region "$REGION" \
        --allow-unauthenticated \
        --port 3000 \
        --memory "$MEMORY" \
        --cpu "$CPU" \
        --max-instances "$MAX_INSTANCES" \
        --min-instances 0 \
        --concurrency 80 \
        --timeout 300 \
        --set-env-vars "NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1" \
        --quiet

    if [ $? -eq 0 ]; then
        print_status "Deployment completed successfully!"

        # Get the service URL
        SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format="value(status.url)")

        echo
        echo "🎉 Deployment Summary:"
        echo "   Service URL: $SERVICE_URL"
        echo "   Region: $REGION"
        echo "   Service Name: $SERVICE_NAME"
        echo
        echo "📋 Useful commands:"
        echo "   View logs: gcloud run logs tail $SERVICE_NAME --region $REGION"
        echo "   View service: gcloud run services describe $SERVICE_NAME --region $REGION"
        echo "   Delete service: gcloud run services delete $SERVICE_NAME --region $REGION"
        echo
        echo "🔧 Next steps:"
        echo "   1. Configure your domain name (if needed)"
        echo "   2. Set up environment variables for production"
        echo "   3. Configure SSL certificate for custom domain"
        echo "   4. Set up monitoring and alerting"
        echo
        print_status "OmniDash is now live! 🎊"
    else
        print_error "Deployment failed"
        exit 1
    fi
fi