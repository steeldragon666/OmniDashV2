import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface ErrorConfig {
  enableGlobalErrorHandling: boolean;
  enableRetryMechanism: boolean;
  enableCircuitBreaker: boolean;
  enableDeadLetterQueue: boolean;
  defaultRetryPolicy: RetryPolicy;
  circuitBreakerConfig: CircuitBreakerConfig;
  deadLetterConfig: DeadLetterConfig;
  errorReporting: ErrorReportingConfig;
}

export interface RetryPolicy {
  enabled: boolean;
  maxRetries: number;
  backoffStrategy: 'fixed' | 'exponential' | 'linear' | 'jittered';
  initialDelay: number;
  maxDelay: number;
  multiplier: number;
  jitter: boolean;
  retryableErrors: ErrorType[];
  nonRetryableErrors: ErrorType[];
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  resetTimeout: number;
  monitoringWindow: number;
  halfOpenMaxCalls: number;
  minimumThroughput: number;
}

export interface DeadLetterConfig {
  enabled: boolean;
  maxRetries: number;
  retention: number; // milliseconds
  batchSize: number;
  processingInterval: number;
  reprocessingStrategy: 'immediate' | 'scheduled' | 'manual';
}

export interface ErrorReportingConfig {
  enableSentry: boolean;
  enableSlack: boolean;
  enableEmail: boolean;
  enableWebhook: boolean;
  severityThreshold: ErrorSeverity;
  rateLimiting: {
    enabled: boolean;
    maxErrors: number;
    timeWindow: number;
  };
}

export type ErrorType = 
  | 'network'
  | 'timeout'
  | 'authentication'
  | 'authorization' 
  | 'validation'
  | 'rate_limit'
  | 'resource_exhausted'
  | 'service_unavailable'
  | 'internal_server'
  | 'bad_request'
  | 'not_found'
  | 'conflict'
  | 'unknown';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AutomationError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
  timestamp: Date;
  context: ErrorContext;
  retryInfo?: RetryInfo;
  resolved: boolean;
  resolvedAt?: Date;
  tags: string[];
}

export interface ErrorContext {
  workflowId?: string;
  executionId?: string;
  nodeId?: string;
  actionId?: string;
  triggerId?: string;
  userId?: string;
  sessionId?: string;
  component: string;
  operation: string;
  requestId?: string;
  environment: 'development' | 'staging' | 'production';
  metadata: Record<string, unknown>;
}

export interface RetryInfo {
  attempt: number;
  maxAttempts: number;
  nextRetryAt?: Date;
  backoffDelay: number;
  strategy: RetryPolicy['backoffStrategy'];
  lastError?: string;
  retryHistory: RetryAttempt[];
}

export interface RetryAttempt {
  attempt: number;
  timestamp: Date;
  error: string;
  delay: number;
}

