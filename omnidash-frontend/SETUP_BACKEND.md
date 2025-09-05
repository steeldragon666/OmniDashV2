# 🚨 CRITICAL: Backend Setup Instructions

## ❌ Current Status: BACKEND NOT CONNECTED
The app is currently showing **MOCK DATA ONLY**. No data is being saved or retrieved from a real database.

## ✅ Steps to Connect the Backend

### Step 1: Get Your Supabase Service Role Key
1. Go to: https://supabase.com/dashboard/project/nihtacdpxhthgscpqfsc/settings/api
2. Sign in with your GitHub account
3. Find the section labeled "**service_role (secret)**"
4. Click "Reveal" and copy the entire key
5. It should look like: `eyJhbGciOiJIUzI1NiIsInR5cCI...` (very long string)

### Step 2: Create Database Tables
1. Go to: https://supabase.com/dashboard/project/nihtacdpxhthgscpqfsc/sql/new
2. Copy the ENTIRE content from: `supabase/schema.sql`
3. Paste it into the SQL editor
4. Click "Run" to create all tables

### Step 3: Update Environment Variables in Vercel
1. Go to: https://vercel.com/dashboard
2. Find your "omnidash-frontend" project
3. Go to Settings → Environment Variables
4. Add/Update these variables:

```bash
SUPABASE_SERVICE_ROLE_KEY=<paste-your-service-role-key-here>
NEXTAUTH_URL=https://omnidash-frontend.vercel.app
NEXTAUTH_SECRET=<generate-a-random-32-character-string>
```

### Step 4: Test the Connection
After deploying with the correct keys, test these endpoints:

1. **Check if database is connected:**
   - Visit: https://omnidash-frontend.vercel.app/api/dashboard/stats
   - If connected, you'll see real data instead of the mock numbers

2. **Test workflow creation:**
   - Login to the app
   - Go to Workflows
   - Create a new workflow
   - Refresh the page - if it persists, the backend is connected!

## 🔑 What Each Key Does

- **NEXT_PUBLIC_SUPABASE_URL**: Your database URL (✅ Already set)
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Public key for client-side queries (✅ Already set)
- **SUPABASE_SERVICE_ROLE_KEY**: ❌ **MISSING** - Admin key for server-side operations
- **NEXTAUTH_SECRET**: Session encryption key (needs to be set in production)

## 📊 How to Verify It's Working

### ✅ Signs Backend IS Connected:
- Dashboard shows different numbers each time you create/delete workflows
- Workflows persist after page refresh
- Social accounts can be connected and saved
- Login sessions persist across browser restarts

### ❌ Signs Backend is NOT Connected (current state):
- Dashboard always shows the same numbers (12 workflows, 248 executions, etc.)
- Workflows disappear after refresh
- Can't actually save any data
- Everything resets when you reload

## 🚀 Quick Test

Run this in your browser console on the deployed site:
```javascript
fetch('/api/dashboard/stats')
  .then(r => r.json())
  .then(data => {
    if (data.stats.workflows.total === 12) {
      console.error('❌ USING MOCK DATA - Backend not connected!');
    } else {
      console.log('✅ Backend connected! Real data:', data);
    }
  });
```

## 📝 Important Notes

1. **Without the service role key**, the app CANNOT:
   - Save any data
   - Retrieve real information
   - Create actual workflows
   - Store user preferences

2. **The mock data fallback** makes it LOOK like it works, but nothing is actually saved

3. **Once connected**, all features will work:
   - Real-time workflow execution
   - Social media posting
   - Data persistence
   - User management

## Need Help?

If you're stuck:
1. Make sure you're logged into Supabase with the correct account
2. The project ID is: `nihtacdpxhthgscpqfsc`
3. Check that the tables were created successfully in the SQL editor
4. Verify environment variables are set in Vercel (not just locally)