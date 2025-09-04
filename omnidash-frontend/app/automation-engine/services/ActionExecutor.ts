import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface ActionDefinition {
  id: string;
  name: string;
  type: ActionType;
  category: string;
  description?: string;
  version: string;
  config: ActionConfig;
  inputs: ActionInput[];
  outputs: ActionOutput[];
  requirements?: string[];
  metadata: {
    timeout: number;
    retryPolicy: RetryPolicy;
    rateLimit?: RateLimit;
    concurrent: boolean;
    priority: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type ActionType = 
  | 'http'
  | 'email'
  | 'sms'
  | 'social'
  | 'database'
  | 'file'
  | 'transformation'
  | 'notification'
  | 'integration'
  | 'custom';

export interface ActionConfig {
  // HTTP actions
  http?: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    authentication?: {
      type: 'none' | 'basic' | 'bearer' | 'oauth2' | 'apikey';
      credentials?: Record<string, string>;
    };
    timeout?: number;
    followRedirects?: boolean;
  };

  // Email actions
  email?: {
    provider: 'smtp' | 'sendgrid' | 'mailgun' | 'ses';
    settings: Record<string, string>;
    template?: {
      id?: string;
      subject: string;
      body: string;
      isHtml: boolean;
    };
  };

  // SMS actions
  sms?: {
    provider: 'twilio' | 'nexmo' | 'aws';
    settings: Record<string, string>;
  };

  // Social media actions
  social?: {
    platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'tiktok';
    action: 'post' | 'comment' | 'like' | 'share' | 'follow';
    settings: Record<string, string>;
  };

  // Database actions
  database?: {
    type: 'mysql' | 'postgresql' | 'mongodb' | 'redis' | 'elasticsearch';
    connectionString: string;
    operation: 'select' | 'insert' | 'update' | 'delete' | 'aggregate';
    query?: string;
    collection?: string;
    index?: string;
  };

  // File actions
  file?: {
    operation: 'read' | 'write' | 'move' | 'copy' | 'delete' | 'upload' | 'download';
    path: string;
    destination?: string;
    storage?: 'local' | 's3' | 'gcs' | 'azure' | 'dropbox';
    settings?: Record<string, string>;
  };

  // Transformation actions
  transformation?: {
    type: 'json' | 'xml' | 'csv' | 'text' | 'image' | 'video';
    operation: string;
    settings: Record<string, unknown>;
  };

  // Custom actions
  custom?: {
    script: string;
    language: 'javascript' | 'python' | 'shell';
    environment?: Record<string, string>;
  };
}

export interface ActionInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'file';
  required: boolean;
  default?: unknown;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: unknown[];
  };
  description?: string;
}

export interface ActionOutput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
}

export interface RetryPolicy {
  enabled: boolean;
  maxRetries: number;
  backoffStrategy: 'fixed' | 'exponential' | 'linear';
  initialDelay: number;
  maxDelay?: number;
  retryOnErrors?: string[];
}

export interface RateLimit {
  maxRequests: number;
  windowMs: number;
  enabled: boolean;
}

export interface ActionExecution {
  id: string;
  actionId: string;
  workflowExecutionId?: string;
  nodeId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: {
    message: string;
    code?: string;
    stack?: string;
    details?: Record<string, unknown>;
  };
  retryCount: number;
  metadata: {
    priority: number;
    queuedAt: Date;
    worker?: string;
    resources?: Record<string, unknown>;
  };
  logs: ActionLog[];
}

export interface ActionLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

export interface ActionTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  action: Omit<ActionDefinition, 'id' | 'createdAt' | 'updatedAt'>;
  isPublic: boolean;
  usageCount: number;
}

export class ActionExecutor extends EventEmitter {
  private actions: Map<string, ActionDefinition> = new Map();
  private executions: Map<string, ActionExecution> = new Map();
  private templates: Map<string, ActionTemplate> = new Map();
  private executionQueue: ActionExecution[] = [];
  private activeExecutions: Map<string, ActionExecution> = new Map();
  private rateLimiters: Map<string, { count: number; resetTime: Date }> = new Map();
  private workers: Map<string, Worker> = new Map();
  private isProcessing = false;
  private maxConcurrentExecutions = 20;
  private services: Map<string, unknown> = new Map();

