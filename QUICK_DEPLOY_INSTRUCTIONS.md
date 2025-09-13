# OmniDash V2 - Quick Deployment Guide

## 🚀 Deploy to Google Cloud Run

### Prerequisites
1. Google Cloud account with billing enabled
2. Google Cloud project created
3. Google Cloud CLI installed (or use Cloud Shell)

### Method 1: Using Google Cloud Console (Easiest)

#### Step 1: Set up Cloud Build Trigger
1. Go to [Google Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Click "Create Trigger"
3. Select "GitHub (Cloud Build GitHub App)" if not already connected
4. Choose your repository: `steeldragon666/OmniDashV2`
5. Configuration:
   - **Branch**: `^main$`
   - **Configuration Type**: Cloud Build configuration file (yaml or json)
   - **Cloud Build configuration file location**: `cloudbuild.yaml`
6. Click "Create"

#### Step 2: Trigger Deployment
The deployment will start automatically! You can also manually trigger it:
1. Go to your trigger
2. Click "Run Trigger"
3. Watch the build progress in Cloud Build History

#### Step 3: Get Your App URL
After deployment completes:
1. Go to [Cloud Run Console](https://console.cloud.google.com/run)
2. Click on your `omnidash-frontend` service
3. Copy the service URL

### Method 2: Using Google Cloud CLI

#### Step 1: Install Google Cloud CLI
```bash
# Windows (using PowerShell as Administrator)
(New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
& $env:Temp\GoogleCloudSDKInstaller.exe

# macOS
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Linux
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

#### Step 2: Initialize and Deploy
```bash
# Authenticate
gcloud auth login

# Set your project ID
export GOOGLE_CLOUD_PROJECT_ID="your-project-id"

# Run deployment script
./deploy-cloud-run.sh
```

### Method 3: Using Docker (Alternative)

#### If you have Docker installed:
```bash
# Build the image
cd omnidash-frontend
docker build -t omnidash-frontend .

# Tag for Google Container Registry
docker tag omnidash-frontend gcr.io/YOUR_PROJECT_ID/omnidash-frontend

# Push to registry (requires gcloud auth)
docker push gcr.io/YOUR_PROJECT_ID/omnidash-frontend

# Deploy to Cloud Run
gcloud run deploy omnidash-frontend \
  --image gcr.io/YOUR_PROJECT_ID/omnidash-frontend \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated
```

## 🔧 Environment Variables Setup

### After deployment, configure your environment variables:

1. **Go to Cloud Run Console**
2. **Select your service** → **Edit & Deploy New Revision**
3. **Go to Variables & Secrets tab**
4. **Add these environment variables**:

```bash
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
NEXT_PUBLIC_API_URL=https://omnidash-frontend-YOUR_PROJECT_ID.a.run.app
```

### For sensitive variables (recommended):
1. **Go to [Secret Manager](https://console.cloud.google.com/security/secret-manager)**
2. **Create secrets** for:
   - OPENAI_API_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - TWITTER_API_KEY
   - etc.

3. **Reference secrets in Cloud Run**:
   - Edit service → Variables & Secrets
   - Add secret references

## 🧪 Test Your Deployment

After deployment:
1. **Visit your service URL**
2. **Check health endpoint**: `https://your-url/api/health`
3. **Test the dashboard**: `https://your-url/dashboard`

## ⚡ Quick Deploy (One-Click)

**If your Google Cloud is already linked to GitHub:**
1. Just **push any change to main branch**
2. **Cloud Build will automatically deploy**
3. **Check progress** in Cloud Build console

```bash
# Make a small change and push
git commit --allow-empty -m "trigger: Deploy to production"
git push origin main
```

## 🆘 Troubleshooting

### Build Fails
- Check Cloud Build logs in Google Cloud Console
- Ensure all required APIs are enabled
- Verify Docker configuration

### Service Won't Start
- Check Cloud Run logs
- Verify environment variables
- Test health endpoint

### Need Help?
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)

---

🎉 **Your OmniDash V2 will be live at**: `https://omnidash-frontend-YOUR_PROJECT_ID.a.run.app`