export interface CircuitBreaker {
  id: string;
  component: string;
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  nextRetryTime?: Date;
  lastFailureTime?: Date;
  config: CircuitBreakerConfig;
  statistics: {
    totalRequests: number;
    totalFailures: number;
    totalSuccesses: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

export interface DeadLetter {
  id: string;
  originalError: AutomationError;
  attempts: RetryAttempt[];
  queuedAt: Date;
  lastProcessedAt?: Date;
  status: 'queued' | 'processing' | 'failed' | 'completed';
  metadata: Record<string, unknown>;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<ErrorType, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsByComponent: Record<string, number>;
  errorRate: number;
  averageResolutionTime: number;
  retrySuccessRate: number;
  circuitBreakerTriggers: number;
  deadLetterItems: number;
  unresolvedErrors: number;
}

export class ErrorHandler extends EventEmitter {
  private config: ErrorConfig;
  private errors: Map<string, AutomationError> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private deadLetterQueue: Map<string, DeadLetter> = new Map();
  private retryQueues: Map<string, NodeJS.Timeout> = new Map();
  private errorRateLimiter: Map<string, { count: number; resetTime: Date }> = new Map();
  private isProcessingDeadLetters = false;
  private deadLetterInterval?: NodeJS.Timeout;

  constructor(config?: Partial<ErrorConfig>) {
    super();
    this.config = {
      enableGlobalErrorHandling: true,
      enableRetryMechanism: true,
      enableCircuitBreaker: true,
      enableDeadLetterQueue: true,
      defaultRetryPolicy: {
        enabled: true,
        maxRetries: 3,
        backoffStrategy: 'exponential',
        initialDelay: 1000,
        maxDelay: 60000,
        multiplier: 2,
        jitter: true,
        retryableErrors: ['network', 'timeout', 'service_unavailable', 'rate_limit'],
        nonRetryableErrors: ['validation', 'authorization', 'not_found']
      },
      circuitBreakerConfig: {
        enabled: true,
        failureThreshold: 5,
        resetTimeout: 60000,
        monitoringWindow: 300000, // 5 minutes
        halfOpenMaxCalls: 3,
        minimumThroughput: 10
      },
      deadLetterConfig: {
        enabled: true,
        maxRetries: 5,
        retention: 7 * 24 * 3600 * 1000, // 7 days
        batchSize: 10,
        processingInterval: 300000, // 5 minutes
        reprocessingStrategy: 'scheduled'
      },
      errorReporting: {
        enableSentry: false,
        enableSlack: true,
        enableEmail: true,
        enableWebhook: false,
        severityThreshold: 'medium',
        rateLimiting: {
          enabled: true,
          maxErrors: 100,
          timeWindow: 3600000 // 1 hour
        }
      },
      ...config
    };

    this.initialize();
  }

  private initialize(): void {
    if (this.config.enableGlobalErrorHandling) {
      this.setupGlobalErrorHandlers();
    }

    if (this.config.enableDeadLetterQueue) {
      this.startDeadLetterProcessing();
    }

    console.log('🛡️ ErrorHandler initialized');
  }

  // Main error handling entry point
  public async handleError(
    error: Error | string,
    context: Partial<ErrorContext>,
    retryPolicy?: Partial<RetryPolicy>
  ): Promise<string> {
    const errorId = uuidv4();
    const errorMessage = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'string' ? undefined : error.stack;

    const automationError: AutomationError = {
      id: errorId,
      type: this.classifyError(error, context),
      severity: this.determineSeverity(error, context),
      message: errorMessage,
      stack,
      timestamp: new Date(),
      context: {
        component: 'unknown',
        operation: 'unknown',
        environment: 'development',
        metadata: {},
        ...context
      },
      resolved: false,
      tags: this.generateErrorTags(error, context)
    };

    // Add additional error details
    if (typeof error === 'object' && error !== null) {
      automationError.details = {
        name: error.name,
        ...('code' in error && { code: error.code }),
        ...('statusCode' in error && { statusCode: error.statusCode }),
        ...('response' in error && { response: error.response })
      };
    }

    this.errors.set(errorId, automationError);
    this.emit('error:occurred', automationError);

    // Check circuit breaker
    if (this.config.enableCircuitBreaker && this.isCircuitOpen(context.component || 'unknown')) {
      console.warn(`🚫 Circuit breaker OPEN for ${context.component}, skipping operation`);
      throw new Error(`Service ${context.component} is currently unavailable (circuit breaker open)`);
    }

    // Report error if it meets criteria
    if (this.shouldReportError(automationError)) {
      await this.reportError(automationError);
    }

    // Update circuit breaker
    if (this.config.enableCircuitBreaker) {
      this.updateCircuitBreaker(context.component || 'unknown', false);
    }

    // Attempt retry if enabled
    if (this.config.enableRetryMechanism && this.shouldRetry(automationError, retryPolicy)) {
      await this.scheduleRetry(automationError, retryPolicy);
    } else if (this.config.enableDeadLetterQueue && this.shouldMoveToDeadLetter(automationError)) {
      await this.moveToDeadLetter(automationError);
    }

    console.error(`❌ Error handled: ${errorMessage} (${errorId})`);
    return errorId;
  }

  // Error classification
  private classifyError(error: Error | string, context: Partial<ErrorContext>): ErrorType {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorName = typeof error === 'string' ? '' : error.name;
    const statusCode = typeof error === 'object' && 'statusCode' in error ? error.statusCode : null;

    // HTTP status code based classification
    if (statusCode) {
      if (statusCode === 400) return 'bad_request';
      if (statusCode === 401) return 'authentication';
      if (statusCode === 403) return 'authorization';
      if (statusCode === 404) return 'not_found';
      if (statusCode === 409) return 'conflict';
      if (statusCode === 429) return 'rate_limit';
      if (statusCode >= 500) return 'internal_server';
      if (statusCode === 503) return 'service_unavailable';
    }

    // Error name based classification
    if (errorName.includes('Timeout')) return 'timeout';
    if (errorName.includes('Network')) return 'network';
    if (errorName.includes('Auth')) return 'authentication';
    if (errorName.includes('Validation')) return 'validation';

    // Message content based classification
    const lowerMessage = errorMessage.toLowerCase();
    if (lowerMessage.includes('timeout')) return 'timeout';
    if (lowerMessage.includes('network') || lowerMessage.includes('connection')) return 'network';
    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('authentication')) return 'authentication';
    if (lowerMessage.includes('forbidden') || lowerMessage.includes('permission')) return 'authorization';
    if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) return 'validation';
    if (lowerMessage.includes('rate limit')) return 'rate_limit';
    if (lowerMessage.includes('not found')) return 'not_found';
    if (lowerMessage.includes('conflict')) return 'conflict';
    if (lowerMessage.includes('unavailable')) return 'service_unavailable';

    return 'unknown';
  }