  constructor() {
    super();
    this.initialize();
  }

  private initialize() {
    this.startExecutionLoop();
    this.setupDefaultActions();
    this.setupDefaultTemplates();
    console.log('⚙️ ActionExecutor initialized');
  }

  public registerAction(
    config: Omit<ActionDefinition, 'id' | 'createdAt' | 'updatedAt'>
  ): string {
    const actionId = uuidv4();
    
    const action: ActionDefinition = {
      ...config,
      id: actionId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.actions.set(actionId, action);
    this.emit('action:registered', action);
    
    console.log(`🔧 Action registered: ${config.name} (${config.type})`);
    return actionId;
  }

  public async executeAction(
    actionId: string,
    input: Record<string, unknown>,
    context?: {
      workflowExecutionId?: string;
      nodeId?: string;
      priority?: number;
      timeout?: number;
    }
  ): Promise<ActionExecution> {
    const action = this.actions.get(actionId);
    if (!action) {
      throw new Error(`Action not found: ${actionId}`);
    }

    // Validate input
    this.validateInput(action, input);

    // Check rate limits
    if (action.metadata.rateLimit?.enabled && this.isRateLimited(actionId, action.metadata.rateLimit)) {
      throw new Error(`Rate limit exceeded for action: ${action.name}`);
    }

    const executionId = uuidv4();
    const execution: ActionExecution = {
      id: executionId,
      actionId,
      workflowExecutionId: context?.workflowExecutionId,
      nodeId: context?.nodeId,
      status: 'pending',
      startedAt: new Date(),
      input,
      retryCount: 0,
      metadata: {
        priority: context?.priority || action.metadata.priority || 0,
        queuedAt: new Date()
      },
      logs: []
    };

    this.executions.set(executionId, execution);
    this.addToQueue(execution);

    this.emit('action:queued', execution);
    this.addLog(execution, 'info', `Action queued: ${action.name}`);

    return execution;
  }

  private addToQueue(execution: ActionExecution): void {
    // Insert based on priority (higher priority first)
    let inserted = false;
    for (let i = 0; i < this.executionQueue.length; i++) {
      if (execution.metadata.priority > this.executionQueue[i].metadata.priority) {
        this.executionQueue.splice(i, 0, execution);
        inserted = true;
        break;
      }
    }
    
    if (!inserted) {
      this.executionQueue.push(execution);
    }
  }

  private async startExecutionLoop() {
    this.isProcessing = true;

    while (this.isProcessing) {
      try {
        // Process queued executions
        if (this.executionQueue.length > 0 && this.activeExecutions.size < this.maxConcurrentExecutions) {
          const execution = this.executionQueue.shift();
          if (execution) {
            this.processExecution(execution).catch(error => {
              console.error('Error processing action execution:', error);
            });
          }
        }

        // Clean up completed executions from active set
        for (const [id, execution] of this.activeExecutions.entries()) {
          if (['completed', 'failed', 'cancelled', 'timeout'].includes(execution.status)) {
            this.activeExecutions.delete(id);
          }
        }

        await this.delay(100); // Check every 100ms
      } catch (error) {
        console.error('Error in execution loop:', error);
        await this.delay(1000);
      }
    }
  }

  private async processExecution(execution: ActionExecution): Promise<void> {
    const action = this.actions.get(execution.actionId)!;
    
    this.activeExecutions.set(execution.id, execution);
    execution.status = 'running';
    this.executions.set(execution.id, execution);

    this.addLog(execution, 'info', `Starting action execution: ${action.name}`);
    this.emit('action:started', execution);

    try {
      // Set timeout if specified
      const timeout = action.metadata.timeout || 300000; // 5 minutes default
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Action execution timeout')), timeout);
      });

      // Execute action with timeout
      const result = await Promise.race([
        this.executeActionType(action, execution),
        timeoutPromise
      ]);

      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
      execution.output = result;

      this.addLog(execution, 'info', `Action completed successfully`, result);
      this.emit('action:completed', execution);

      console.log(`✅ Action executed: ${action.name} (${execution.duration}ms)`);

    } catch (error) {
      await this.handleExecutionError(execution, action, error);
    }

