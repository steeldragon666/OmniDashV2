import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface WebhookEndpoint {
  id: string;
  url: string;
  method: 'POST' | 'GET' | 'PUT' | 'DELETE' | 'PATCH';
  name: string;
  description?: string;
  isActive: boolean;
  secret?: string;
  headers: Record<string, string>;
  filters: WebhookFilter[];
  retryPolicy: {
    maxRetries: number;
    backoffStrategy: 'fixed' | 'exponential' | 'linear';
    initialDelay: number;
    maxDelay?: number;
  };
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  authentication?: {
    type: 'bearer' | 'basic' | 'apikey' | 'signature';
    credentials: Record<string, string>;
  };
  createdAt: Date;
  updatedAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
}

export interface WebhookFilter {
  field: string;
  operator: 'eq' | 'neq' | 'contains' | 'regex' | 'exists' | 'gt' | 'lt';
  value?: any;
  caseSensitive?: boolean;
}

export interface WebhookPayload {
  id: string;
  endpointId: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: any;
  query: Record<string, string>;
  timestamp: Date;
  sourceIp?: string;
  userAgent?: string;
  processed: boolean;
  processingError?: string;
}

export interface WebhookTrigger {
  id: string;
  workflowId: string;
  endpointId: string;
  name: string;
  description?: string;
  isActive: boolean;
  conditions: WebhookCondition[];
  dataMapping: WebhookDataMapping[];
  response: {
    statusCode: number;
    body?: any;
    headers?: Record<string, string>;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookCondition {
  field: string;
  operator: 'eq' | 'neq' | 'contains' | 'regex' | 'exists' | 'gt' | 'lt' | 'in';
  value: any;
  required: boolean;
}

export interface WebhookDataMapping {
  sourceField: string;
  targetField: string;
  transform?: 'uppercase' | 'lowercase' | 'trim' | 'json_parse' | 'number' | 'date';
  defaultValue?: any;
}

export interface IncomingWebhook {
  id: string;
  payloadId: string;
  triggerId: string;
  workflowId: string;
  status: 'received' | 'processing' | 'completed' | 'failed';
  receivedAt: Date;
  processedAt?: Date;
  response?: {
    statusCode: number;
    body: any;
    headers: Record<string, string>;
  };
  error?: string;
  executionId?: string;
}

export class WebhookService extends EventEmitter {
  private endpoints: Map<string, WebhookEndpoint> = new Map();
  private triggers: Map<string, WebhookTrigger> = new Map();
  private payloads: Map<string, WebhookPayload> = new Map();
  private incomingWebhooks: Map<string, IncomingWebhook> = new Map();
  private rateLimitCounters: Map<string, { count: number; resetTime: Date }> = new Map();
  private workflowEngine: any;
  private maxPayloadHistory = 10000;

  constructor(workflowEngine?: any) {
    super();
    this.workflowEngine = workflowEngine;
    this.initialize();
  }

  private initialize() {
    this.setupDefaultEndpoints();
    this.startCleanupInterval();
  }

  private setupDefaultEndpoints() {
    // Generic webhook endpoint
    this.createEndpoint({
      name: 'Generic Webhook',
      url: '/webhook/generic',
      method: 'POST',
      description: 'Accepts any POST request',
      secret: this.generateSecret(),
      headers: { 'Content-Type': 'application/json' },
      filters: [],
      retryPolicy: {
        maxRetries: 3,
        backoffStrategy: 'exponential',
        initialDelay: 1000,
        maxDelay: 30000
      }
    });

    // GitHub webhook endpoint
    this.createEndpoint({
      name: 'GitHub Webhooks',
      url: '/webhook/github',
      method: 'POST',
      description: 'GitHub repository events',
      headers: { 'Content-Type': 'application/json' },
      filters: [
        { field: 'X-GitHub-Event', operator: 'exists' },
        { field: 'X-Hub-Signature-256', operator: 'exists' }
      ],
      retryPolicy: {
        maxRetries: 2,
        backoffStrategy: 'fixed',
        initialDelay: 5000
      },
      authentication: {
        type: 'signature',
        credentials: {
          algorithm: 'sha256',
          header: 'X-Hub-Signature-256'
        }
      }
    });

    // Zapier webhook endpoint
    this.createEndpoint({
      name: 'Zapier Integration',
      url: '/webhook/zapier',
      method: 'POST',
      description: 'Zapier webhook integration',
      headers: { 'Content-Type': 'application/json' },
      filters: [],
      retryPolicy: {
        maxRetries: 5,
        backoffStrategy: 'exponential',
        initialDelay: 2000
      },
      rateLimit: {
        maxRequests: 100,
        windowMs: 60000 // 1 minute
      }
    });
  }

  public createEndpoint(
    config: Omit<WebhookEndpoint, 'id' | 'createdAt' | 'updatedAt' | 'lastTriggered' | 'triggerCount' | 'isActive'>
  ): string {
    const endpointId = uuidv4();
    
    const endpoint: WebhookEndpoint = {
      ...config,
      id: endpointId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      triggerCount: 0
    };

    this.endpoints.set(endpointId, endpoint);
    this.emit('endpoint:created', endpoint);
    
    console.log(`🎣 Webhook endpoint created: ${config.name} at ${config.url}`);
    return endpointId;
  }

  public createTrigger(
    config: Omit<WebhookTrigger, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>
  ): string {
    const triggerId = uuidv4();
    
    const trigger: WebhookTrigger = {
      ...config,
      id: triggerId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.triggers.set(triggerId, trigger);
    this.emit('trigger:created', trigger);
    
    console.log(`⚡ Webhook trigger created: ${config.name} for workflow: ${config.workflowId}`);
    return triggerId;
  }

  public async receiveWebhook(
    endpointId: string,
    method: string,
    url: string,
    headers: Record<string, string>,
    body: any,
    query: Record<string, string> = {},
    sourceIp?: string
  ): Promise<{ statusCode: number; body?: any; headers?: Record<string, string> }> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      return { statusCode: 404, body: { error: 'Endpoint not found' } };
    }

    if (!endpoint.isActive) {
      return { statusCode: 503, body: { error: 'Endpoint is inactive' } };
    }

    // Check method
    if (endpoint.method !== method) {
      return { statusCode: 405, body: { error: 'Method not allowed' } };
    }

    // Check rate limiting
    if (endpoint.rateLimit && this.isRateLimited(endpointId, endpoint.rateLimit)) {
      return { statusCode: 429, body: { error: 'Rate limit exceeded' } };
    }

    // Validate authentication
    if (endpoint.authentication) {
      const authResult = this.validateAuthentication(endpoint, headers, body);
      if (!authResult.valid) {
        return { statusCode: 401, body: { error: authResult.error } };
      }
    }

    // Apply filters
    if (!this.passesFilters(endpoint.filters, headers, body)) {
      return { statusCode: 200, body: { message: 'Filtered out' } };
    }

    // Create payload
    const payloadId = uuidv4();
    const payload: WebhookPayload = {
      id: payloadId,
      endpointId,
      method,
      url,
      headers,
      body,
      query,
      timestamp: new Date(),
      sourceIp,
      userAgent: headers['User-Agent'] || headers['user-agent'],
      processed: false
    };

    this.payloads.set(payloadId, payload);
    this.maintainPayloadHistory();

    // Update endpoint stats
    endpoint.lastTriggered = new Date();
    endpoint.triggerCount++;
    this.endpoints.set(endpointId, endpoint);

    this.emit('webhook:received', payload);
    console.log(`📨 Webhook received: ${endpointId} from ${sourceIp || 'unknown'}`);

    // Process triggers
    const response = await this.processTriggers(payload);
    
    // Mark as processed
    payload.processed = true;
    this.payloads.set(payloadId, payload);

    return response;
  }

  private async processTriggers(payload: WebhookPayload): Promise<{
    statusCode: number;
    body?: any;
    headers?: Record<string, string>;
  }> {
    const relevantTriggers = Array.from(this.triggers.values())
      .filter(trigger => trigger.isActive && trigger.endpointId === payload.endpointId);

    if (relevantTriggers.length === 0) {
      return { statusCode: 200, body: { message: 'No triggers configured' } };
    }

    const triggerResults: any[] = [];

    for (const trigger of relevantTriggers) {
      try {
        // Check conditions
        if (!this.evaluateConditions(trigger.conditions, payload)) {
          continue;
        }

        // Map data for workflow
        const workflowData = this.mapWebhookData(trigger.dataMapping, payload);

        // Create incoming webhook record
        const incomingWebhookId = uuidv4();
        const incomingWebhook: IncomingWebhook = {
          id: incomingWebhookId,
          payloadId: payload.id,
          triggerId: trigger.id,
          workflowId: trigger.workflowId,
          status: 'received',
          receivedAt: new Date()
        };

        this.incomingWebhooks.set(incomingWebhookId, incomingWebhook);

        // Execute workflow
        if (this.workflowEngine) {
          incomingWebhook.status = 'processing';
          this.incomingWebhooks.set(incomingWebhookId, incomingWebhook);

          try {
            const execution = await this.workflowEngine.executeWorkflow(
              trigger.workflowId,
              {
                webhook: {
                  payload: payload.body,
                  headers: payload.headers,
                  query: payload.query,
                  endpointId: payload.endpointId,
                  triggerId: trigger.id
                },
                ...workflowData
              },
              'webhook'
            );

            incomingWebhook.status = 'completed';
            incomingWebhook.processedAt = new Date();
            incomingWebhook.executionId = execution.id;
            incomingWebhook.response = trigger.response;

            this.incomingWebhooks.set(incomingWebhookId, incomingWebhook);

            triggerResults.push({
              triggerId: trigger.id,
              workflowId: trigger.workflowId,
              executionId: execution.id,
              success: true
            });

            this.emit('webhook:triggered', { trigger, payload, execution });
            console.log(`⚡ Webhook triggered workflow: ${trigger.workflowId}`);

          } catch (error) {
            incomingWebhook.status = 'failed';
            incomingWebhook.processedAt = new Date();
            incomingWebhook.error = (error as Error).message;

            this.incomingWebhooks.set(incomingWebhookId, incomingWebhook);

            triggerResults.push({
              triggerId: trigger.id,
              workflowId: trigger.workflowId,
              success: false,
              error: (error as Error).message
            });

            this.emit('webhook:trigger_failed', { trigger, payload, error });
            console.error(`❌ Webhook trigger failed: ${trigger.workflowId}`, error);
          }
        }

      } catch (error) {
        console.error('Error processing webhook trigger:', error);
        triggerResults.push({
          triggerId: trigger.id,
          workflowId: trigger.workflowId,
          success: false,
          error: (error as Error).message
        });
      }
    }

    // Return appropriate response
    const successCount = triggerResults.filter(r => r.success).length;
    const totalCount = triggerResults.length;

    if (successCount === totalCount && totalCount > 0) {
      const firstTrigger = relevantTriggers[0];
      return {
        statusCode: firstTrigger.response.statusCode,
        body: firstTrigger.response.body || { message: 'Webhook processed successfully' },
        headers: firstTrigger.response.headers
      };
    } else if (successCount > 0) {
      return {
        statusCode: 207, // Multi-Status
        body: {
          message: 'Partially processed',
          results: triggerResults
        }
      };
    } else {
      return {
        statusCode: 500,
        body: {
          message: 'Failed to process webhook',
          results: triggerResults
        }
      };
    }
  }

  private validateAuthentication(
    endpoint: WebhookEndpoint,
    headers: Record<string, string>,
    body: any
  ): { valid: boolean; error?: string } {
    if (!endpoint.authentication) return { valid: true };

    const auth = endpoint.authentication;
    const creds = auth.credentials;

    switch (auth.type) {
      case 'bearer':
        const authHeader = headers.Authorization || headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return { valid: false, error: 'Missing or invalid Bearer token' };
        }
        
        const token = authHeader.substring(7);
        if (token !== creds.token) {
          return { valid: false, error: 'Invalid Bearer token' };
        }
        break;

      case 'basic':
        const basicAuth = headers.Authorization || headers.authorization;
        if (!basicAuth || !basicAuth.startsWith('Basic ')) {
          return { valid: false, error: 'Missing or invalid Basic auth' };
        }
        
        const encoded = basicAuth.substring(6);
        const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
        const [username, password] = decoded.split(':');
        
        if (username !== creds.username || password !== creds.password) {
          return { valid: false, error: 'Invalid Basic auth credentials' };
        }
        break;

      case 'apikey':
        const apiKeyHeader = creds.header || 'X-API-Key';
        const apiKey = headers[apiKeyHeader];
        
        if (!apiKey || apiKey !== creds.key) {
          return { valid: false, error: 'Invalid API key' };
        }
        break;

      case 'signature':
        const sigHeader = creds.header || 'X-Signature';
        const signature = headers[sigHeader];
        
        if (!signature) {
          return { valid: false, error: 'Missing signature' };
        }
        
        // Simplified signature validation - in production, implement proper HMAC validation
        const expectedSignature = this.generateSignature(body, endpoint.secret || '', creds.algorithm || 'sha256');
        if (signature !== expectedSignature) {
          return { valid: false, error: 'Invalid signature' };
        }
        break;
    }

    return { valid: true };
  }

