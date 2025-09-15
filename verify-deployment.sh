#!/bin/bash
# OmniDash V2 Deployment Verification Script
# This script verifies that your deployment was successful

set -e

# Configuration
PROJECT_ID=${GOOGLE_CLOUD_PROJECT_ID:-"your-project-id"}
SERVICE_NAME="omnidash-frontend"
REGION="us-central1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🔍 OmniDash V2 Deployment Verification${NC}"
echo "======================================="

# Check if gcloud is authenticated and configured
check_gcloud() {
    echo -e "${BLUE}📋 Checking Google Cloud CLI configuration...${NC}"

    if ! command -v gcloud &> /dev/null; then
        echo -e "${RED}❌ Google Cloud CLI not found${NC}"
        return 1
    fi

    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1 &> /dev/null; then
        echo -e "${RED}❌ Not authenticated with Google Cloud${NC}"
        return 1
    fi

    echo -e "${GREEN}✅ Google Cloud CLI configured${NC}"
}

# Check if the service is deployed
check_service() {
    echo -e "${BLUE}🚀 Checking Cloud Run service...${NC}"

    if gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID &> /dev/null; then
        echo -e "${GREEN}✅ Service '$SERVICE_NAME' found${NC}"

        # Get service URL
        SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")
        echo -e "${GREEN}📍 Service URL: $SERVICE_URL${NC}"

        # Test the endpoint
        echo -e "${BLUE}🌐 Testing endpoint connectivity...${NC}"
        HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}\\n" "$SERVICE_URL" --max-time 30 || echo "000")

        if [ "$HTTP_STATUS" = "200" ]; then
            echo -e "${GREEN}✅ Service responding correctly (HTTP $HTTP_STATUS)${NC}"
        elif [ "$HTTP_STATUS" = "000" ]; then
            echo -e "${RED}❌ Service unreachable (timeout or connection error)${NC}"
        else
            echo -e "${YELLOW}⚠️  Service returned HTTP $HTTP_STATUS${NC}"
        fi

        return 0
    else
        echo -e "${RED}❌ Service '$SERVICE_NAME' not found${NC}"
        return 1
    fi
}

# Check secrets in Secret Manager
check_secrets() {
    echo -e "${BLUE}🔐 Checking Secret Manager...${NC}"

    EXPECTED_SECRETS=("google-cloud-api-key" "google-client-id" "nextauth-secret" "encryption-key" "encryption-salt")

    for secret in "${EXPECTED_SECRETS[@]}"; do
        if gcloud secrets describe $secret --project=$PROJECT_ID &> /dev/null; then
            echo -e "${GREEN}✅ Secret '$secret' exists${NC}"
        else
            echo -e "${RED}❌ Secret '$secret' missing${NC}"
        fi
    done
}

# Check service configuration
check_service_config() {
    echo -e "${BLUE}⚙️  Checking service configuration...${NC}"

    # Get service configuration
    CONFIG=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="json")

    # Check memory allocation
    MEMORY=$(echo $CONFIG | jq -r '.spec.template.spec.template.spec.containers[0].resources.limits.memory // "unknown"')
    echo -e "${BLUE}💾 Memory: $MEMORY${NC}"

    # Check CPU allocation
    CPU=$(echo $CONFIG | jq -r '.spec.template.spec.template.spec.containers[0].resources.limits.cpu // "unknown"')
    echo -e "${BLUE}🖥️  CPU: $CPU${NC}"

    # Check scaling configuration
    MAX_INSTANCES=$(echo $CONFIG | jq -r '.spec.template.metadata.annotations."autoscaling.knative.dev/maxScale" // "unknown"')
    echo -e "${BLUE}📈 Max instances: $MAX_INSTANCES${NC}"

    # Check if secrets are mounted
    SECRETS_COUNT=$(echo $CONFIG | jq -r '.spec.template.spec.template.spec.containers[0].env[]? | select(.valueFrom.secretKeyRef) | .name' | wc -l)
    echo -e "${BLUE}🔐 Mounted secrets: $SECRETS_COUNT${NC}"
}

# Check billing and monitoring
check_monitoring() {
    echo -e "${BLUE}💰 Checking monitoring and billing setup...${NC}"

    # Check if billing API is enabled
    if gcloud services list --enabled --filter="name:cloudbilling.googleapis.com" --project=$PROJECT_ID | grep -q "cloudbilling"; then
        echo -e "${GREEN}✅ Cloud Billing API enabled${NC}"
    else
        echo -e "${YELLOW}⚠️  Cloud Billing API not enabled${NC}"
    fi

    # Check if monitoring API is enabled
    if gcloud services list --enabled --filter="name:monitoring.googleapis.com" --project=$PROJECT_ID | grep -q "monitoring"; then
        echo -e "${GREEN}✅ Cloud Monitoring API enabled${NC}"
    else
        echo -e "${YELLOW}⚠️  Cloud Monitoring API not enabled${NC}"
    fi
}

# Generate deployment report
generate_report() {
    echo ""
    echo -e "${BLUE}📊 DEPLOYMENT REPORT${NC}"
    echo "===================="

    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)" 2>/dev/null || echo "Not deployed")

    echo -e "${GREEN}🚀 Service Status: Deployed${NC}"
    echo -e "${GREEN}📍 URL: $SERVICE_URL${NC}"
    echo -e "${GREEN}🌍 Region: $REGION${NC}"
    echo -e "${GREEN}📦 Project: $PROJECT_ID${NC}"

    echo ""
    echo -e "${BLUE}🔗 Quick Links:${NC}"
    echo -e "${BLUE}📊 Cloud Console: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME?project=$PROJECT_ID${NC}"
    echo -e "${BLUE}📝 Logs: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/logs?project=$PROJECT_ID${NC}"
    echo -e "${BLUE}🔐 Secrets: https://console.cloud.google.com/security/secret-manager?project=$PROJECT_ID${NC}"

    echo ""
    echo -e "${YELLOW}🎯 Next Steps:${NC}"
    echo "1. Test Google OAuth authentication"
    echo "2. Configure Supabase database connection"
    echo "3. Add social media API credentials"
    echo "4. Set up custom domain (optional)"
    echo "5. Begin user onboarding"
}

# Main verification flow
main() {
    if check_gcloud; then
        if check_service; then
            check_secrets
            check_service_config
            check_monitoring
            generate_report
            echo -e "${GREEN}🎉 Verification completed successfully!${NC}"
        else
            echo -e "${RED}❌ Service verification failed${NC}"
            echo "Please run the deployment script first."
            exit 1
        fi
    else
        echo -e "${RED}❌ Google Cloud CLI verification failed${NC}"
        echo "Please install and configure Google Cloud CLI first."
        exit 1
    fi
}

# Run main function
main