  private determineSeverity(error: Error | string, context: Partial<ErrorContext>): ErrorSeverity {
    const errorType = this.classifyError(error, context);
    
    // Critical errors
    if (['internal_server', 'resource_exhausted'].includes(errorType)) {
      return 'critical';
    }

    // High severity errors
    if (['service_unavailable', 'authentication', 'authorization'].includes(errorType)) {
      return 'high';
    }

    // Medium severity errors
    if (['network', 'timeout', 'rate_limit'].includes(errorType)) {
      return 'medium';
    }

    // Low severity errors (validation, not_found, etc.)
    return 'low';
  }

  private generateErrorTags(error: Error | string, context: Partial<ErrorContext>): string[] {
    const tags: string[] = [];
    
    if (context.workflowId) tags.push(`workflow:${context.workflowId}`);
    if (context.component) tags.push(`component:${context.component}`);
    if (context.operation) tags.push(`operation:${context.operation}`);
    if (context.environment) tags.push(`env:${context.environment}`);
    
    const errorType = this.classifyError(error, context);
    tags.push(`type:${errorType}`);
    
    return tags;
  }

  // Retry mechanism
  private shouldRetry(error: AutomationError, customPolicy?: Partial<RetryPolicy>): boolean {
    const policy = { ...this.config.defaultRetryPolicy, ...customPolicy };
    
    if (!policy.enabled) return false;
    if (error.retryInfo && error.retryInfo.attempt >= policy.maxRetries) return false;
    if (policy.nonRetryableErrors.includes(error.type)) return false;
    if (!policy.retryableErrors.includes(error.type)) return false;

    return true;
  }

  private async scheduleRetry(
    error: AutomationError,
    customPolicy?: Partial<RetryPolicy>
  ): Promise<void> {
    const policy = { ...this.config.defaultRetryPolicy, ...customPolicy };
    
    if (!error.retryInfo) {
      error.retryInfo = {
        attempt: 0,
        maxAttempts: policy.maxRetries,
        backoffDelay: policy.initialDelay,
        strategy: policy.backoffStrategy,
        retryHistory: []
      };
    }

    error.retryInfo.attempt++;
    error.retryInfo.backoffDelay = this.calculateBackoffDelay(
      error.retryInfo.attempt,
      policy
    );
    error.retryInfo.nextRetryAt = new Date(Date.now() + error.retryInfo.backoffDelay);

    // Record retry attempt
    error.retryInfo.retryHistory.push({
      attempt: error.retryInfo.attempt,
      timestamp: new Date(),
      error: error.message,
      delay: error.retryInfo.backoffDelay
    });

    this.errors.set(error.id, error);

    // Schedule the retry
    const timeout = setTimeout(async () => {
      await this.executeRetry(error);
      this.retryQueues.delete(error.id);
    }, error.retryInfo.backoffDelay);

    this.retryQueues.set(error.id, timeout);

    this.emit('retry:scheduled', error);
    console.log(`🔄 Retry scheduled: ${error.id} in ${error.retryInfo.backoffDelay}ms (attempt ${error.retryInfo.attempt}/${error.retryInfo.maxAttempts})`);
  }