  private passesFilters(filters: WebhookFilter[], headers: Record<string, string>, body: any): boolean {
    if (filters.length === 0) return true;

    for (const filter of filters) {
      const value = this.getFilterValue(filter.field, headers, body);
      
      if (!this.evaluateFilterCondition(value, filter)) {
        return false;
      }
    }

    return true;
  }

  private getFilterValue(field: string, headers: Record<string, string>, body: any): any {
    // Check headers first (case-insensitive)
    const headerValue = Object.keys(headers).find(key => 
      key.toLowerCase() === field.toLowerCase()
    );
    if (headerValue) return headers[headerValue];

    // Check body
    if (typeof body === 'object' && body !== null) {
      return this.getNestedValue(body, field);
    }

    return undefined;
  }

  private evaluateFilterCondition(value: any, filter: WebhookFilter): boolean {
    const filterValue = filter.value;
    const caseSensitive = filter.caseSensitive !== false;

    if (filter.operator === 'exists') {
      return value !== undefined;
    }

    if (value === undefined) return false;

    // Convert to strings for string operations if needed
    const valueStr = caseSensitive 
      ? String(value) 
      : String(value).toLowerCase();
    const filterStr = caseSensitive 
      ? String(filterValue) 
      : String(filterValue).toLowerCase();

    switch (filter.operator) {
      case 'eq':
        return value === filterValue;
      case 'neq':
        return value !== filterValue;
      case 'contains':
        return valueStr.includes(filterStr);
      case 'regex':
        try {
          const regex = new RegExp(filterValue, caseSensitive ? '' : 'i');
          return regex.test(String(value));
        } catch {
          return false;
        }
      case 'gt':
        return Number(value) > Number(filterValue);
      case 'lt':
        return Number(value) < Number(filterValue);
      default:
        return false;
    }
  }

