-- Sample data for development and testing
-- This migration inserts sample workflows and data for demonstration

-- Insert sample workflows for testing
INSERT INTO workflows (name, description, user_id, status, definition, triggers, tags, settings) VALUES
(
    'Daily Content Pipeline',
    'Automatically generates and schedules daily social media content using AI',
    'test@omnidash.dev',
    'active',
    '{
        "nodes": [
            {
                "id": "1",
                "type": "trigger",
                "position": {"x": 100, "y": 100},
                "data": {
                    "label": "Daily Schedule",
                    "description": "Triggers every day at 9 AM",
                    "schedule": "0 9 * * *"
                }
            },
            {
                "id": "2",
                "type": "ai",
                "position": {"x": 300, "y": 100},
                "data": {
                    "label": "Generate Content",
                    "description": "Use AI to generate social media content",
                    "provider": "openai",
                    "model": "gpt-4"
                }
            },
            {
                "id": "3",
                "type": "social",
                "position": {"x": 500, "y": 100},
                "data": {
                    "label": "Post to Twitter",
                    "description": "Schedule content to Twitter",
                    "platform": "twitter"
                }
            }
        ],
        "edges": [
            {"id": "e1-2", "source": "1", "target": "2"},
            {"id": "e2-3", "source": "2", "target": "3"}
        ],
        "viewport": {"x": 0, "y": 0, "zoom": 1}
    }',
    ARRAY['schedule'],
    ARRAY['content', 'ai', 'social'],
    '{
        "errorHandling": "continue",
        "timeout": 300000,
        "retryOnFailure": true,
        "maxRetries": 3,
        "notifications": {
            "onSuccess": true,
            "onFailure": true
        }
    }'
),
(
    'Lead Qualification Bot',
    'Automatically qualifies and nurtures new leads from various sources',
    'test@omnidash.dev',
    'active',
    '{
        "nodes": [
            {
                "id": "1",
                "type": "webhook",
                "position": {"x": 100, "y": 100},
                "data": {
                    "label": "New Lead Webhook",
                    "description": "Receives new leads from forms and landing pages"
                }
            },
            {
                "id": "2",
                "type": "condition",
                "position": {"x": 300, "y": 100},
                "data": {
                    "label": "Qualify Lead",
                    "description": "Check lead score and criteria",
                    "condition": "leadScore > 50"
                }
            },
            {
                "id": "3",
                "type": "email",
                "position": {"x": 500, "y": 50},
                "data": {
                    "label": "Send Welcome Email",
                    "description": "Send personalized welcome email to qualified leads",
                    "template": "lead_welcome"
                }
            },
            {
                "id": "4",
                "type": "crm",
                "position": {"x": 500, "y": 150},
                "data": {
                    "label": "Add to CRM",
                    "description": "Create contact in CRM system",
                    "system": "hubspot"
                }
            }
        ],
        "edges": [
            {"id": "e1-2", "source": "1", "target": "2"},
            {"id": "e2-3", "source": "2", "target": "3", "label": "Qualified"},
            {"id": "e2-4", "source": "2", "target": "4", "label": "Qualified"}
        ],
        "viewport": {"x": 0, "y": 0, "zoom": 1}
    }',
    ARRAY['webhook'],
    ARRAY['leads', 'crm', 'automation'],
    '{
        "errorHandling": "stop",
        "timeout": 60000,
        "retryOnFailure": true,
        "maxRetries": 2
    }'
),
(
    'Social Media Scheduler',
    'Batch schedules content across multiple social media platforms',
    'test@omnidash.dev',
    'draft',
    '{
        "nodes": [
            {
                "id": "1",
                "type": "trigger",
                "position": {"x": 100, "y": 100},
                "data": {
                    "label": "Manual Trigger",
                    "description": "Manually trigger content scheduling"
                }
            },
            {
                "id": "2",
                "type": "data",
                "position": {"x": 300, "y": 100},
                "data": {
                    "label": "Load Content Queue",
                    "description": "Load pending content from database",
                    "source": "database"
                }
            },
            {
                "id": "3",
                "type": "social",
                "position": {"x": 500, "y": 50},
                "data": {
                    "label": "Schedule Twitter",
                    "description": "Schedule posts to Twitter",
                    "platform": "twitter"
                }
            },
            {
                "id": "4",
                "type": "social",
                "position": {"x": 500, "y": 100},
                "data": {
                    "label": "Schedule LinkedIn",
                    "description": "Schedule posts to LinkedIn",
                    "platform": "linkedin"
                }
            },
            {
                "id": "5",
                "type": "social",
                "position": {"x": 500, "y": 150},
                "data": {
                    "label": "Schedule Instagram",
                    "description": "Schedule posts to Instagram",
                    "platform": "instagram"
                }
            }
        ],
        "edges": [
            {"id": "e1-2", "source": "1", "target": "2"},
            {"id": "e2-3", "source": "2", "target": "3"},
            {"id": "e2-4", "source": "2", "target": "4"},
            {"id": "e2-5", "source": "2", "target": "5"}
        ],
        "viewport": {"x": 0, "y": 0, "zoom": 1}
    }',
    ARRAY['manual'],
    ARRAY['social', 'scheduling'],
    '{
        "errorHandling": "continue",
        "timeout": 120000,
        "retryOnFailure": true,
        "maxRetries": 1
    }'
)
ON CONFLICT DO NOTHING;

