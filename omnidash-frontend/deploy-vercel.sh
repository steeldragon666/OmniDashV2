#!/bin/bash

# Vercel Deployment Script for OmniDash
# Usage: ./deploy-vercel.sh YOUR_VERCEL_TOKEN [production|preview]

TOKEN=$1
ENVIRONMENT=${2:-"preview"}

if [ -z "$TOKEN" ]; then
    echo "Error: Vercel token is required"
    echo "Usage: ./deploy-vercel.sh YOUR_VERCEL_TOKEN [production|preview]"
    exit 1
fi

echo "Starting Vercel deployment..."
echo "Environment: $ENVIRONMENT"

# Export the token for Vercel CLI
export VERCEL_TOKEN=$TOKEN

# Run the deployment
if [ "$ENVIRONMENT" == "production" ]; then
    echo "Deploying to production..."
    npx vercel --yes --prod --token $TOKEN
else
    echo "Deploying preview..."
    npx vercel --yes --token $TOKEN
fi

echo "Deployment complete!"