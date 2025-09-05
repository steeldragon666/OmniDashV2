-- Row Level Security (RLS) Policies for OmniDash
-- This migration sets up security policies to ensure users can only access their own data

-- Enable RLS on all user-specific tables
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Workflows policies
CREATE POLICY "Users can view their own workflows" ON workflows
    FOR SELECT USING (
        user_id = auth.jwt() ->> 'email' OR 
        user_id = auth.uid()::text OR
        user_id = (auth.jwt() ->> 'sub')
    );

CREATE POLICY "Users can insert their own workflows" ON workflows
    FOR INSERT WITH CHECK (
        user_id = auth.jwt() ->> 'email' OR 
        user_id = auth.uid()::text OR
        user_id = (auth.jwt() ->> 'sub')
    );

CREATE POLICY "Users can update their own workflows" ON workflows
    FOR UPDATE USING (
        user_id = auth.jwt() ->> 'email' OR 
        user_id = auth.uid()::text OR
        user_id = (auth.jwt() ->> 'sub')
    );

CREATE POLICY "Users can delete their own workflows" ON workflows
    FOR DELETE USING (
        user_id = auth.jwt() ->> 'email' OR 
        user_id = auth.uid()::text OR
        user_id = (auth.jwt() ->> 'sub')
    );

-- Workflow executions policies
CREATE POLICY "Users can view their own workflow executions" ON workflow_executions
    FOR SELECT USING (
        user_id = auth.jwt() ->> 'email' OR 
        user_id = auth.uid()::text OR
        user_id = (auth.jwt() ->> 'sub')
    );

CREATE POLICY "Users can insert their own workflow executions" ON workflow_executions
    FOR INSERT WITH CHECK (
        user_id = auth.jwt() ->> 'email' OR 
        user_id = auth.uid()::text OR
        user_id = (auth.jwt() ->> 'sub')
    );

CREATE POLICY "Users can update their own workflow executions" ON workflow_executions
    FOR UPDATE USING (
        user_id = auth.jwt() ->> 'email' OR 
        user_id = auth.uid()::text OR
        user_id = (auth.jwt() ->> 'sub')
    );

-- Social accounts policies
CREATE POLICY "Users can manage their own social accounts" ON social_accounts
    FOR ALL USING (
        user_id = auth.jwt() ->> 'email' OR 
        user_id = auth.uid()::text OR
        user_id = (auth.jwt() ->> 'sub')
    );

-- Social posts policies
CREATE POLICY "Users can manage their own social posts" ON social_posts
    FOR ALL USING (
        user_id = auth.jwt() ->> 'email' OR 
        user_id = auth.uid()::text OR
        user_id = (auth.jwt() ->> 'sub')
    );

-- API keys policies
CREATE POLICY "Users can manage their own API keys" ON api_keys
    FOR ALL USING (
        user_id = auth.jwt() ->> 'email' OR 
        user_id = auth.uid()::text OR
        user_id = (auth.jwt() ->> 'sub')
    );

-- User settings policies
CREATE POLICY "Users can manage their own settings" ON user_settings
    FOR ALL USING (
        user_id = auth.jwt() ->> 'email' OR 
        user_id = auth.uid()::text OR
        user_id = (auth.jwt() ->> 'sub')
    );

-- Webhooks policies
CREATE POLICY "Users can manage their own webhooks" ON webhooks
    FOR ALL USING (
        user_id = auth.jwt() ->> 'email' OR 
        user_id = auth.uid()::text OR
        user_id = (auth.jwt() ->> 'sub')
    );

-- File uploads policies
CREATE POLICY "Users can manage their own file uploads" ON file_uploads
    FOR ALL USING (
        user_id = auth.jwt() ->> 'email' OR 
        user_id = auth.uid()::text OR
        user_id = (auth.jwt() ->> 'sub')
    );

-- Audit logs policies (read-only for users, admin can view all)
CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (
        user_id = auth.jwt() ->> 'email' OR 
        user_id = auth.uid()::text OR
        user_id = (auth.jwt() ->> 'sub')
    );

-- Service role can bypass RLS for admin operations
CREATE POLICY "Service role can manage all data" ON workflows FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage all executions" ON workflow_executions FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage all social accounts" ON social_accounts FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage all social posts" ON social_posts FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage all API keys" ON api_keys FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage all settings" ON user_settings FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage all webhooks" ON webhooks FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage all uploads" ON file_uploads FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage all audit logs" ON audit_logs FOR ALL TO service_role USING (true);

-- Public access for health checks and metrics (no user data)
-- These would be handled by specific functions rather than direct table access

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant sequence permissions for UUID generation
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;