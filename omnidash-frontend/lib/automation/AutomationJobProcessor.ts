import { Job } from 'bullmq';
import { automationEngine } from '../../app/automation-engine';
import { jobQueue, WorkflowExecutionJob, SocialPostJob, EmailJob, WebhookJob, ContentGenerationJob } from '../queue/JobQueue';
import { SocialMediaManager } from '../integrations/SocialMediaManager';
import { realtimeManager } from '../realtime/RealtimeManager';

export class AutomationJobProcessor {
  private socialMediaManager: SocialMediaManager;

  constructor() {
    this.socialMediaManager = new SocialMediaManager();
    this.setupJobProcessors();
  }

  private setupJobProcessors() {
    // Setup workflow execution processor
    jobQueue.createWorkflowWorker(this.processWorkflowExecution.bind(this));
    
    // Setup social media processor
    jobQueue.createSocialWorker(this.processSocialPost.bind(this));
    
    // Setup email processor
    jobQueue.createEmailWorker(this.processEmail.bind(this));
    
    // Setup webhook processor
    jobQueue.createWebhookWorker(this.processWebhook.bind(this));
    
    // Setup content generation processor
    jobQueue.createContentWorker(this.processContentGeneration.bind(this));

    console.log('🔧 Automation job processors initialized');
  }

  // Process workflow execution jobs
  private async processWorkflowExecution(job: Job<WorkflowExecutionJob>): Promise<any> {
    const { workflowId, userId, executionId, triggerData, context } = job.data;
    
    console.log(`⚙️ Processing workflow execution: ${executionId}`);
    
    try {
      // Update job progress
      await job.updateProgress(10);
      
      // Notify real-time listeners
      realtimeManager.notifyWorkflowStarted(workflowId, executionId, userId);
      
      // Execute workflow using automation engine
      const result = await automationEngine.executeWorkflow(workflowId, triggerData || {});
      
      await job.updateProgress(90);
      
      // Notify completion
      realtimeManager.notifyWorkflowCompleted(workflowId, executionId, result, userId);
      
      await job.updateProgress(100);
      
      console.log(`✅ Workflow execution completed: ${executionId}`);
      return { success: true, result };
      
    } catch (error) {
      console.error(`❌ Workflow execution failed: ${executionId}`, error);
      
      // Notify failure
      realtimeManager.notifyWorkflowFailed(workflowId, executionId, error, userId);
      
      throw error;
    }
  }

  // Process social media posting jobs
  private async processSocialPost(job: Job<SocialPostJob>): Promise<any> {
    const { accountId, userId, content, platforms } = job.data;
    
    console.log(`📱 Processing social post for platforms: ${platforms.join(', ')}`);
    
    try {
      await job.updateProgress(20);
      
      // Get account details
      const account = this.socialMediaManager.getAccount(accountId);
      if (!account) {
        throw new Error(`Social account not found: ${accountId}`);
      }
      
      await job.updateProgress(40);
      
      // Post to each platform
      const results = await this.socialMediaManager.postToAccount(account, content);
      
      await job.updateProgress(80);
      
      // Notify success or failure
      if (results.success) {
        realtimeManager.notifyPostPublished(userId, results.postId || 'unknown', account.platform, results.url);
      } else {
        realtimeManager.notifyPostFailed(userId, 'unknown', account.platform, new Error(results.error || 'Unknown error'));
      }
      
      await job.updateProgress(100);
      
      console.log(`✅ Social post completed: ${results.success ? 'Success' : 'Failed'}`);
      return results;
      
    } catch (error) {
      console.error(`❌ Social post failed:`, error);
      realtimeManager.notifyPostFailed(userId, 'unknown', 'unknown', error as Error);
      throw error;
    }
  }