  private calculateBackoffDelay(attempt: number, policy: RetryPolicy): number {
    let delay: number;

    switch (policy.backoffStrategy) {
      case 'fixed':
        delay = policy.initialDelay;
        break;
      case 'linear':
        delay = policy.initialDelay * attempt;
        break;
      case 'exponential':
        delay = policy.initialDelay * Math.pow(policy.multiplier, attempt - 1);
        break;
      case 'jittered':
        const exponentialDelay = policy.initialDelay * Math.pow(policy.multiplier, attempt - 1);
        delay = exponentialDelay + (Math.random() * exponentialDelay * 0.1); // Add 10% jitter
        break;
      default:
        delay = policy.initialDelay;
    }

    // Apply jitter if enabled
    if (policy.jitter && policy.backoffStrategy !== 'jittered') {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay += (Math.random() * jitterAmount * 2) - jitterAmount;
    }

    return Math.min(delay, policy.maxDelay);
  }

  private async executeRetry(error: AutomationError): Promise<void> {
    try {
      this.emit('retry:executing', error);
      console.log(`🔄 Executing retry: ${error.id} (attempt ${error.retryInfo?.attempt})`);

      // In a real implementation, this would re-execute the original operation
      // For now, simulate a retry that might succeed or fail
      const success = Math.random() > 0.3; // 70% success rate for demo

      if (success) {
        error.resolved = true;
        error.resolvedAt = new Date();
        this.errors.set(error.id, error);

        // Update circuit breaker with success
        if (this.config.enableCircuitBreaker) {
          this.updateCircuitBreaker(error.context.component, true);
        }

        this.emit('retry:succeeded', error);
        console.log(`✅ Retry succeeded: ${error.id}`);
      } else {
        // Check if we should schedule another retry
        if (error.retryInfo!.attempt < error.retryInfo!.maxAttempts) {
          await this.scheduleRetry(error);
        } else {
          // Max retries reached, move to dead letter queue
          if (this.config.enableDeadLetterQueue) {
            await this.moveToDeadLetter(error);
          }
          
          this.emit('retry:exhausted', error);
          console.error(`❌ Retry exhausted: ${error.id}`);
        }
      }

    } catch (retryError) {
      console.error(`Error during retry execution: ${error.id}`, retryError);
      this.emit('retry:error', { originalError: error, retryError });
    }
  }

  // Circuit breaker
  private getCircuitBreaker(component: string): CircuitBreaker {
    let breaker = this.circuitBreakers.get(component);
    
    if (!breaker) {
      breaker = {
        id: uuidv4(),
        component,
        state: 'closed',
        failureCount: 0,
        successCount: 0,
        config: this.config.circuitBreakerConfig,
        statistics: {
          totalRequests: 0,
          totalFailures: 0,
          totalSuccesses: 0,
          averageResponseTime: 0,
          errorRate: 0
        }
      };
      this.circuitBreakers.set(component, breaker);
    }

    return breaker;
  }

  private isCircuitOpen(component: string): boolean {
    const breaker = this.getCircuitBreaker(component);
    
    if (breaker.state === 'open') {
      // Check if we should transition to half-open
      if (breaker.nextRetryTime && new Date() >= breaker.nextRetryTime) {
        breaker.state = 'half-open';
        breaker.successCount = 0;
        this.circuitBreakers.set(component, breaker);
        this.emit('circuit:half-open', breaker);
        console.log(`🟡 Circuit breaker HALF-OPEN: ${component}`);
      }
      return breaker.state === 'open';
    }

    return false;
  }

