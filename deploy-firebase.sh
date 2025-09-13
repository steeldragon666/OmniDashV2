#!/bin/bash
# Firebase Hosting Deployment Script for OmniDash V2
# This script builds and deploys the static frontend to Firebase Hosting

set -e

# Configuration variables
PROJECT_ENV=${1:-"default"}
BUILD_MODE=${2:-"production"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔥 Starting Firebase Hosting Deployment${NC}"
echo "Environment: $PROJECT_ENV"
echo "Build Mode: $BUILD_MODE"
echo "======================================"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Error: Firebase CLI is not installed${NC}"
    echo "Please install Firebase CLI: npm install -g firebase-tools"
    exit 1
fi

# Check if user is authenticated
if ! firebase login:list | grep -q "firebase"; then
    echo -e "${YELLOW}⚠️  Please authenticate with Firebase${NC}"
    firebase login
fi

# Set Firebase project
echo -e "${BLUE}📋 Setting Firebase project${NC}"
firebase use $PROJECT_ENV

# Navigate to frontend directory
cd omnidash-frontend

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies${NC}"
npm ci

# Create optimized production build
echo -e "${BLUE}🔨 Building application for static hosting${NC}"
if [ "$BUILD_MODE" = "static" ]; then
    # Static export for Firebase Hosting
    npm run build
    npm run export
else
    # Regular build for hybrid deployment
    npm run build
fi

# Navigate back to root
cd ..

# Deploy to Firebase Hosting
echo -e "${BLUE}🚀 Deploying to Firebase Hosting${NC}"
firebase deploy --only hosting

# Get hosting URL
HOSTING_URL=$(firebase hosting:channel:list --json | jq -r '.result[] | select(.name == "live") | .url')

echo -e "${GREEN}✅ Deployment successful!${NC}"
echo "======================================"
echo -e "${GREEN}🌐 Hosting URL: $HOSTING_URL${NC}"
echo -e "${BLUE}📊 Console: https://console.firebase.google.com/project/$(firebase use --project $PROJECT_ENV)/hosting${NC}"
echo ""
echo -e "${YELLOW}💡 Next steps:${NC}"
echo "1. Set up custom domain in Firebase Console"
echo "2. Configure SSL certificate"
echo "3. Set up CDN for global distribution"
echo "4. Configure performance monitoring"

# Optional: Run hosting tests
if command -v curl &> /dev/null; then
    echo -e "${BLUE}🧪 Testing deployed application${NC}"
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HOSTING_URL")
    if [ "$HTTP_STATUS" -eq 200 ]; then
        echo -e "${GREEN}✅ Application is responding correctly${NC}"
    else
        echo -e "${YELLOW}⚠️  Application returned HTTP $HTTP_STATUS${NC}"
    fi
fi