-- Insert sample workflow executions
INSERT INTO workflow_executions (workflow_id, user_id, status, started_at, completed_at, execution_time, output_data)
SELECT 
    w.id,
    'test@omnidash.dev',
    'completed',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1 hour 58 minutes',
    120000,
    '{
        "contentGenerated": true,
        "postsScheduled": 3,
        "platforms": ["twitter", "linkedin"],
        "engagementPrediction": 85
    }'
FROM workflows w
WHERE w.name = 'Daily Content Pipeline'
ON CONFLICT DO NOTHING;

INSERT INTO workflow_executions (workflow_id, user_id, status, started_at, completed_at, execution_time, output_data)
SELECT 
    w.id,
    'test@omnidash.dev',
    'completed',
    NOW() - INTERVAL '4 hours',
    NOW() - INTERVAL '3 hours 59 minutes',
    45000,
    '{
        "leadsProcessed": 5,
        "qualified": 3,
        "emailsSent": 3,
        "crmRecords": 3
    }'
FROM workflows w
WHERE w.name = 'Lead Qualification Bot'
ON CONFLICT DO NOTHING;

-- Insert some failed executions for testing error handling
INSERT INTO workflow_executions (workflow_id, user_id, status, started_at, completed_at, execution_time, error_message, error_details)
SELECT 
    w.id,
    'test@omnidash.dev',
    'failed',
    NOW() - INTERVAL '6 hours',
    NOW() - INTERVAL '6 hours' + INTERVAL '30 seconds',
    30000,
    'API rate limit exceeded',
    '{
        "errorCode": "RATE_LIMIT_EXCEEDED",
        "retryAfter": 3600,
        "provider": "twitter",
        "endpoint": "/tweets"
    }'
FROM workflows w
WHERE w.name = 'Daily Content Pipeline'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Insert sample social posts
INSERT INTO social_posts (user_id, platform, content, status, published_at, engagement_stats) VALUES
('test@omnidash.dev', 'twitter', 'Just launched our new automation platform! 🚀 #automation #productivity', 'published', NOW() - INTERVAL '1 day', '{"likes": 45, "retweets": 12, "replies": 8}'),
('test@omnidash.dev', 'linkedin', 'Excited to share our latest workflow automation tools that help businesses save 10+ hours per week!', 'published', NOW() - INTERVAL '2 days', '{"likes": 23, "shares": 5, "comments": 3}'),
('test@omnidash.dev', 'twitter', 'AI-powered content generation is changing the game for social media management. Here''s what we''ve learned...', 'published', NOW() - INTERVAL '3 days', '{"likes": 67, "retweets": 18, "replies": 15}'),
('test@omnidash.dev', 'instagram', 'Behind the scenes of building the future of automation 📸', 'scheduled', NOW() + INTERVAL '2 hours', '{}'),
('test@omnidash.dev', 'linkedin', 'Weekly automation tip: Use conditional logic to create smarter workflows that adapt to different scenarios.', 'scheduled', NOW() + INTERVAL '1 day', '{}')
ON CONFLICT DO NOTHING;

-- Insert sample user settings
INSERT INTO user_settings (user_id, theme, timezone, email_notifications, privacy_settings, feature_flags) VALUES
('test@omnidash.dev', 'dark', 'America/New_York', 
 '{
    "workflow_completion": true,
    "workflow_failure": true,
    "security_alerts": true,
    "weekly_summary": true,
    "marketing_updates": false
 }',
 '{
    "profile_visibility": "private",
    "analytics_enabled": true,
    "data_sharing": false
 }',
 '{
    "beta_features": true,
    "advanced_workflows": true,
    "ai_suggestions": true
 }'
)
ON CONFLICT (user_id) DO NOTHING;

-- Insert sample audit logs
INSERT INTO audit_logs (user_id, event_type, event_severity, action, ip_address, success, details) VALUES
('test@omnidash.dev', 'workflow.create', 'low', 'create', '192.168.1.100', true, '{"workflow_name": "Daily Content Pipeline", "workflow_id": "uuid"}'),
('test@omnidash.dev', 'workflow.execute', 'low', 'execute', '192.168.1.100', true, '{"workflow_name": "Daily Content Pipeline", "execution_time": 120000}'),
('test@omnidash.dev', 'auth.login', 'low', 'login', '192.168.1.100', true, '{"provider": "email", "user_agent": "Mozilla/5.0..."}'),
('test@omnidash.dev', 'social.post', 'low', 'publish', '192.168.1.100', true, '{"platform": "twitter", "post_length": 67}'),
('test@omnidash.dev', 'workflow.update', 'low', 'update', '192.168.1.100', true, '{"workflow_name": "Lead Qualification Bot", "changes": ["description", "settings"]}')
ON CONFLICT DO NOTHING;