  private updateCircuitBreaker(component: string, success: boolean): void {
    const breaker = this.getCircuitBreaker(component);
    const config = breaker.config;

    breaker.statistics.totalRequests++;

    if (success) {
      breaker.successCount++;
      breaker.statistics.totalSuccesses++;
      
      // Reset failure count on success
      if (breaker.state === 'half-open') {
        if (breaker.successCount >= config.halfOpenMaxCalls) {
          breaker.state = 'closed';
          breaker.failureCount = 0;
          this.emit('circuit:closed', breaker);
          console.log(`🟢 Circuit breaker CLOSED: ${component}`);
        }
      } else if (breaker.state === 'closed') {
        breaker.failureCount = Math.max(0, breaker.failureCount - 1);
      }
    } else {
      breaker.failureCount++;
      breaker.statistics.totalFailures++;
      breaker.lastFailureTime = new Date();

      // Check if we should open the circuit
      if (breaker.state === 'closed' || breaker.state === 'half-open') {
        if (breaker.failureCount >= config.failureThreshold) {
          breaker.state = 'open';
          breaker.nextRetryTime = new Date(Date.now() + config.resetTimeout);
          this.emit('circuit:open', breaker);
          console.log(`🔴 Circuit breaker OPEN: ${component}`);
        }
      }
    }

    // Update statistics
    breaker.statistics.errorRate = breaker.statistics.totalFailures / breaker.statistics.totalRequests;
    
    this.circuitBreakers.set(component, breaker);
  }

  // Dead letter queue
  private shouldMoveToDeadLetter(error: AutomationError): boolean {
    if (!this.config.deadLetterConfig.enabled) return false;
    
    // Move to dead letter if retries are exhausted or error is non-retryable
    return (error.retryInfo && error.retryInfo.attempt >= error.retryInfo.maxAttempts) ||
           this.config.defaultRetryPolicy.nonRetryableErrors.includes(error.type);
  }

  private async moveToDeadLetter(error: AutomationError): Promise<void> {
    const deadLetterId = uuidv4();
    const deadLetter: DeadLetter = {
      id: deadLetterId,
      originalError: error,
      attempts: error.retryInfo?.retryHistory || [],
      queuedAt: new Date(),
      status: 'queued',
      metadata: {
        reason: error.retryInfo ? 'retry_exhausted' : 'non_retryable',
        queuedBy: 'error_handler'
      }
    };

    this.deadLetterQueue.set(deadLetterId, deadLetter);
    this.emit('dead-letter:queued', deadLetter);
    
    console.log(`📮 Moved to dead letter queue: ${error.id} -> ${deadLetterId}`);
  }

  private startDeadLetterProcessing(): void {
    if (!this.isProcessingDeadLetters) {
      this.isProcessingDeadLetters = true;
      
      this.deadLetterInterval = setInterval(async () => {
        await this.processDeadLetterQueue();
      }, this.config.deadLetterConfig.processingInterval);
    }
  }

  private async processDeadLetterQueue(): Promise<void> {
    const queuedItems = Array.from(this.deadLetterQueue.values())
      .filter(item => item.status === 'queued')
      .slice(0, this.config.deadLetterConfig.batchSize);

    if (queuedItems.length === 0) return;

    console.log(`📮 Processing ${queuedItems.length} dead letter items`);

    for (const item of queuedItems) {
      try {
        item.status = 'processing';
        item.lastProcessedAt = new Date();
        this.deadLetterQueue.set(item.id, item);

        // Attempt reprocessing based on strategy
        const success = await this.reprocessDeadLetterItem(item);
        
        item.status = success ? 'completed' : 'failed';
        this.deadLetterQueue.set(item.id, item);

        this.emit('dead-letter:processed', { item, success });

      } catch (error) {
        console.error(`Error processing dead letter item ${item.id}:`, error);
        item.status = 'failed';
        this.deadLetterQueue.set(item.id, item);
      }
    }
  }

