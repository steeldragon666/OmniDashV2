import { automationEngine } from '../index';
import { WorkflowDefinition } from '../core/WorkflowEngine';

// Test workflow: Content creation to social media posting
export const contentToSocialWorkflow: WorkflowDefinition = {
  id: 'content-to-social-demo',
  name: 'AI Content to Social Media Pipeline',
  description: 'Generate AI content and automatically post to social media platforms',
  version: '1.0.0',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  triggers: [
    {
      id: 'schedule-trigger',
      type: 'schedule',
      config: {
        cronExpression: '0 9 * * 1-5' // 9 AM, Monday to Friday
      },
      enabled: true
    },
    {
      id: 'manual-trigger',
      type: 'manual',
      config: {},
      enabled: true
    }
  ],
  actions: [
    {
      id: 'generate-content',
      type: 'content_generation',
      name: 'Generate Marketing Content',
      config: {
        parameters: {
          prompt: 'Create engaging content about productivity tips for professionals',
          type: 'post',
          platforms: ['twitter', 'linkedin', 'facebook'],
          tone: 'professional',
          length: 'medium',
          keywords: ['productivity', 'business', 'efficiency']
        },
        timeout: 30000
      },
      nextActions: ['post-to-twitter', 'post-to-linkedin']
    },
    {
      id: 'post-to-twitter',
      type: 'social_post',
      name: 'Post to Twitter',
      config: {
        parameters: {
          accountId: 'demo-twitter-account',
          content: {
            text: '{{generate-content.content}}',
            hashtags: ['{{generate-content.hashtags}}']
          },
          options: {
            publishImmediately: true
          }
        }
      },
      nextActions: ['notify-completion']
    },
    {
      id: 'post-to-linkedin',
      type: 'social_post',
      name: 'Post to LinkedIn',
      config: {
        parameters: {
          accountId: 'demo-linkedin-account',
          content: {
            text: '{{generate-content.content}}',
            hashtags: ['{{generate-content.hashtags}}']
          },
          options: {
            publishImmediately: true
          }
        }
      },
      nextActions: ['notify-completion']
    },
    {
      id: 'notify-completion',
      type: 'webhook_trigger',
      name: 'Send Completion Notification',
      config: {
        parameters: {
          url: 'https://hooks.slack.com/demo',
          method: 'POST',
          payload: {
            text: 'Content posted successfully to social media!',
            details: {
              twitterPost: '{{post-to-twitter.postId}}',
              linkedinPost: '{{post-to-linkedin.postId}}'
            }
          }
        }
      }
    }
  ],
  conditions: [
    {
      id: 'content-quality-check',
      type: 'if',
      conditions: [
        {
          field: 'generate-content.sentiment',
          operator: 'eq',
          value: 'positive'
        }
      ],
      trueBranch: ['post-to-twitter', 'post-to-linkedin'],
      falseBranch: ['regenerate-content']
    }
  ],
  metadata: {
    category: 'content-marketing',
    tags: ['ai', 'social-media', 'automation'],
    author: 'automation-engine'
  }
};

