-- Initial OmniDash Schema Migration
-- This migration creates all required tables for the OmniDash application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (extends NextAuth default users table)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    image TEXT,
    email_verified TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts table (for OAuth providers - NextAuth)
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

-- Verification tokens (for email verification - NextAuth)
CREATE TABLE IF NOT EXISTS verification_tokens (
    identifier TEXT NOT NULL,
    token TEXT NOT NULL,
    expires TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (identifier, token)
);

-- Workflows table - Main automation workflows
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    user_id TEXT NOT NULL, -- Can reference users.email or users.id
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'paused', 'draft', 'archived')),
    definition JSONB NOT NULL DEFAULT '{}', -- ReactFlow definition
    triggers TEXT[] DEFAULT '{}', -- Array of trigger types
    variables JSONB DEFAULT '{}', -- Workflow variables
    settings JSONB DEFAULT '{}', -- Workflow settings (timeout, retry, etc.)
    tags TEXT[] DEFAULT '{}', -- Array of tags for categorization
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow executions table - Track workflow runs
CREATE TABLE workflow_executions (
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
    logs JSONB DEFAULT '[]' -- Array of log entries
);

-- Social media accounts table - Connected social accounts
CREATE TABLE social_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('twitter', 'facebook', 'instagram', 'linkedin', 'tiktok', 'youtube')),
    account_id TEXT NOT NULL,
    username TEXT,
    display_name TEXT,
    profile_image TEXT,
    access_token TEXT, -- Should be encrypted in production
    refresh_token TEXT, -- Should be encrypted in production
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform, account_id)
);

-- Social media posts table - Published and scheduled posts
CREATE TABLE social_posts (
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
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API keys table - User API keys for integrations
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL, -- Hashed API key for security
    service TEXT NOT NULL CHECK (service IN ('openai', 'anthropic', 'google', 'twitter', 'facebook', 'custom')),
    permissions TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brands table - User brands for organizing social media management
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    color_scheme JSONB DEFAULT '{"primary": "#7C3AED", "secondary": "#3B82F6"}',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- User settings table - App preferences and configuration
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL UNIQUE,
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    timezone TEXT DEFAULT 'UTC',
    email_notifications JSONB DEFAULT '{"workflow_completion": true, "security_alerts": true, "weekly_summary": true}',
    privacy_settings JSONB DEFAULT '{"profile_visibility": "private", "analytics_enabled": true}',
    feature_flags JSONB DEFAULT '{}',
    onboarding_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhooks table - Incoming webhook endpoints
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT, -- For signature verification
    events TEXT[] DEFAULT '{}', -- Array of event types to trigger on
    headers JSONB DEFAULT '{}', -- Custom headers to include
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table - Security and activity logging
CREATE TABLE audit_logs (
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- File uploads table - Handle file uploads and storage
CREATE TABLE file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    storage_bucket TEXT DEFAULT 'uploads',
    upload_status TEXT NOT NULL DEFAULT 'processing' CHECK (upload_status IN ('processing', 'completed', 'failed')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflows_tags ON workflows USING gin(tags);

CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_user_id ON workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_started_at ON workflow_executions(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_account_id ON social_posts(account_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled_at ON social_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_posts(platform);

CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_social_accounts_active ON social_accounts(is_active);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_service ON api_keys(service);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(event_severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);

CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_workflow_id ON webhooks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active);

CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id ON file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_status ON file_uploads(upload_status);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_workflows_search ON workflows USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_social_posts_search ON social_posts USING gin(to_tsvector('english', content));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
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