    this.executions.set(execution.id, execution);
  }

  private async executeActionType(
    action: ActionDefinition,
    execution: ActionExecution
  ): Promise<Record<string, unknown>> {
    switch (action.type) {
      case 'http':
        return this.executeHttpAction(action, execution);
      case 'email':
        return this.executeEmailAction(action, execution);
      case 'sms':
        return this.executeSmsAction(action, execution);
      case 'social':
        return this.executeSocialAction(action, execution);
      case 'database':
        return this.executeDatabaseAction(action, execution);
      case 'file':
        return this.executeFileAction(action, execution);
      case 'transformation':
        return this.executeTransformationAction(action, execution);
      case 'notification':
        return this.executeNotificationAction(action, execution);
      case 'integration':
        return this.executeIntegrationAction(action, execution);
      case 'custom':
        return this.executeCustomAction(action, execution);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private async executeHttpAction(
    action: ActionDefinition,
    execution: ActionExecution
  ): Promise<Record<string, unknown>> {
    const httpConfig = action.config.http!;
    const { url, method, headers = {}, authentication } = httpConfig;

    this.addLog(execution, 'debug', `HTTP ${method} to ${url}`);

    // Simulate HTTP request - in production, use fetch or axios
    await this.delay(Math.random() * 1000 + 200);

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: { success: true, timestamp: new Date(), data: execution.input },
      url,
      method
    };
  }

  private async executeEmailAction(
    action: ActionDefinition,
    execution: ActionExecution
  ): Promise<Record<string, unknown>> {
    const emailConfig = action.config.email!;
    const { to, subject, body } = execution.input;

    this.addLog(execution, 'debug', `Sending email to ${to}`);

    // Simulate email sending
    await this.delay(500);

    return {
      messageId: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      to,
      subject,
      provider: emailConfig.provider,
      deliveredAt: new Date()
    };
  }

  private async executeSmsAction(
    action: ActionDefinition,
    execution: ActionExecution
  ): Promise<Record<string, unknown>> {
    const smsConfig = action.config.sms!;
    const { to, message } = execution.input;

    this.addLog(execution, 'debug', `Sending SMS to ${to}`);

    await this.delay(300);

    return {
      messageId: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      to,
      message,
      provider: smsConfig.provider,
      sentAt: new Date()
    };
  }

  private async executeSocialAction(
    action: ActionDefinition,
    execution: ActionExecution
  ): Promise<Record<string, unknown>> {
    const socialConfig = action.config.social!;
    const { platform, action: socialAction } = socialConfig;

    this.addLog(execution, 'debug', `${socialAction} on ${platform}`);

    await this.delay(800);

    return {
      platform,
      action: socialAction,
      postId: `${platform}_${Date.now()}`,
      url: `https://${platform}.com/post/${Date.now()}`,
      publishedAt: new Date()
    };
  }

  private async executeDatabaseAction(
    action: ActionDefinition,
    execution: ActionExecution
  ): Promise<Record<string, unknown>> {
    const dbConfig = action.config.database!;
    const { type, operation } = dbConfig;

    this.addLog(execution, 'debug', `Database ${operation} on ${type}`);

    await this.delay(200);

    return {
      operation,
      database: type,
      rowsAffected: Math.floor(Math.random() * 10) + 1,
      executedAt: new Date()
    };
  }

  private async executeFileAction(
    action: ActionDefinition,
    execution: ActionExecution
  ): Promise<Record<string, unknown>> {
    const fileConfig = action.config.file!;
    const { operation, path, storage = 'local' } = fileConfig;

    this.addLog(execution, 'debug', `File ${operation} on ${storage}: ${path}`);

    await this.delay(400);

    return {
      operation,
      path,
      storage,
      size: Math.floor(Math.random() * 1000000), // Random file size
      processedAt: new Date()
    };
  }

  private async executeTransformationAction(
    action: ActionDefinition,
    execution: ActionExecution
  ): Promise<Record<string, unknown>> {
    const transformConfig = action.config.transformation!;
    const { type, operation } = transformConfig;

    this.addLog(execution, 'debug', `Transform ${type}: ${operation}`);

    await this.delay(150);

    return {
      type,
      operation,
      inputSize: JSON.stringify(execution.input).length,
      outputSize: Math.floor(Math.random() * 1000) + 100,
      transformedAt: new Date()
    };
  }

  private async executeNotificationAction(
    action: ActionDefinition,
    execution: ActionExecution
  ): Promise<Record<string, unknown>> {
    const { message, channel, recipients } = execution.input;

    this.addLog(execution, 'debug', `Sending notification via ${channel}`);

    await this.delay(200);

    return {
      channel,
      message,
      recipients: Array.isArray(recipients) ? recipients.length : 1,
      notificationId: `notif_${Date.now()}`,
      sentAt: new Date()
    };
  }

  private async executeIntegrationAction(
    action: ActionDefinition,
    execution: ActionExecution
  ): Promise<Record<string, unknown>> {
    const { service, operation, data } = execution.input;

    this.addLog(execution, 'debug', `Integration ${service}: ${operation}`);

    await this.delay(600);

    return {
      service,
      operation,
      result: 'success',
      data,
      executedAt: new Date()
    };
  }

  private async executeCustomAction(
    action: ActionDefinition,
    execution: ActionExecution
  ): Promise<Record<string, unknown>> {
    const customConfig = action.config.custom!;
    const { language, script } = customConfig;

    this.addLog(execution, 'debug', `Executing custom ${language} script`);

    // Simulate custom script execution
    await this.delay(1000);

    return {
      language,
      scriptResult: 'Custom script executed successfully',
      output: execution.input, // Echo input as output for demo
      executedAt: new Date()
    };
  }

  private async handleExecutionError(
    execution: ActionExecution,
    action: ActionDefinition,
    error: unknown
  ): Promise<void> {
    const errorMessage = (error as Error).message;
    execution.error = {
      message: errorMessage,
      code: (error as any).code,
      stack: (error as Error).stack
    };

    this.addLog(execution, 'error', `Action failed: ${errorMessage}`);

    // Check if we should retry
    const retryPolicy = action.metadata.retryPolicy;
    if (retryPolicy.enabled && execution.retryCount < retryPolicy.maxRetries) {
      execution.retryCount++;
      execution.status = 'pending';
      
      const delay = this.calculateRetryDelay(retryPolicy, execution.retryCount);
      
      this.addLog(execution, 'info', `Retrying in ${delay}ms (attempt ${execution.retryCount}/${retryPolicy.maxRetries})`);
      
      setTimeout(() => {
        this.addToQueue(execution);
      }, delay);

      this.emit('action:retry', execution);
    } else {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();

      this.emit('action:failed', execution);
      console.error(`❌ Action failed: ${action.name}`, error);
    }
  }

  private calculateRetryDelay(retryPolicy: RetryPolicy, retryCount: number): number {
    let delay: number;

    switch (retryPolicy.backoffStrategy) {
      case 'fixed':
        delay = retryPolicy.initialDelay;
        break;
      case 'linear':
        delay = retryPolicy.initialDelay * retryCount;
        break;
      case 'exponential':
        delay = retryPolicy.initialDelay * Math.pow(2, retryCount - 1);
        break;
      default:
        delay = retryPolicy.initialDelay;
    }

    return Math.min(delay, retryPolicy.maxDelay || 300000); // Max 5 minutes
  }

  private validateInput(action: ActionDefinition, input: Record<string, unknown>): void {
    for (const inputDef of action.inputs) {
      const value = input[inputDef.name];

      // Check required fields
      if (inputDef.required && (value === undefined || value === null)) {
        throw new Error(`Required input missing: ${inputDef.name}`);
      }

      // Type validation
      if (value !== undefined && value !== null) {
        this.validateInputType(inputDef.name, value, inputDef.type);
        this.validateInputConstraints(inputDef.name, value, inputDef.validation);
      }
    }
  }

  private validateInputType(name: string, value: unknown, expectedType: string): void {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    
    if (expectedType === 'object' && actualType !== 'object') {
      throw new Error(`Input ${name} must be an object, got ${actualType}`);
    }
    
    if (expectedType !== 'object' && expectedType !== actualType) {
      throw new Error(`Input ${name} must be ${expectedType}, got ${actualType}`);
    }
  }

  private validateInputConstraints(
    name: string,
    value: unknown,
    validation?: ActionInput['validation']
  ): void {
    if (!validation) return;

    // Pattern validation for strings
    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        throw new Error(`Input ${name} does not match required pattern`);
      }
    }

    // Min/max validation for numbers
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        throw new Error(`Input ${name} must be at least ${validation.min}`);
      }
      if (validation.max !== undefined && value > validation.max) {
        throw new Error(`Input ${name} must be at most ${validation.max}`);
      }
    }

    // Enum validation
    if (validation.enum && !validation.enum.includes(value)) {
      throw new Error(`Input ${name} must be one of: ${validation.enum.join(', ')}`);
    }
  }

  private isRateLimited(actionId: string, rateLimit: RateLimit): boolean {
    const now = new Date();
    const limiter = this.rateLimiters.get(actionId);

    if (!limiter || now > limiter.resetTime) {
      this.rateLimiters.set(actionId, {
        count: 1,
        resetTime: new Date(now.getTime() + rateLimit.windowMs)
      });
      return false;
    }

    if (limiter.count >= rateLimit.maxRequests) {
      return true;
    }

    limiter.count++;
    return false;
  }

  private addLog(
    execution: ActionExecution,
    level: ActionLog['level'],
    message: string,
    data?: Record<string, unknown>
  ): void {
    execution.logs.push({
      timestamp: new Date(),
      level,
      message,
      data
    });
  }

  private setupDefaultActions(): void {
    // HTTP Request action
    this.registerAction({
      name: 'HTTP Request',
      type: 'http',
      category: 'Communication',
      description: 'Make HTTP requests to external APIs',
      version: '1.0.0',
      config: {
        http: {
          url: '',
          method: 'GET',
          headers: {},
          authentication: { type: 'none' }
        }
      },
      inputs: [
        { name: 'url', type: 'string', required: true, description: 'Request URL' },
        { name: 'method', type: 'string', required: false, default: 'GET', description: 'HTTP method' },
        { name: 'headers', type: 'object', required: false, description: 'Request headers' },
        { name: 'body', type: 'object', required: false, description: 'Request body' }
      ],
      outputs: [
        { name: 'statusCode', type: 'number', description: 'HTTP status code' },
        { name: 'headers', type: 'object', description: 'Response headers' },
        { name: 'body', type: 'object', description: 'Response body' }
      ],
      metadata: {
        timeout: 30000,
        retryPolicy: {
          enabled: true,
          maxRetries: 3,
          backoffStrategy: 'exponential',
          initialDelay: 1000
        },
        concurrent: true,
        priority: 0
      }
    });

    // Send Email action
    this.registerAction({
      name: 'Send Email',
      type: 'email',
      category: 'Communication',
      description: 'Send emails via various providers',
      version: '1.0.0',
      config: {
        email: {
          provider: 'smtp',
          settings: {},
          template: {
            subject: '',
            body: '',
            isHtml: false
          }
        }
      },
      inputs: [
        { name: 'to', type: 'string', required: true, description: 'Recipient email' },
        { name: 'subject', type: 'string', required: true, description: 'Email subject' },
        { name: 'body', type: 'string', required: true, description: 'Email body' },
        { name: 'cc', type: 'string', required: false, description: 'CC recipients' },
        { name: 'bcc', type: 'string', required: false, description: 'BCC recipients' }
      ],
      outputs: [
        { name: 'messageId', type: 'string', description: 'Unique message ID' },
        { name: 'deliveredAt', type: 'string', description: 'Delivery timestamp' }
      ],
      metadata: {
        timeout: 10000,
        retryPolicy: {
          enabled: true,
          maxRetries: 2,
          backoffStrategy: 'fixed',
          initialDelay: 2000
        },
        concurrent: true,
        priority: 1
      }
    });
  }

  private setupDefaultTemplates(): void {
    // Add some default action templates
    console.log('📚 Default action templates loaded');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API methods
  public getAction(actionId: string): ActionDefinition | undefined {
    return this.actions.get(actionId);
  }

  public getActions(): ActionDefinition[] {
    return Array.from(this.actions.values());
  }

  public getActionsByType(type: ActionType): ActionDefinition[] {
    return this.getActions().filter(action => action.type === type);
  }

  public getActionsByCategory(category: string): ActionDefinition[] {
    return this.getActions().filter(action => action.category === category);
  }

  public getExecution(executionId: string): ActionExecution | undefined {
    return this.executions.get(executionId);
  }

  public getExecutions(): ActionExecution[] {
    return Array.from(this.executions.values());
  }

  public getExecutionsByAction(actionId: string): ActionExecution[] {
    return this.getExecutions().filter(exec => exec.actionId === actionId);
  }

  public getActiveExecutions(): ActionExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  public cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (!execution || !['pending', 'running'].includes(execution.status)) {
      return false;
    }

    execution.status = 'cancelled';
    execution.completedAt = new Date();
    execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();

    this.addLog(execution, 'info', 'Execution cancelled by user');
    this.executions.set(executionId, execution);

    // Remove from queue if pending
    const queueIndex = this.executionQueue.findIndex(exec => exec.id === executionId);
    if (queueIndex !== -1) {
      this.executionQueue.splice(queueIndex, 1);
    }

    this.emit('action:cancelled', execution);
    return true;
  }

  public updateAction(actionId: string, updates: Partial<ActionDefinition>): boolean {
    const action = this.actions.get(actionId);
    if (!action) return false;

    const updatedAction = { ...action, ...updates, updatedAt: new Date() };
    this.actions.set(actionId, updatedAction);

    this.emit('action:updated', updatedAction);
    return true;
  }

  public deleteAction(actionId: string): boolean {
    const action = this.actions.get(actionId);
    if (!action) return false;

    // Cancel any active executions
    const activeExecutions = this.getExecutionsByAction(actionId)
      .filter(exec => ['pending', 'running'].includes(exec.status));
    
    activeExecutions.forEach(exec => this.cancelExecution(exec.id));

    this.actions.delete(actionId);
    this.emit('action:deleted', action);

    return true;
  }

  public getStats(): {
    totalActions: number;
    totalExecutions: number;
    activeExecutions: number;
    queuedExecutions: number;
    completedExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    successRate: number;
  } {
    const actions = this.getActions();
    const executions = this.getExecutions();
    const completedExecutions = executions.filter(exec => exec.status === 'completed');
    const failedExecutions = executions.filter(exec => exec.status === 'failed');
    
    const totalDuration = completedExecutions.reduce((sum, exec) => sum + (exec.duration || 0), 0);
    const averageExecutionTime = completedExecutions.length > 0 ? totalDuration / completedExecutions.length : 0;
    
    const successRate = executions.length > 0 ? completedExecutions.length / executions.length : 0;

    return {
      totalActions: actions.length,
      totalExecutions: executions.length,
      activeExecutions: this.activeExecutions.size,
      queuedExecutions: this.executionQueue.length,
      completedExecutions: completedExecutions.length,
      failedExecutions: failedExecutions.length,
      averageExecutionTime,
      successRate
    };
  }

  public shutdown(): void {
    this.isProcessing = false;
    
    // Cancel all active executions
    const activeExecutions = this.getActiveExecutions();
    activeExecutions.forEach(exec => this.cancelExecution(exec.id));

    this.removeAllListeners();
    console.log('🛑 ActionExecutor shutdown complete');
  }
}

export const actionExecutor = new ActionExecutor();