// Test workflow: Webhook to content generation
export const webhookToContentWorkflow: WorkflowDefinition = {
  id: 'webhook-content-generator',
  name: 'Webhook-Triggered Content Generator',
  description: 'Generate content based on webhook data and post to multiple platforms',
  version: '1.0.0',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  triggers: [
    {
      id: 'webhook-trigger',
      type: 'event',
      config: {
        eventName: 'webhook.received'
      },
      enabled: true
    }
  ],
  actions: [
    {
      id: 'extract-webhook-data',
      type: 'data',
      name: 'Extract Webhook Data',
      config: {
        parameters: {
          topic: '{{webhook.payload.topic}}',
          urgency: '{{webhook.payload.urgency}}',
          audience: '{{webhook.payload.target_audience}}'
        }
      },
      nextActions: ['generate-custom-content']
    },
    {
      id: 'generate-custom-content',
      type: 'content_generation',
      name: 'Generate Custom Content',
      config: {
        parameters: {
          prompt: 'Create content about {{extract-webhook-data.topic}} for {{extract-webhook-data.audience}}',
          type: 'post',
          platforms: ['twitter', 'facebook', 'instagram'],
          tone: '{{extract-webhook-data.urgency === "high" ? "urgent" : "casual"}}',
          length: 'short'
        }
      },
      nextActions: ['schedule-posts']
    },
    {
      id: 'schedule-posts',
      type: 'social_post',
      name: 'Schedule Social Posts',
      config: {
        parameters: {
          accountId: 'multi-platform-account',
          content: {
            text: '{{generate-custom-content.content}}',
            hashtags: ['{{generate-custom-content.hashtags}}']
          },
          options: {
            scheduledFor: '{{new Date(Date.now() + 3600000)}}', // 1 hour from now
            crossPostTo: ['twitter', 'facebook', 'instagram']
          }
        }
      }
    }
  ],
  conditions: [],
  metadata: {
    category: 'webhook-automation',
    tags: ['webhook', 'content', 'multi-platform'],
    author: 'automation-engine'
  }
};

// Test workflow: Event-driven workflow chain
export const eventChainWorkflow: WorkflowDefinition = {
  id: 'event-chain-demo',
  name: 'Event-Driven Workflow Chain',
  description: 'Demonstrates event-based workflow chaining and state management',
  version: '1.0.0',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  triggers: [
    {
      id: 'user-action-trigger',
      type: 'event',
      config: {
        eventName: 'user.action'
      },
      enabled: true
    }
  ],
  actions: [
    {
      id: 'process-user-action',
      type: 'data',
      name: 'Process User Action',
      config: {
        parameters: {
          userId: '{{event.data.userId}}',
          action: '{{event.data.action}}',
          timestamp: '{{event.timestamp}}'
        }
      },
      nextActions: ['determine-response']
    },
    {
      id: 'determine-response',
      type: 'condition',
      name: 'Determine Response Type',
      config: {
        conditions: [
          {
            field: 'process-user-action.action',
            operator: 'eq',
            value: 'signup'
          }
        ]
      },
      nextActions: ['send-welcome-sequence']
    },
    {
      id: 'send-welcome-sequence',
      type: 'content_generation',
      name: 'Generate Welcome Content',
      config: {
        parameters: {
          prompt: 'Create a personalized welcome message for new user',
          type: 'email',
          platforms: ['email'],
          tone: 'friendly',
          variables: {
            userName: '{{process-user-action.userId}}'
          }
        }
      },
      nextActions: ['trigger-follow-up']
    },
    {
      id: 'trigger-follow-up',
      type: 'delay',
      name: 'Wait for Follow-up',
      config: {
        parameters: {
          delay: 86400000 // 24 hours
        }
      },
      nextActions: ['chain-next-workflow']
    },
    {
      id: 'chain-next-workflow',
      type: 'workflow',
      name: 'Chain to Follow-up Workflow',
      config: {
        parameters: {
          workflowId: 'user-onboarding-day-2',
          input: {
            userId: '{{process-user-action.userId}}',
            welcomeEmailSent: true
          }
        }
      }
    }
  ],
  conditions: [],
  metadata: {
    category: 'user-onboarding',
    tags: ['events', 'chaining', 'user-journey'],
    author: 'automation-engine'
  }
};

