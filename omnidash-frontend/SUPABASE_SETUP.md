# 🚀 Supabase Deployment Guide for OmniDash

This guide will help you deploy the OmniDash backend to Supabase and connect it to your frontend.

## 📋 Prerequisites

Before you begin, make sure you have:

- [Node.js 18+](https://nodejs.org/) installed
- A [Supabase](https://supabase.com) account
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed (optional, for local development)

## 🎯 Quick Start

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New project"
3. Choose your organization
4. Fill in your project details:
   - **Name**: `omnidash` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for the project to be set up (~2 minutes)

### 2. Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (starts with `https://...supabase.co`)
   - **Project API Key** (`anon` `public` key)
   - **Service Role Key** (`service_role` `secret` key)

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Update the Supabase configuration in `.env.local`:
   ```bash
   # Database Configuration - Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
   SUPABASE_URL=https://your-project-id.supabase.co  # Same as above
   ```

3. Replace the placeholder values with your actual Supabase credentials

### 4. Deploy Database Schema

Run the automated deployment script:

```bash
npm run db:deploy
```

This will:
- ✅ Create all required tables
- ✅ Set up Row Level Security (RLS) policies
- ✅ Insert sample data for testing
- ✅ Create storage buckets
- ✅ Verify the connection

### 5. Test the Connection

```bash
npm run test:connections
```

This will verify:
- ✅ Database connectivity
- ✅ API endpoints
- ✅ Authentication setup
- ✅ Frontend-backend integration

### 6. Start Your Application

```bash
npm install
npm run dev
```

Visit http://localhost:3000 to see your OmniDash application!

## 🔧 Manual Setup (Alternative)

If the automated script doesn't work, you can set up the database manually:

### Option 1: Using Supabase Dashboard

1. Go to your Supabase project → **SQL Editor**
2. Copy and paste the content from `supabase/migrations/001_initial_schema.sql`
3. Click "Run" to execute the schema
4. Repeat for `002_row_level_security.sql` and `003_sample_data.sql`

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize project
supabase init

# Link to your project
supabase link --project-ref your-project-id

# Run migrations
supabase db push
```

## 📊 Database Schema Overview

The OmniDash database includes these main tables:

### Core Tables
- **`workflows`** - Automation workflow definitions
- **`workflow_executions`** - Execution history and logs
- **`social_posts`** - Social media posts and scheduling
- **`social_accounts`** - Connected social media accounts

### Authentication Tables (NextAuth compatible)
- **`users`** - User profiles
- **`accounts`** - OAuth provider accounts
- **`sessions`** - User sessions
- **`verification_tokens`** - Email verification

### System Tables
- **`api_keys`** - User API keys for integrations
- **`user_settings`** - User preferences and configuration
- **`webhooks`** - Incoming webhook endpoints
- **`file_uploads`** - File upload management
- **`audit_logs`** - Security and activity logging

## 🔐 Security Features

Our Supabase setup includes:

### Row Level Security (RLS)
- Users can only access their own data
- Service role can access all data for admin operations
- Automatic filtering based on authentication

### API Security
- JWT-based authentication
- Rate limiting on auth endpoints
- Secure token handling

### Data Protection
- Encrypted sensitive fields
- Audit logging for all operations
- GDPR compliance ready

## 🎮 Available Commands

### Database Management
```bash
npm run db:deploy          # Deploy schema to Supabase
npm run db:setup           # Alternative setup method
npm run db:reset           # Reset and redeploy (caution!)
npm run test:connections   # Test all connections
```

### Local Supabase Development
```bash
npm run supabase:start     # Start local Supabase
npm run supabase:stop      # Stop local Supabase
npm run supabase:status    # Check status
npm run supabase:reset     # Reset local database
```

### Testing and Development
```bash
npm run dev                # Start development server
npm run test               # Run unit tests
npm run test:e2e           # Run end-to-end tests
npm run build              # Build for production
```

## 🚨 Troubleshooting

### Common Issues

#### 1. "Failed to connect to Supabase"
- ✅ Check your environment variables in `.env.local`
- ✅ Verify your Supabase project is active
- ✅ Ensure you're using the correct region URL

#### 2. "Table doesn't exist" errors
- ✅ Run `npm run db:deploy` to create tables
- ✅ Check the Supabase dashboard → Database → Tables
- ✅ Verify migrations completed successfully

#### 3. "Unauthorized" errors
- ✅ Check RLS policies are properly set
- ✅ Verify JWT tokens in authentication
- ✅ Ensure service role key is correct

#### 4. "Connection timeout" errors
- ✅ Check your internet connection
- ✅ Verify Supabase service status
- ✅ Try again after a few minutes

#### 5. Authentication not working
- ✅ Set up OAuth providers in Supabase → Authentication → Providers
- ✅ Configure redirect URLs
- ✅ Check NextAuth configuration in `lib/auth.ts`

### Getting Help

If you're still having issues:

1. **Check the Logs**:
   ```bash
   npm run logs:view        # Application logs
   npm run logs:errors      # Error logs
   ```

2. **Run Diagnostics**:
   ```bash
   npm run test:connections  # Connection test
   npm run security:check    # Security validation
   ```

3. **Supabase Dashboard**: Check your project logs in Supabase → Logs

4. **GitHub Issues**: Report issues at our [GitHub repository](https://github.com/your-repo/omnidash)

## 🌐 Production Deployment

### Environment Variables for Production

Make sure to set these in your production environment:

```bash
# Production URLs
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Security Keys (generate new ones!)
NEXTAUTH_SECRET=your_production_nextauth_secret
JWT_SECRET=your_production_jwt_secret
ENCRYPTION_KEY=your_32_character_encryption_key

# Disable development features
NODE_ENV=production
SKIP_ENV_VALIDATION=false
```

### Database Backup

Before deploying to production:

1. **Backup your data** from Supabase Dashboard → Database → Backups
2. **Test migrations** on a staging environment
3. **Monitor performance** after deployment

### Performance Tips

1. **Enable connection pooling** in your Supabase project settings
2. **Set up database indexes** for frequently queried fields
3. **Use Redis caching** for better performance (already configured)
4. **Monitor query performance** in Supabase logs

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [NextAuth.js with Supabase](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

---

## 🎉 You're All Set!

Once everything is deployed and connected, you'll have:

- ✅ **Fully functional database** with all required tables
- ✅ **Secure authentication** with social login support
- ✅ **Real-time capabilities** for live updates
- ✅ **File storage** for uploads and assets
- ✅ **Comprehensive logging** for monitoring and debugging
- ✅ **Production-ready security** with RLS and encryption

Welcome to OmniDash! 🚀