  private async reprocessDeadLetterItem(item: DeadLetter): Promise<boolean> {
    // Simulate reprocessing - in production, this would re-execute the original operation
    // with potentially updated configuration or fixed conditions
    
    const reprocessingStrategy = this.config.deadLetterConfig.reprocessingStrategy;
    
    switch (reprocessingStrategy) {
      case 'immediate':
        // Try immediate reprocessing
        return Math.random() > 0.5; // 50% success rate for demo
      
      case 'scheduled':
        // Schedule for later reprocessing
        console.log(`⏰ Scheduled reprocessing for: ${item.id}`);
        return true;
      
      case 'manual':
        // Requires manual intervention
        console.log(`👤 Manual intervention required for: ${item.id}`);
        return false;
      
      default:
        return false;
    }
  }

  // Error reporting
  private shouldReportError(error: AutomationError): boolean {
    const config = this.config.errorReporting;
    
    // Check severity threshold
    const severityLevels = ['low', 'medium', 'high', 'critical'];
    const errorLevel = severityLevels.indexOf(error.severity);
    const thresholdLevel = severityLevels.indexOf(config.severityThreshold);
    
    if (errorLevel < thresholdLevel) return false;

    // Check rate limiting
    if (config.rateLimiting.enabled) {
      const key = `${error.type}:${error.context.component}`;
      const limiter = this.errorRateLimiter.get(key);
      const now = new Date();

      if (limiter && now < limiter.resetTime) {
        if (limiter.count >= config.rateLimiting.maxErrors) {
          return false; // Rate limited
        }
        limiter.count++;
      } else {
        this.errorRateLimiter.set(key, {
          count: 1,
          resetTime: new Date(now.getTime() + config.rateLimiting.timeWindow)
        });
      }
    }

    return true;
  }

  private async reportError(error: AutomationError): Promise<void> {
    const config = this.config.errorReporting;
    const promises: Promise<void>[] = [];

    if (config.enableEmail) {
      promises.push(this.sendEmailReport(error));
    }

    if (config.enableSlack) {
      promises.push(this.sendSlackReport(error));
    }

    if (config.enableSentry) {
      promises.push(this.sendSentryReport(error));
    }

    if (config.enableWebhook) {
      promises.push(this.sendWebhookReport(error));
    }

    try {
      await Promise.allSettled(promises);
      this.emit('error:reported', error);
    } catch (reportingError) {
      console.error('Error reporting failed:', reportingError);
    }
  }

  private async sendEmailReport(error: AutomationError): Promise<void> {
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log(`📧 Email report sent for error: ${error.id}`);
  }

  private async sendSlackReport(error: AutomationError): Promise<void> {
    // Simulate Slack notification
    await new Promise(resolve => setTimeout(resolve, 150));
    console.log(`💬 Slack notification sent for error: ${error.id}`);
  }

  private async sendSentryReport(error: AutomationError): Promise<void> {
    // Simulate Sentry reporting
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log(`🎯 Sentry report sent for error: ${error.id}`);
  }

  private async sendWebhookReport(error: AutomationError): Promise<void> {
    // Simulate webhook call
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log(`🎣 Webhook report sent for error: ${error.id}`);
  }

  // Global error handlers
  private setupGlobalErrorHandlers(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.handleError(error, {
        component: 'process',
        operation: 'uncaught_exception',
        environment: process.env.NODE_ENV as any || 'development'
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.handleError(reason as Error, {
        component: 'process',
        operation: 'unhandled_rejection',
        environment: process.env.NODE_ENV as any || 'development',
        metadata: { promise: promise.toString() }
      });
    });
  }

  // Public API methods
  public getError(errorId: string): AutomationError | undefined {
    return this.errors.get(errorId);
  }

