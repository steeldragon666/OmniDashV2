-- OmniDash Database Schema
-- This file sets up all required tables for the OmniDash application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (extends NextAuth users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    image TEXT,
    email_verified TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts table (for OAuth providers)
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, provider_account_id)
);

-- Sessions table (for NextAuth)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification tokens (for email verification)
CREATE TABLE IF NOT EXISTS verification_tokens (
    identifier TEXT NOT NULL,
    token TEXT NOT NULL,
    expires TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (identifier, token)
);

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    user_id TEXT NOT NULL, -- Can reference users.email or users.id
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'paused', 'draft', 'archived')),
    definition JSONB NOT NULL, -- ReactFlow definition
    triggers TEXT[] DEFAULT '{}', -- Array of trigger types
    variables JSONB DEFAULT '{}', -- Workflow variables
    settings JSONB DEFAULT '{}', -- Workflow settings
    tags TEXT[] DEFAULT '{}', -- Array of tags
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for better performance
    INDEX idx_workflows_user_id ON workflows(user_id),
    INDEX idx_workflows_status ON workflows(status),
    INDEX idx_workflows_created_at ON workflows(created_at),
    INDEX idx_workflows_tags ON workflows USING gin(tags)
);

-- Workflow executions table
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    execution_time INTEGER, -- Duration in milliseconds
    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',
    error_message TEXT,
    error_details JSONB,
    logs JSONB DEFAULT '[]', -- Array of log entries
    
    -- Indexes for better performance
    INDEX idx_executions_workflow_id ON workflow_executions(workflow_id),
    INDEX idx_executions_user_id ON workflow_executions(user_id),
    INDEX idx_executions_status ON workflow_executions(status),
    INDEX idx_executions_started_at ON workflow_executions(started_at)
);

-- Social media accounts table
CREATE TABLE IF NOT EXISTS social_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('twitter', 'facebook', 'instagram', 'linkedin', 'tiktok')),
    account_id TEXT NOT NULL,
    username TEXT,
    display_name TEXT,
    profile_image TEXT,
    access_token TEXT, -- Encrypted
    refresh_token TEXT, -- Encrypted
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint per user per platform
    UNIQUE(user_id, platform, account_id),
    INDEX idx_social_accounts_user_id ON social_accounts(user_id),
    INDEX idx_social_accounts_platform ON social_accounts(platform)
);

-- Social media posts table
CREATE TABLE IF NOT EXISTS social_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
    account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    post_id TEXT, -- Platform-specific post ID
    content TEXT NOT NULL,
    media_urls TEXT[] DEFAULT '{}',
    hashtags TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    engagement_stats JSONB DEFAULT '{}', -- likes, shares, comments, etc.
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_social_posts_user_id ON social_posts(user_id),
    INDEX idx_social_posts_account_id ON social_posts(account_id),
    INDEX idx_social_posts_status ON social_posts(status),
    INDEX idx_social_posts_scheduled_at ON social_posts(scheduled_at),
    INDEX idx_social_posts_platform ON social_posts(platform)
);

-- API keys table (for integrations)
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL, -- Hashed API key
    service TEXT NOT NULL, -- openai, anthropic, etc.
    permissions TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_api_keys_user_id ON api_keys(user_id),
    INDEX idx_api_keys_service ON api_keys(service),
    INDEX idx_api_keys_active ON api_keys(is_active)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT,
    session_id TEXT,
    event_type TEXT NOT NULL,
    event_severity TEXT NOT NULL CHECK (event_severity IN ('low', 'medium', 'high', 'critical')),
    resource_type TEXT,
    resource_id TEXT,
    action TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    request_id TEXT,
    endpoint TEXT,
    method TEXT,
    status_code INTEGER,
    success BOOLEAN NOT NULL,
    details JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_audit_logs_user_id ON audit_logs(user_id),
    INDEX idx_audit_logs_event_type ON audit_logs(event_type),
    INDEX idx_audit_logs_severity ON audit_logs(event_severity),
    INDEX idx_audit_logs_created_at ON audit_logs(created_at),
    INDEX idx_audit_logs_success ON audit_logs(success),
    INDEX idx_audit_logs_ip_address ON audit_logs(ip_address)
);

-- Settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL UNIQUE,
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    timezone TEXT DEFAULT 'UTC',
    email_notifications JSONB DEFAULT '{"workflow_completion": true, "security_alerts": true}',
    privacy_settings JSONB DEFAULT '{"profile_visibility": "private"}',
    feature_flags JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_user_settings_user_id ON user_settings(user_id)
);

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT, -- For signature verification
    events TEXT[] DEFAULT '{}', -- Array of event types
    headers JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_webhooks_user_id ON webhooks(user_id),
    INDEX idx_webhooks_workflow_id ON webhooks(workflow_id),
    INDEX idx_webhooks_active ON webhooks(is_active)
);

-- File uploads table
CREATE TABLE IF NOT EXISTS file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    upload_status TEXT NOT NULL DEFAULT 'processing' CHECK (upload_status IN ('processing', 'completed', 'failed')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_file_uploads_user_id ON file_uploads(user_id),
    INDEX idx_file_uploads_status ON file_uploads(upload_status),
    INDEX idx_file_uploads_created_at ON file_uploads(created_at)
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_social_accounts_updated_at BEFORE UPDATE ON social_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_social_posts_updated_at BEFORE UPDATE ON social_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_file_uploads_updated_at BEFORE UPDATE ON file_uploads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO workflows (name, description, user_id, status, definition, triggers, tags) 
VALUES 
    (
        'Daily Content Pipeline',
        'Generates and schedules daily social media content',
        'test@omnidash.dev',
        'active',
        '{"nodes": [{"id": "1", "type": "trigger", "position": {"x": 100, "y": 100}, "data": {"label": "Daily Schedule"}}], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 1}}',
        ARRAY['schedule'],
        ARRAY['content', 'automation']
    ),
    (
        'Lead Generation Workflow',
        'Automatically qualifies and processes new leads',
        'test@omnidash.dev',
        'draft',
        '{"nodes": [{"id": "1", "type": "webhook", "position": {"x": 100, "y": 100}, "data": {"label": "New Lead Webhook"}}], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 1}}',
        ARRAY['webhook'],
        ARRAY['leads', 'crm']
    )
ON CONFLICT DO NOTHING;

-- Insert sample social posts for dashboard stats
INSERT INTO social_posts (user_id, platform, content, status, published_at)
VALUES 
    ('test@omnidash.dev', 'twitter', 'Sample tweet content', 'published', NOW() - INTERVAL '1 day'),
    ('test@omnidash.dev', 'linkedin', 'Professional post content', 'published', NOW() - INTERVAL '2 days'),
    ('test@omnidash.dev', 'instagram', 'Visual content post', 'scheduled', NOW() + INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- Insert sample workflow executions
INSERT INTO workflow_executions (workflow_id, user_id, status, started_at, completed_at, execution_time)
SELECT 
    w.id,
    'test@omnidash.dev',
    'completed',
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '58 minutes',
    120000
FROM workflows w
WHERE w.name = 'Daily Content Pipeline'
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_search ON workflows USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_social_posts_search ON social_posts USING gin(to_tsvector('english', content));

-- Create RLS (Row Level Security) policies
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Workflows policies
CREATE POLICY "Users can view their own workflows" ON workflows FOR SELECT USING (user_id = current_user OR user_id = current_setting('app.current_user', true));
CREATE POLICY "Users can insert their own workflows" ON workflows FOR INSERT WITH CHECK (user_id = current_user OR user_id = current_setting('app.current_user', true));
CREATE POLICY "Users can update their own workflows" ON workflows FOR UPDATE USING (user_id = current_user OR user_id = current_setting('app.current_user', true));
CREATE POLICY "Users can delete their own workflows" ON workflows FOR DELETE USING (user_id = current_user OR user_id = current_setting('app.current_user', true));

-- Similar policies for other tables
CREATE POLICY "Users can manage their own executions" ON workflow_executions FOR ALL USING (user_id = current_user OR user_id = current_setting('app.current_user', true));
CREATE POLICY "Users can manage their own social posts" ON social_posts FOR ALL USING (user_id = current_user OR user_id = current_setting('app.current_user', true));
CREATE POLICY "Users can manage their own API keys" ON api_keys FOR ALL USING (user_id = current_user OR user_id = current_setting('app.current_user', true));
CREATE POLICY "Users can manage their own settings" ON user_settings FOR ALL USING (user_id = current_user OR user_id = current_setting('app.current_user', true));

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';