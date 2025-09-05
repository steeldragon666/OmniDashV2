-- OmniDash Database Schema for Supabase
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workflows table
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    user_id TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    definition JSONB NOT NULL DEFAULT '{"nodes": [], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 1}}',
    triggers TEXT[] DEFAULT ARRAY[]::TEXT[],
    variables JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{"errorHandling": "stop", "timeout": 30000, "retryOnFailure": false, "maxRetries": 3}',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workflow_executions table
CREATE TABLE IF NOT EXISTS public.workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    trigger_type TEXT,
    trigger_data JSONB DEFAULT '{}',
    execution_logs JSONB[] DEFAULT ARRAY[]::JSONB[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create social_accounts table
CREATE TABLE IF NOT EXISTS public.social_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('twitter', 'linkedin', 'instagram', 'facebook', 'youtube', 'tiktok')),
    account_name TEXT NOT NULL,
    account_id TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    profile_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, platform, account_id)
);

-- Create social_posts table
CREATE TABLE IF NOT EXISTS public.social_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    media_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    platforms TEXT[] NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    engagement_data JSONB DEFAULT '{}',
    workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_workflows_user_id ON workflows(user_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_social_accounts_user_id ON social_accounts(user_id);
CREATE INDEX idx_social_posts_user_id ON social_posts(user_id);
CREATE INDEX idx_social_posts_status ON social_posts(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to update updated_at automatically
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_accounts_updated_at BEFORE UPDATE ON social_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_posts_updated_at BEFORE UPDATE ON social_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (users can only see their own data)
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.email() = email);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.email() = email);

CREATE POLICY "Users can view own workflows" ON workflows FOR SELECT USING (auth.email() = user_id OR auth.uid()::TEXT = user_id);
CREATE POLICY "Users can create workflows" ON workflows FOR INSERT WITH CHECK (auth.email() = user_id OR auth.uid()::TEXT = user_id);
CREATE POLICY "Users can update own workflows" ON workflows FOR UPDATE USING (auth.email() = user_id OR auth.uid()::TEXT = user_id);
CREATE POLICY "Users can delete own workflows" ON workflows FOR DELETE USING (auth.email() = user_id OR auth.uid()::TEXT = user_id);

CREATE POLICY "Users can view own executions" ON workflow_executions FOR SELECT USING (auth.email() = user_id OR auth.uid()::TEXT = user_id);
CREATE POLICY "Users can create executions" ON workflow_executions FOR INSERT WITH CHECK (auth.email() = user_id OR auth.uid()::TEXT = user_id);

CREATE POLICY "Users can view own social accounts" ON social_accounts FOR SELECT USING (auth.email() = user_id OR auth.uid()::TEXT = user_id);
CREATE POLICY "Users can manage own social accounts" ON social_accounts FOR ALL USING (auth.email() = user_id OR auth.uid()::TEXT = user_id);

CREATE POLICY "Users can view own posts" ON social_posts FOR SELECT USING (auth.email() = user_id OR auth.uid()::TEXT = user_id);
CREATE POLICY "Users can manage own posts" ON social_posts FOR ALL USING (auth.email() = user_id OR auth.uid()::TEXT = user_id);

-- Insert some sample data for testing
INSERT INTO workflows (name, description, user_id, status, definition, triggers, tags)
VALUES 
    ('Content Generation Pipeline', 'Automated content creation and social media posting', 'demo@example.com', 'active', 
     '{"nodes": [{"id": "1", "type": "trigger", "position": {"x": 100, "y": 100}, "data": {"label": "Schedule Trigger"}}, {"id": "2", "type": "action", "position": {"x": 300, "y": 100}, "data": {"label": "Generate Content"}}], "edges": [{"id": "e1-2", "source": "1", "target": "2"}], "viewport": {"x": 0, "y": 0, "zoom": 1}}',
     ARRAY['schedule'], ARRAY['content', 'social']),
    ('Social Media Scheduler', 'Schedule and post content across multiple platforms', 'demo@example.com', 'draft',
     '{"nodes": [{"id": "1", "type": "trigger", "position": {"x": 100, "y": 100}, "data": {"label": "Manual Trigger"}}], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 1}}',
     ARRAY['manual'], ARRAY['social', 'scheduling']),
    ('Email Automation', 'Automated email campaigns and responses', 'demo@example.com', 'active',
     '{"nodes": [{"id": "1", "type": "trigger", "position": {"x": 100, "y": 100}, "data": {"label": "Email Trigger"}}], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 1}}',
     ARRAY['email'], ARRAY['email', 'automation'])
ON CONFLICT DO NOTHING;

-- Grant permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;