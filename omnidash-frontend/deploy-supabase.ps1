# Supabase Deployment Script for OmniDash
# Usage: .\deploy-supabase.ps1 -Token YOUR_SUPABASE_ACCESS_TOKEN

param(
    [Parameter(Mandatory=$true)]
    [string]$Token,
    
    [string]$ProjectRef = "nihtacdpxhthgscpqfsc"
)

Write-Host "Starting Supabase deployment..." -ForegroundColor Green
Write-Host "Project Reference: $ProjectRef" -ForegroundColor Cyan

# Login to Supabase
Write-Host "Logging in to Supabase..." -ForegroundColor Yellow
npx supabase login --token $Token

# Link to project
Write-Host "Linking to Supabase project..." -ForegroundColor Yellow
npx supabase link --project-ref $ProjectRef

# Push database migrations if any
Write-Host "Checking for database migrations..." -ForegroundColor Yellow
if (Test-Path ".\supabase\migrations\*") {
    npx supabase db push
}

# Deploy Edge Functions if any
Write-Host "Checking for Edge Functions..." -ForegroundColor Yellow
if (Test-Path ".\supabase\functions\*") {
    npx supabase functions deploy
}

Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "Your app is available at: https://$ProjectRef.supabase.co" -ForegroundColor Cyan