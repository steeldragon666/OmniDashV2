import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import handlebars from 'handlebars';

const prisma = new PrismaClient();

export interface EmailTemplate {
  name: string;
  subject: string;
  htmlTemplate: string;
  textTemplate?: string;
  variables: string[];
}

export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
    contentType?: string;
  }>;
}

export interface TemplateEmailOptions {
  templateName: string;
  to: string | string[];
  variables: Record<string, any>;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
    contentType?: string;
  }>;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private templates: Map<string, EmailTemplate>;

  constructor() {
    this.transporter = this.createTransporter();
    this.templates = new Map();
    this.loadTemplates();
  }

  private createTransporter(): nodemailer.Transporter {
    const config = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    };

    return nodemailer.createTransporter(config);
  }

  private async loadTemplates(): Promise<void> {
    const templatesDir = path.join(__dirname, '../templates/email');
    
    // Ensure templates directory exists
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
      await this.createDefaultTemplates(templatesDir);
    }

    // Load template files
    try {
      const templateFiles = fs.readdirSync(templatesDir);
      
      for (const file of templateFiles) {
        if (file.endsWith('.json')) {
          const templatePath = path.join(templatesDir, file);
          const templateData = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
          this.templates.set(templateData.name, templateData);
        }
      }
    } catch (error) {
      console.error('Error loading email templates:', error);
    }
  }

  private async createDefaultTemplates(templatesDir: string): Promise<void> {
    const defaultTemplates: EmailTemplate[] = [
      {
        name: 'welcome',
        subject: 'Welcome to {{brandName}} - Your OmniDash Account is Ready!',
        htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to {{brandName}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { background: #333; color: #ccc; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to {{brandName}}!</h1>
            <p>Your multi-brand social media management platform</p>
        </div>
        <div class="content">
            <h2>Hi {{userName}},</h2>
            <p>Welcome to OmniDash! We're excited to have you on board.</p>
            <p>Your account has been successfully created and you can now:</p>
            <ul>
                <li>✨ Manage multiple brands from one dashboard</li>
                <li>🤖 Generate AI-powered content</li>
                <li>📊 Track analytics and performance</li>
                <li>⚡ Automate your social media workflows</li>
            </ul>
            <a href="{{loginUrl}}" class="button">Get Started</a>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Best regards,<br>The OmniDash Team</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 OmniDash. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`,
        textTemplate: `Welcome to {{brandName}}!

Hi {{userName}},

Welcome to OmniDash! We're excited to have you on board.

Your account has been successfully created and you can now:
- Manage multiple brands from one dashboard
- Generate AI-powered content
- Track analytics and performance
- Automate your social media workflows

Get started: {{loginUrl}}

If you have any questions, feel free to reach out to our support team.

Best regards,
The OmniDash Team`,
        variables: ['brandName', 'userName', 'loginUrl']
      },
      {
        name: 'password-reset',
        subject: 'Reset Your {{brandName}} Password',
        htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Password Reset</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; }
        .button { display: inline-block; background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { background: #333; color: #ccc; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset Request</h1>
        </div>
        <div class="content">
            <h2>Hi {{userName}},</h2>
            <p>You requested to reset your password for your {{brandName}} account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="{{resetUrl}}" class="button">Reset Password</a>
            <div class="warning">
                <strong>⚠️ Important:</strong> This link will expire in {{expirationTime}}. If you didn't request this password reset, please ignore this email.
            </div>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p><a href="{{resetUrl}}">{{resetUrl}}</a></p>
            <p>Best regards,<br>The {{brandName}} Team</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 {{brandName}}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`,
        textTemplate: `Password Reset Request

Hi {{userName}},

You requested to reset your password for your {{brandName}} account.

Reset your password: {{resetUrl}}

⚠️ Important: This link will expire in {{expirationTime}}. If you didn't request this password reset, please ignore this email.

Best regards,
The {{brandName}} Team`,
        variables: ['userName', 'brandName', 'resetUrl', 'expirationTime']
      },
      {
        name: 'weekly-report',
        subject: '📊 Weekly Analytics Report for {{brandName}}',
        htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Weekly Report</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 700px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; }
        .metric-card { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; color: #667eea; }
        .metric-label { color: #666; margin-top: 5px; }
        .growth-positive { color: #28a745; }
        .growth-negative { color: #dc3545; }
        .footer { background: #333; color: #ccc; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
        .row { display: flex; gap: 20px; }
        .col { flex: 1; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Weekly Report</h1>
            <p>{{brandName}} Performance Summary</p>
            <p>{{weekStart}} - {{weekEnd}}</p>
        </div>
        <div class="content">
            <h2>Key Metrics</h2>
            <div class="row">
                <div class="col">
                    <div class="metric-card">
                        <div class="metric-value">{{totalFollowers}}</div>
                        <div class="metric-label">Total Followers</div>
                        <div class="growth-{{followersGrowthClass}}">{{followersGrowth}}%</div>
                    </div>
                </div>
                <div class="col">
                    <div class="metric-card">
                        <div class="metric-value">{{totalPosts}}</div>
                        <div class="metric-label">Posts Published</div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col">
                    <div class="metric-card">
                        <div class="metric-value">{{avgEngagement}}%</div>
                        <div class="metric-label">Avg. Engagement Rate</div>
                        <div class="growth-{{engagementGrowthClass}}">{{engagementGrowth}}%</div>
                    </div>
                </div>
                <div class="col">
                    <div class="metric-card">
                        <div class="metric-value">{{totalReach}}</div>
                        <div class="metric-label">Total Reach</div>
                    </div>
                </div>
            </div>
            
            <h2>🏆 Top Performing Posts</h2>
            {{#each topPosts}}
            <div class="metric-card">
                <strong>{{platform}} Post</strong><br>
                {{content}}<br>
                <small>Engagement: {{engagementRate}}% | Published: {{publishedAt}}</small>
            </div>
            {{/each}}

            <h2>📈 Platform Performance</h2>
            {{#each platforms}}
            <div class="metric-card">
                <strong>{{platform}}</strong>: {{followers}} followers, {{avgEngagement}}% avg. engagement
            </div>
            {{/each}}

            <p><strong>Generated on:</strong> {{generatedAt}}</p>
            <p>Want more detailed insights? <a href="{{dashboardUrl}}">View Dashboard</a></p>
        </div>
        <div class="footer">
            <p>&copy; 2024 {{brandName}}. Generated by OmniDash.</p>
        </div>
    </div>
</body>
</html>`,
        textTemplate: `Weekly Report - {{brandName}}
{{weekStart}} - {{weekEnd}}

KEY METRICS:
- Total Followers: {{totalFollowers}} ({{followersGrowth}}%)
- Posts Published: {{totalPosts}}
- Avg. Engagement Rate: {{avgEngagement}}% ({{engagementGrowth}}%)
- Total Reach: {{totalReach}}

TOP PERFORMING POSTS:
{{#each topPosts}}
- {{platform}}: {{content}} ({{engagementRate}}%)
{{/each}}

PLATFORM PERFORMANCE:
{{#each platforms}}
- {{platform}}: {{followers}} followers, {{avgEngagement}}% avg. engagement
{{/each}}

View detailed dashboard: {{dashboardUrl}}

Generated on: {{generatedAt}}`,
        variables: ['brandName', 'weekStart', 'weekEnd', 'totalFollowers', 'followersGrowth', 'followersGrowthClass', 'totalPosts', 'avgEngagement', 'engagementGrowth', 'engagementGrowthClass', 'totalReach', 'topPosts', 'platforms', 'generatedAt', 'dashboardUrl']
      },
      {
        name: 'workflow-alert',
        subject: '⚠️ Workflow Alert: {{workflowName}} - {{brandName}}',
        htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Workflow Alert</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ffc107; color: #333; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; }
        .alert-box { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .status-{{status}} { color: {{statusColor}}; font-weight: bold; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { background: #333; color: #ccc; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Workflow Alert</h1>
            <p>{{brandName}} - {{workflowName}}</p>
        </div>
        <div class="content">
            <div class="alert-box">
                <h2>Workflow Status: <span class="status-{{status}}">{{statusText}}</span></h2>
                <p><strong>Workflow:</strong> {{workflowName}}</p>
                <p><strong>Executed At:</strong> {{executedAt}}</p>
                <p><strong>Status:</strong> {{statusText}}</p>
                {{#if errorMessage}}
                <p><strong>Error:</strong> {{errorMessage}}</p>
                {{/if}}
            </div>
            
            <h3>Details:</h3>
            <ul>
                <li>Execution ID: {{executionId}}</li>
                <li>Duration: {{duration}}</li>
                <li>Actions Completed: {{completedActions}}/{{totalActions}}</li>
            </ul>

            {{#if nextSteps}}
            <h3>Recommended Actions:</h3>
            <ul>
            {{#each nextSteps}}
                <li>{{this}}</li>
            {{/each}}
            </ul>
            {{/if}}

            <a href="{{workflowUrl}}" class="button">View Workflow Details</a>
        </div>
        <div class="footer">
            <p>&copy; 2024 {{brandName}}. Alert generated by OmniDash.</p>
        </div>
    </div>
</body>
</html>`,
        textTemplate: `Workflow Alert - {{brandName}}

Workflow: {{workflowName}}
Status: {{statusText}}
Executed At: {{executedAt}}

{{#if errorMessage}}
Error: {{errorMessage}}
{{/if}}

Details:
- Execution ID: {{executionId}}
- Duration: {{duration}}
- Actions Completed: {{completedActions}}/{{totalActions}}

{{#if nextSteps}}
Recommended Actions:
{{#each nextSteps}}
- {{this}}
{{/each}}
{{/if}}

View workflow details: {{workflowUrl}}`,
        variables: ['brandName', 'workflowName', 'status', 'statusText', 'statusColor', 'executedAt', 'errorMessage', 'executionId', 'duration', 'completedActions', 'totalActions', 'nextSteps', 'workflowUrl']
      }
    ];

    // Save templates to files
    for (const template of defaultTemplates) {
      const templatePath = path.join(templatesDir, `${template.name}.json`);
      fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"OmniDash" <${process.env.SMTP_USER}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Email send error:', error);
      return false;
    }
  }

  async sendTemplateEmail(options: TemplateEmailOptions): Promise<boolean> {
    const template = this.templates.get(options.templateName);
    if (!template) {
      throw new Error(`Email template '${options.templateName}' not found`);
    }

    // Compile templates with Handlebars
    const htmlTemplate = handlebars.compile(template.htmlTemplate);
    const textTemplate = template.textTemplate ? handlebars.compile(template.textTemplate) : null;
    const subjectTemplate = handlebars.compile(template.subject);

    const html = htmlTemplate(options.variables);
    const text = textTemplate ? textTemplate(options.variables) : undefined;
    const subject = subjectTemplate(options.variables);

    return await this.sendEmail({
      to: options.to,
      subject,
      html,
      text,
      attachments: options.attachments
    });
  }

  async sendWelcomeEmail(userEmail: string, userName: string, brandName: string = 'OmniDash'): Promise<boolean> {
    return await this.sendTemplateEmail({
      templateName: 'welcome',
      to: userEmail,
      variables: {
        userName,
        brandName,
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/login`
      }
    });
  }

  async sendPasswordResetEmail(userEmail: string, userName: string, resetToken: string, brandName: string = 'OmniDash'): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}`;
    
    return await this.sendTemplateEmail({
      templateName: 'password-reset',
      to: userEmail,
      variables: {
        userName,
        brandName,
        resetUrl,
        expirationTime: '24 hours'
      }
    });
  }

  async sendWeeklyReport(brandId: string, recipients: string[], reportData: any): Promise<boolean> {
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: { name: true }
    });

    if (!brand) {
      throw new Error('Brand not found');
    }

    const variables = {
      brandName: brand.name,
      weekStart: reportData.period.startDate,
      weekEnd: reportData.period.endDate,
      totalFollowers: reportData.summary.totalFollowers.toLocaleString(),
      followersGrowth: reportData.summary.growthRate,
      followersGrowthClass: reportData.summary.growthRate >= 0 ? 'positive' : 'negative',
      totalPosts: reportData.summary.totalPosts,
      avgEngagement: reportData.summary.avgEngagementRate,
      engagementGrowth: reportData.dashboard.performanceTrends.length > 0 ? 
        (reportData.dashboard.performanceTrends.slice(-1)[0].engagement - reportData.dashboard.performanceTrends[0].engagement).toFixed(1) : '0',
      engagementGrowthClass: 'positive', // Calculate based on trend
      totalReach: reportData.dashboard.totalReach.toLocaleString(),
      topPosts: reportData.content.topPerformingPosts.map((post: any) => ({
        platform: post.platform,
        content: post.content.substring(0, 100) + '...',
        engagementRate: post.engagementRate.toFixed(1),
        publishedAt: new Date(post.publishedAt).toLocaleDateString()
      })),
      platforms: reportData.dashboard.topPlatforms.map((platform: any) => ({
        platform: platform.platform,
        followers: platform.followers.toLocaleString(),
        avgEngagement: platform.engagementRate.toFixed(1)
      })),
      generatedAt: new Date().toLocaleDateString(),
      dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard/${brandId}`
    };

    return await this.sendTemplateEmail({
      templateName: 'weekly-report',
      to: recipients,
      variables
    });
  }

  async sendWorkflowAlert(brandId: string, workflowData: any, recipients: string[]): Promise<boolean> {
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: { name: true }
    });

    if (!brand) {
      throw new Error('Brand not found');
    }

    const statusColors = {
      success: '#28a745',
      failure: '#dc3545',
      warning: '#ffc107'
    };

    const variables = {
      brandName: brand.name,
      workflowName: workflowData.name,
      status: workflowData.status,
      statusText: workflowData.status.charAt(0).toUpperCase() + workflowData.status.slice(1),
      statusColor: statusColors[workflowData.status as keyof typeof statusColors] || '#6c757d',
      executedAt: new Date(workflowData.executedAt).toLocaleString(),
      errorMessage: workflowData.errorMessage,
      executionId: workflowData.executionId || 'N/A',
      duration: workflowData.duration || 'N/A',
      completedActions: workflowData.completedActions || 0,
      totalActions: workflowData.totalActions || 0,
      nextSteps: workflowData.nextSteps || [],
      workflowUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/workflows/${workflowData.id}`
    };

    return await this.sendTemplateEmail({
      templateName: 'workflow-alert',
      to: recipients,
      variables
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('Email service connection verified');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }

  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  getTemplate(templateName: string): EmailTemplate | undefined {
    return this.templates.get(templateName);
  }
}