  private evaluateConditions(conditions: WebhookCondition[], payload: WebhookPayload): boolean {
    if (conditions.length === 0) return true;

    for (const condition of conditions) {
      const value = this.getConditionValue(condition.field, payload);
      
      if (condition.required && !this.evaluateCondition(value, condition)) {
        return false;
      }
    }

    return true;
  }

  private getConditionValue(field: string, payload: WebhookPayload): any {
    // Support dot notation for nested fields
    if (field.startsWith('headers.')) {
      const headerKey = field.substring(8);
      return payload.headers[headerKey];
    }

    if (field.startsWith('body.')) {
      const bodyKey = field.substring(5);
      return this.getNestedValue(payload.body, bodyKey);
    }

    if (field.startsWith('query.')) {
      const queryKey = field.substring(6);
      return payload.query[queryKey];
    }

    // Direct field access
    return (payload as any)[field];
  }

  private evaluateCondition(value: any, condition: WebhookCondition): boolean {
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'eq':
        return value === conditionValue;
      case 'neq':
        return value !== conditionValue;
      case 'contains':
        return String(value).includes(String(conditionValue));
      case 'regex':
        try {
          const regex = new RegExp(conditionValue);
          return regex.test(String(value));
        } catch {
          return false;
        }
      case 'exists':
        return value !== undefined;
      case 'gt':
        return Number(value) > Number(conditionValue);
      case 'lt':
        return Number(value) < Number(conditionValue);
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(value);
      default:
        return false;
    }
  }

  private mapWebhookData(mappings: WebhookDataMapping[], payload: WebhookPayload): Record<string, any> {
    const result: Record<string, any> = {};

    for (const mapping of mappings) {
      let value = this.getConditionValue(mapping.sourceField, payload);

      // Apply transformation
      if (value !== undefined && mapping.transform) {
        value = this.transformValue(value, mapping.transform);
      }

      // Use default if no value
      if (value === undefined && mapping.defaultValue !== undefined) {
        value = mapping.defaultValue;
      }

      result[mapping.targetField] = value;
    }

    return result;
  }

  private transformValue(value: any, transform: WebhookDataMapping['transform']): any {
    switch (transform) {
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'trim':
        return String(value).trim();
      case 'json_parse':
        try {
          return JSON.parse(String(value));
        } catch {
          return value;
        }
      case 'number':
        return Number(value);
      case 'date':
        return new Date(value);
      default:
        return value;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private isRateLimited(endpointId: string, rateLimit: NonNullable<WebhookEndpoint['rateLimit']>): boolean {
    const counter = this.rateLimitCounters.get(endpointId);
    const now = new Date();

    if (!counter || now > counter.resetTime) {
      // Reset counter
      this.rateLimitCounters.set(endpointId, {
        count: 1,
        resetTime: new Date(now.getTime() + rateLimit.windowMs)
      });
      return false;
    }

    if (counter.count >= rateLimit.maxRequests) {
      return true;
    }

    counter.count++;
    return false;
  }

  private generateSignature(body: any, secret: string, algorithm: string): string {
    // Simplified signature generation - in production use proper crypto
    return `${algorithm}=${Buffer.from(`${secret}${JSON.stringify(body)}`).toString('base64')}`;
  }

  private generateSecret(): string {
    return Buffer.from(Math.random().toString(36)).toString('base64');
  }

  private maintainPayloadHistory() {
    if (this.payloads.size > this.maxPayloadHistory) {
      const sortedPayloads = Array.from(this.payloads.entries())
        .sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime());
      
      const toDelete = sortedPayloads.slice(0, sortedPayloads.length - this.maxPayloadHistory);
      toDelete.forEach(([id]) => this.payloads.delete(id));
    }
  }

  private startCleanupInterval() {
    // Clean up old payloads and webhooks every hour
    setInterval(() => {
      this.cleanupOldData();
    }, 3600000); // 1 hour
  }

  private cleanupOldData() {
    const cutoffTime = new Date(Date.now() - 86400000); // 24 hours ago
    let cleaned = 0;

    // Clean up old payloads
    for (const [id, payload] of this.payloads.entries()) {
      if (payload.timestamp < cutoffTime) {
        this.payloads.delete(id);
        cleaned++;
      }
    }

    // Clean up old incoming webhooks
    for (const [id, webhook] of this.incomingWebhooks.entries()) {
      if (webhook.receivedAt < cutoffTime) {
        this.incomingWebhooks.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old webhook records`);
    }
  }

  // Public query methods
  public getEndpoint(endpointId: string): WebhookEndpoint | undefined {
    return this.endpoints.get(endpointId);
  }

  public getEndpoints(): WebhookEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  public getActiveEndpoints(): WebhookEndpoint[] {
    return this.getEndpoints().filter(endpoint => endpoint.isActive);
  }

  public getTrigger(triggerId: string): WebhookTrigger | undefined {
    return this.triggers.get(triggerId);
  }

  public getTriggers(): WebhookTrigger[] {
    return Array.from(this.triggers.values());
  }

  public getTriggersByEndpoint(endpointId: string): WebhookTrigger[] {
    return this.getTriggers().filter(trigger => trigger.endpointId === endpointId);
  }

  public getTriggersByWorkflow(workflowId: string): WebhookTrigger[] {
    return this.getTriggers().filter(trigger => trigger.workflowId === workflowId);
  }

  public getRecentPayloads(limit: number = 50): WebhookPayload[] {
    return Array.from(this.payloads.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  public getPayloadsByEndpoint(endpointId: string, limit: number = 50): WebhookPayload[] {
    return Array.from(this.payloads.values())
      .filter(payload => payload.endpointId === endpointId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  public getIncomingWebhooks(): IncomingWebhook[] {
    return Array.from(this.incomingWebhooks.values());
  }

  public getWebhooksByStatus(status: IncomingWebhook['status']): IncomingWebhook[] {
    return this.getIncomingWebhooks().filter(webhook => webhook.status === status);
  }

  public updateEndpoint(endpointId: string, updates: Partial<WebhookEndpoint>): boolean {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) return false;

    const updatedEndpoint = { ...endpoint, ...updates, updatedAt: new Date() };
    this.endpoints.set(endpointId, updatedEndpoint);

    this.emit('endpoint:updated', updatedEndpoint);
    return true;
  }

  public updateTrigger(triggerId: string, updates: Partial<WebhookTrigger>): boolean {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) return false;

    const updatedTrigger = { ...trigger, ...updates, updatedAt: new Date() };
    this.triggers.set(triggerId, updatedTrigger);

    this.emit('trigger:updated', updatedTrigger);
    return true;
  }

  public deleteEndpoint(endpointId: string): boolean {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) return false;

    // Delete associated triggers
    const associatedTriggers = this.getTriggersByEndpoint(endpointId);
    associatedTriggers.forEach(trigger => this.deleteTrigger(trigger.id));

    this.endpoints.delete(endpointId);
    this.emit('endpoint:deleted', endpoint);

    return true;
  }

  public deleteTrigger(triggerId: string): boolean {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) return false;

    this.triggers.delete(triggerId);
    this.emit('trigger:deleted', trigger);

    return true;
  }

  public getWebhookStats(): {
    endpoints: number;
    activeEndpoints: number;
    triggers: number;
    activeTriggers: number;
    totalPayloads: number;
    recentPayloads: number;
  } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);

    return {
      endpoints: this.endpoints.size,
      activeEndpoints: this.getActiveEndpoints().length,
      triggers: this.triggers.size,
      activeTriggers: this.getTriggers().filter(t => t.isActive).length,
      totalPayloads: this.payloads.size,
      recentPayloads: Array.from(this.payloads.values())
        .filter(p => p.timestamp > oneHourAgo).length
    };
  }

  public shutdown(): void {
    this.removeAllListeners();
    console.log('📴 WebhookService shutdown complete');
  }
}

export const webhookService = new WebhookService();