  public getErrors(filters?: {
    type?: ErrorType;
    severity?: ErrorSeverity;
    component?: string;
    resolved?: boolean;
    since?: Date;
  }): AutomationError[] {
    let errors = Array.from(this.errors.values());

    if (filters) {
      if (filters.type) {
        errors = errors.filter(e => e.type === filters.type);
      }
      if (filters.severity) {
        errors = errors.filter(e => e.severity === filters.severity);
      }
      if (filters.component) {
        errors = errors.filter(e => e.context.component === filters.component);
      }
      if (filters.resolved !== undefined) {
        errors = errors.filter(e => e.resolved === filters.resolved);
      }
      if (filters.since) {
        errors = errors.filter(e => e.timestamp >= filters.since!);
      }
    }

    return errors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public getCircuitBreakers(): CircuitBreaker[] {
    return Array.from(this.circuitBreakers.values());
  }

  public getDeadLetterItems(): DeadLetter[] {
    return Array.from(this.deadLetterQueue.values());
  }

  public resolveError(errorId: string): boolean {
    const error = this.errors.get(errorId);
    if (!error) return false;

    error.resolved = true;
    error.resolvedAt = new Date();
    this.errors.set(errorId, error);

    this.emit('error:resolved', error);
    console.log(`✅ Error resolved: ${errorId}`);
    
    return true;
  }

  public cancelRetry(errorId: string): boolean {
    const timeout = this.retryQueues.get(errorId);
    if (!timeout) return false;

    clearTimeout(timeout);
    this.retryQueues.delete(errorId);

    this.emit('retry:cancelled', { errorId });
    console.log(`⏹️ Retry cancelled: ${errorId}`);
    
    return true;
  }

  public resetCircuitBreaker(component: string): boolean {
    const breaker = this.circuitBreakers.get(component);
    if (!breaker) return false;

    breaker.state = 'closed';
    breaker.failureCount = 0;
    breaker.successCount = 0;
    delete breaker.nextRetryTime;
    delete breaker.lastFailureTime;

    this.circuitBreakers.set(component, breaker);
    this.emit('circuit:reset', breaker);
    
    console.log(`🔄 Circuit breaker reset: ${component}`);
    return true;
  }

  public reprocessDeadLetter(deadLetterId: string): Promise<boolean> {
    const item = this.deadLetterQueue.get(deadLetterId);
    if (!item) {
      return Promise.resolve(false);
    }

    return this.reprocessDeadLetterItem(item);
  }

  public getMetrics(): ErrorMetrics {
    const errors = Array.from(this.errors.values());
    const deadLetters = Array.from(this.deadLetterQueue.values());
    const circuitBreakers = Array.from(this.circuitBreakers.values());

    const totalErrors = errors.length;
    const unresolvedErrors = errors.filter(e => !e.resolved).length;
    const resolvedErrors = errors.filter(e => e.resolved);

    const averageResolutionTime = resolvedErrors.length > 0
      ? resolvedErrors.reduce((sum, e) => {
          return sum + ((e.resolvedAt?.getTime() || 0) - e.timestamp.getTime());
        }, 0) / resolvedErrors.length
      : 0;

    const errorsByType = errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<ErrorType, number>);

    const errorsBySeverity = errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    const errorsByComponent = errors.reduce((acc, error) => {
      const component = error.context.component;
      acc[component] = (acc[component] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const retriedErrors = errors.filter(e => e.retryInfo && e.retryInfo.attempt > 0);
    const successfulRetries = retriedErrors.filter(e => e.resolved);
    const retrySuccessRate = retriedErrors.length > 0 
      ? successfulRetries.length / retriedErrors.length 
      : 0;

    const circuitBreakerTriggers = circuitBreakers.filter(cb => cb.state === 'open').length;

    // Calculate error rate (errors per hour)
    const oneHourAgo = new Date(Date.now() - 3600000);
    const recentErrors = errors.filter(e => e.timestamp >= oneHourAgo);
    const errorRate = recentErrors.length;

    return {
      totalErrors,
      errorsByType,
      errorsBySeverity,
      errorsByComponent,
      errorRate,
      averageResolutionTime,
      retrySuccessRate,
      circuitBreakerTriggers,
      deadLetterItems: deadLetters.length,
      unresolvedErrors
    };
  }

  public shutdown(): void {
    // Cancel all pending retries
    for (const timeout of this.retryQueues.values()) {
      clearTimeout(timeout);
    }
    this.retryQueues.clear();

    // Stop dead letter processing
    if (this.deadLetterInterval) {
      clearInterval(this.deadLetterInterval);
    }

    this.removeAllListeners();
    console.log('🛑 ErrorHandler shutdown complete');
  }
}

export const errorHandler = new ErrorHandler();