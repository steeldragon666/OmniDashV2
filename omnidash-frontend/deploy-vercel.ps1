# Vercel Deployment Script for OmniDash
# Usage: .\deploy-vercel.ps1 -Token YOUR_VERCEL_TOKEN

param(
    [Parameter(Mandatory=$true)]
    [string]$Token,
    
    [string]$ProjectName = "omnidash-frontend",
    [string]$Environment = "production"
)

# Set environment variable for Vercel CLI
$env:VERCEL_TOKEN = $Token

Write-Host "Starting Vercel deployment..." -ForegroundColor Green
Write-Host "Project: $ProjectName" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Cyan

# Run the deployment
if ($Environment -eq "production") {
    Write-Host "Deploying to production..." -ForegroundColor Yellow
    npx vercel --yes --prod --token $Token
} else {
    Write-Host "Deploying preview..." -ForegroundColor Yellow
    npx vercel --yes --token $Token
}

Write-Host "Deployment complete!" -ForegroundColor Green