// Function to set up test data and run demonstrations
export async function setupTestEnvironment() {
  console.log('🧪 Setting up automation test environment...');

  try {
    // 1. Create demo social media accounts
    const twitterAccountId = automationEngine.socialPublisher.addAccount({
      platform: 'twitter',
      accountId: 'demo_twitter',
      username: 'demo_twitter',
      displayName: 'Demo Twitter Account',
      accessToken: 'demo_access_token',
      isActive: true,
      permissions: ['read', 'write'],
      metadata: { demo: true }
    });

    const linkedinAccountId = automationEngine.socialPublisher.addAccount({
      platform: 'linkedin',
      accountId: 'demo_linkedin',
      username: 'demo_linkedin',
      displayName: 'Demo LinkedIn Account',
      accessToken: 'demo_access_token',
      isActive: true,
      permissions: ['read', 'write'],
      metadata: { demo: true }
    });

    console.log(`✅ Created demo accounts: Twitter (${twitterAccountId}), LinkedIn (${linkedinAccountId})`);

    // 2. Register test workflows
    await automationEngine.createWorkflow(contentToSocialWorkflow);
    await automationEngine.createWorkflow(webhookToContentWorkflow);
    await automationEngine.createWorkflow(eventChainWorkflow);

    console.log('✅ Registered test workflows');

    // 3. Set up webhook endpoints and triggers
    const genericEndpointId = await automationEngine.createWebhookEndpoint({
      name: 'Demo Webhook Endpoint',
      url: '/webhook/demo',
      method: 'POST',
      description: 'Demo webhook for testing',
      headers: { 'Content-Type': 'application/json' },
      filters: [],
      retryPolicy: {
        maxRetries: 3,
        backoffStrategy: 'exponential',
        initialDelay: 1000
      }
    });

    const webhookTriggerId = await automationEngine.createWebhookTrigger({
      name: 'Demo Webhook Trigger',
      workflowId: 'webhook-content-generator',
      endpointId: genericEndpointId,
      description: 'Trigger content generation from webhook',
      conditions: [
        { field: 'body.topic', operator: 'exists', value: null, required: true }
      ],
      dataMapping: [
        { sourceField: 'body.topic', targetField: 'topic' },
        { sourceField: 'body.urgency', targetField: 'urgency', defaultValue: 'normal' },
        { sourceField: 'body.target_audience', targetField: 'audience', defaultValue: 'general' }
      ],
      response: {
        statusCode: 200,
        body: { message: 'Webhook received, content generation started' }
      }
    });

    console.log(`✅ Created webhook endpoint (${genericEndpointId}) and trigger (${webhookTriggerId})`);

    // 4. Schedule recurring workflow
    const scheduledTaskId = await automationEngine.scheduleWorkflow(
      'content-to-social-demo',
      '0 9 * * 1-5', // 9 AM weekdays
      {
        timezone: 'UTC',
        metadata: { type: 'demo', recurring: true }
      }
    );

    console.log(`✅ Scheduled recurring task: ${scheduledTaskId}`);

    // 5. Set up event subscriptions
    const eventSubscriptionId = await automationEngine.subscribeToEvent(
      'user.action',
      'event-chain-demo',
      {
        filters: [
          { field: 'action', operator: 'eq', value: 'signup' }
        ],
        priority: 1,
        metadata: { demo: true }
      }
    );

    console.log(`✅ Created event subscription: ${eventSubscriptionId}`);

    return {
      accounts: { twitterAccountId, linkedinAccountId },
      workflows: ['content-to-social-demo', 'webhook-content-generator', 'event-chain-demo'],
      webhooks: { endpointId: genericEndpointId, triggerId: webhookTriggerId },
      schedule: { taskId: scheduledTaskId },
      events: { subscriptionId: eventSubscriptionId }
    };

  } catch (error) {
    console.error('❌ Error setting up test environment:', error);
    throw error;
  }
}

