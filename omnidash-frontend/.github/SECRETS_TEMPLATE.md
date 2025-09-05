# GitHub Actions Secrets Configuration

## Required Secrets for CI/CD

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

### Vercel Deployment
- `VERCEL_TOKEN` - Your Vercel authentication token (get from vercel.com/account/tokens)
- `VERCEL_ORG_ID` - Found in `.vercel/project.json` as `orgId`
- `VERCEL_PROJECT_ID` - Found in `.vercel/project.json` as `projectId`

### Database
- `DATABASE_URL` - PostgreSQL connection string (e.g., postgresql://user:pass@host:5432/dbname)
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for server-side operations)

### Authentication
- `NEXTAUTH_SECRET` - Random string for NextAuth.js (generate with: `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Production URL (https://omnidash-frontend.vercel.app)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

### Optional Services
- `REDIS_URL` - Redis connection URL for caching
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `ANTHROPIC_API_KEY` - Anthropic Claude API key
- `SNYK_TOKEN` - Snyk security scanning token

### Environment URLs
- `PRODUCTION_URL` - https://omnidash-frontend.vercel.app
- `STAGING_URL` - Your staging environment URL

## How to Add Secrets

1. Go to your GitHub repository
2. Click on "Settings" tab
3. Navigate to "Secrets and variables" → "Actions"
4. Click "New repository secret"
5. Add each secret with its name and value

## Verifying Secrets

After adding secrets, you can verify they're working by:
1. Running the CI workflow manually
2. Checking the workflow logs for successful environment variable usage
3. Verifying deployment to Vercel succeeds