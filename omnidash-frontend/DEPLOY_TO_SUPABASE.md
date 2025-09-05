# 🚀 Deploy to Supabase - Quick Guide

## Option 1: Using Supabase Dashboard (Recommended)

Since your Supabase credentials are now configured, the easiest way to deploy is through the Supabase Dashboard:

### Step 1: Open SQL Editor
1. Go to: https://app.supabase.com/project/nihtacdpxhthgscpqfsc/sql
2. Click on "SQL Editor" in the left sidebar

### Step 2: Run Migration Scripts
Copy and paste each script below into the SQL Editor and click "Run":

#### 1️⃣ First - Create Tables
```sql
-- Run the content from: supabase/migrations/001_initial_schema.sql
```
Open file: `omnidash-frontend/supabase/migrations/001_initial_schema.sql`
Copy ALL content and paste into SQL Editor, then click "Run"

#### 2️⃣ Second - Set Up Security
```sql
-- Run the content from: supabase/migrations/002_row_level_security.sql
```
Open file: `omnidash-frontend/supabase/migrations/002_row_level_security.sql`
Copy ALL content and paste into SQL Editor, then click "Run"

#### 3️⃣ Third - Add Sample Data (Optional)
```sql
-- Run the content from: supabase/migrations/003_sample_data.sql
```
Open file: `omnidash-frontend/supabase/migrations/003_sample_data.sql`
Copy ALL content and paste into SQL Editor, then click "Run"

### Step 3: Verify Deployment
After running all scripts, verify your tables exist:
1. Go to "Table Editor" in the sidebar
2. You should see these tables:
   - workflows
   - workflow_executions
   - social_posts
   - social_accounts
   - users
   - accounts
   - sessions
   - And more...

## Option 2: Using Supabase CLI

If you prefer command-line deployment:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
npx supabase login

# Link to your project
npx supabase link --project-ref nihtacdpxhthgscpqfsc

# Push the schema
npx supabase db push
```

## Option 3: Direct SQL Execution Script

Create a simple script to copy to clipboard:

```bash
# Combine all SQL files
cat supabase/migrations/*.sql > combined_schema.sql

# Then paste the content of combined_schema.sql into Supabase SQL Editor
```

## ✅ Quick Verification

After deployment, run this in your terminal to test:

```bash
npm run test:connections
```

## 🎯 What Gets Created

- **14 Database Tables**: All core tables for the application
- **Security Policies**: Row-level security for data protection
- **Storage Buckets**: Already created (uploads, public-assets)
- **Sample Data**: Test data for development

## 📋 Deployment Status

✅ **Completed:**
- Environment variables configured
- Storage buckets created
- Connection established

⏳ **Pending:**
- Database tables creation
- RLS policies setup
- Sample data insertion

## 🚨 Important Notes

- The `exec_sql` function used by the automated script doesn't exist by default in Supabase
- Direct SQL execution through the Dashboard is the most reliable method
- Make sure to run the scripts in order (001, 002, 003)

## Need Help?

If you encounter issues:
1. Check the Supabase logs: Dashboard → Logs → Database
2. Verify your service role key has proper permissions
3. Ensure you're in the correct project

Your project URL: https://app.supabase.com/project/nihtacdpxhthgscpqfsc