// Function to run test scenarios
export async function runTestScenarios(testSetup: any) {
  console.log('🎯 Running automation test scenarios...');

  try {
    // Scenario 1: Manual workflow execution
    console.log('\n📋 Scenario 1: Manual Workflow Execution');
    const manualExecution = await automationEngine.executeWorkflow(
      'content-to-social-demo',
      {
        customPrompt: 'Create content about remote work productivity',
        targetAudience: 'remote workers'
      },
      'manual'
    );
    console.log(`✅ Manual execution started: ${manualExecution.id}`);

    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Scenario 2: Event-based trigger
    console.log('\n📋 Scenario 2: Event-Based Trigger');
    await automationEngine.publishEvent(
      'user.action',
      {
        userId: 'test-user-123',
        action: 'signup',
        email: 'test@example.com',
        timestamp: new Date().toISOString()
      },
      'user-service'
    );
    console.log('✅ User signup event published');

    // Scenario 3: Webhook simulation
    console.log('\n📋 Scenario 3: Webhook Simulation');
    const webhookResponse = await automationEngine.webhookService.receiveWebhook(
      testSetup.webhooks.endpointId,
      'POST',
      '/webhook/demo',
      { 'Content-Type': 'application/json' },
      {
        topic: 'sustainable technology',
        urgency: 'high',
        target_audience: 'tech enthusiasts'
      }
    );
    console.log(`✅ Webhook processed with status: ${webhookResponse.statusCode}`);

    // Scenario 4: Content generation
    console.log('\n📋 Scenario 4: Direct Content Generation');
    const contentRequestId = await automationEngine.generateContent({
      prompt: 'Write about the future of AI in business automation',
      contentType: 'article',
      targetPlatforms: ['blog', 'linkedin'],
      tone: 'professional',
      length: 'long',
      keywords: ['AI', 'automation', 'business', 'future'],
      hashtags: ['AIAutomation', 'FutureTech', 'BusinessInnovation']
    });
    console.log(`✅ Content generation started: ${contentRequestId}`);

    // Scenario 5: Social media posting
    console.log('\n📋 Scenario 5: Social Media Posting');
    const postId = await automationEngine.schedulePost(
      testSetup.accounts.twitterAccountId,
      {
        text: '🚀 Testing our new automation engine! #AutomationEngine #TechDemo',
        hashtags: ['AutomationEngine', 'TechDemo', 'Innovation']
      },
      {
        publishImmediately: false,
        scheduledFor: new Date(Date.now() + 300000) // 5 minutes from now
      }
    );
    console.log(`✅ Social post scheduled: ${postId}`);

    return {
      manualExecution: manualExecution.id,
      contentRequest: contentRequestId,
      socialPost: postId,
      webhook: webhookResponse
    };

  } catch (error) {
    console.error('❌ Error running test scenarios:', error);
    throw error;
  }
}

// Function to display test results and status
export async function displayTestResults() {
  console.log('\n📊 Automation Engine Status Report');
  console.log('=====================================');

  const status = automationEngine.getStatus();
  const metrics = automationEngine.getMetrics();
  const health = await automationEngine.healthCheck();

  console.log(`\n🟢 Engine Status: ${status.status}`);
  console.log(`⏱️  Uptime: ${Math.round(status.uptime / 60)} minutes`);
  console.log(`💾 Memory Usage: ${Math.round(status.memory.used / 1024 / 1024)}MB`);

  console.log('\n📈 Component Metrics:');
  console.log(`  • Workflows: ${metrics.workflows.total} registered, ${metrics.workflows.executions} executions`);
  console.log(`  • Events: ${metrics.events.totalEvents} total, ${metrics.events.recentEvents} recent`);
  console.log(`  • States: ${metrics.states.total} total, ${metrics.states.active} active`);
  console.log(`  • Webhooks: ${metrics.webhooks.endpoints} endpoints, ${metrics.webhooks.totalPayloads} payloads processed`);

  console.log('\n🏥 Health Check:');
  Object.entries(health.checks).forEach(([component, isHealthy]) => {
    console.log(`  • ${component}: ${isHealthy ? '✅' : '❌'}`);
  });

  console.log('\n✨ Test Environment Ready!');
  console.log('You can now interact with the automation engine through the API endpoints.');
}

// Main test function
export async function runCompleteTest() {
  console.log('🚀 Starting Complete Automation Engine Test');
  console.log('===========================================\n');

  try {
    // Setup test environment
    const testSetup = await setupTestEnvironment();
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Run test scenarios
    const testResults = await runTestScenarios(testSetup);
    
    // Display results
    await displayTestResults();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\nTest Results Summary:');
    console.log(`  • Manual Execution ID: ${testResults.manualExecution}`);
    console.log(`  • Content Request ID: ${testResults.contentRequest}`);
    console.log(`  • Social Post ID: ${testResults.socialPost}`);
    console.log(`  • Webhook Response: ${JSON.stringify(testResults.webhook)}`);
    
    return true;

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    return false;
  }
}