  // Process email jobs
  private async processEmail(job: Job<EmailJob>): Promise<any> {
    const { userId, to, subject, body, template, variables } = job.data;
    
    console.log(`📧 Processing email to: ${to.join(', ')}`);
    
    try {
      await job.updateProgress(25);
      
      // Process template variables if provided
      let processedBody = body;
      if (template && variables) {
        processedBody = this.processEmailTemplate(template, variables);
      }
      
      await job.updateProgress(50);
      
      // Send email (simulate for now)
      const emailResult = await this.sendEmail({
        to,
        subject,
        body: processedBody
      });
      
      await job.updateProgress(90);
      
      // Notify user
      realtimeManager.sendToUser(userId, {
        type: 'email:sent',
        data: { recipients: to, subject, messageId: emailResult.messageId },
        timestamp: new Date().toISOString()
      });
      
      await job.updateProgress(100);
      
      console.log(`✅ Email sent successfully: ${emailResult.messageId}`);
      return emailResult;
      
    } catch (error) {
      console.error(`❌ Email sending failed:`, error);
      
      realtimeManager.sendToUser(userId, {
        type: 'email:failed',
        data: { recipients: to, subject, error: (error as Error).message },
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  // Process webhook jobs
  private async processWebhook(job: Job<WebhookJob>): Promise<any> {
    const { userId, url, method, headers, body } = job.data;
    
    console.log(`🔗 Processing webhook: ${method} ${url}`);
    
    try {
      await job.updateProgress(30);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined
      });
      
      await job.updateProgress(70);
      
      const responseData = await response.json().catch(() => ({}));
      
      await job.updateProgress(90);
      
      // Notify user
      realtimeManager.sendToUser(userId, {
        type: 'webhook:delivered',
        data: { 
          url, 
          method, 
          status: response.status,
          statusText: response.statusText,
          responseData 
        },
        timestamp: new Date().toISOString()
      });
      
      await job.updateProgress(100);
      
      console.log(`✅ Webhook delivered: ${response.status} ${response.statusText}`);
      return { 
        status: response.status, 
        statusText: response.statusText, 
        data: responseData 
      };
      
    } catch (error) {
      console.error(`❌ Webhook delivery failed:`, error);
      
      realtimeManager.sendToUser(userId, {
        type: 'webhook:failed',
        data: { url, method, error: (error as Error).message },
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  // Process content generation jobs
  private async processContentGeneration(job: Job<ContentGenerationJob>): Promise<any> {
    const { userId, requestId, prompt, contentType, platforms, options } = job.data;
    
    console.log(`🤖 Processing content generation: ${contentType} for ${platforms.join(', ')}`);
    
    try {
      await job.updateProgress(20);
      
      // Generate content using AI (simulate for now)
      const generatedContent = await this.generateAIContent(prompt, contentType, options);
      
      await job.updateProgress(70);
      
      // Optimize content for each platform
      const platformContent = await this.optimizeContentForPlatforms(generatedContent, platforms);
      
      await job.updateProgress(90);
      
      // Notify user
      realtimeManager.sendToUser(userId, {
        type: 'content:generated',
        data: { 
          requestId,
          contentType,
          platforms,
          content: generatedContent,
          platformContent
        },
        timestamp: new Date().toISOString()
      });
      
      await job.updateProgress(100);
      
      console.log(`✅ Content generation completed: ${requestId}`);
      return { 
        requestId,
        content: generatedContent,
        platformContent
      };
      
    } catch (error) {
      console.error(`❌ Content generation failed:`, error);
      
      realtimeManager.sendToUser(userId, {
        type: 'content:failed',
        data: { requestId, error: (error as Error).message },
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  // Helper methods
  private processEmailTemplate(template: string, variables: Record<string, any>): string {
    let processedTemplate = template;
    
    // Simple template variable replacement
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processedTemplate = processedTemplate.replace(regex, String(value));
    });
    
    return processedTemplate;
  }

  private async sendEmail(emailData: { to: string[], subject: string, body: string }): Promise<{ messageId: string }> {
    // Simulate email sending
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ messageId: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` });
      }, 1000);
    });
  }

  private async generateAIContent(prompt: string, contentType: string, options?: any): Promise<string> {
    // Simulate AI content generation
    return new Promise((resolve) => {
      setTimeout(() => {
        const templates = {
          post: `🚀 ${prompt}\n\nGenerated with OmniDash automation! #automation #socialmedia`,
          article: `# ${prompt}\n\nThis is a generated article about the topic. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
          caption: `✨ ${prompt} #generated #content`,
          thread: `1/ ${prompt}\n\n2/ This is part two of the thread.\n\n3/ Final thoughts on ${prompt}.`
        };
        
        resolve(templates[contentType as keyof typeof templates] || templates.post);
      }, 2000);
    });
  }

  private async optimizeContentForPlatforms(content: string, platforms: string[]): Promise<Record<string, string>> {
    const optimized: Record<string, string> = {};
    
    platforms.forEach(platform => {
      switch (platform) {
        case 'twitter':
          optimized[platform] = content.substring(0, 280); // Twitter character limit
          break;
        case 'facebook':
          optimized[platform] = content; // Facebook has generous limits
          break;
        case 'instagram':
          optimized[platform] = content.substring(0, 2200); // Instagram caption limit
          break;
        case 'linkedin':
          optimized[platform] = content.substring(0, 3000); // LinkedIn limit
          break;
        default:
          optimized[platform] = content;
      }
    });
    
    return optimized;
  }

  // Queue management methods
  async addWorkflowExecutionJob(data: Omit<WorkflowExecutionJob, 'executionId'> & { executionId?: string }) {
    const executionId = data.executionId || `exec_${Date.now()}`;
    return jobQueue.addWorkflowExecutionJob({ ...data, executionId });
  }

  async addSocialPostJob(data: SocialPostJob, scheduledAt?: Date) {
    return jobQueue.addSocialPostJob(data, { scheduledAt });
  }

  async addEmailJob(data: EmailJob) {
    return jobQueue.addEmailJob(data);
  }

  async addWebhookJob(data: WebhookJob) {
    return jobQueue.addWebhookJob(data);
  }

  async addContentGenerationJob(data: ContentGenerationJob) {
    return jobQueue.addContentGenerationJob(data);
  }

  // Health check
  async getStatus() {
    return jobQueue.healthCheck();
  }

  // Shutdown
  async shutdown() {
    await jobQueue.shutdown();
    console.log('🔄 Automation job processor shutdown complete');
  }
}

// Export singleton
export const automationJobProcessor = new AutomationJobProcessor();