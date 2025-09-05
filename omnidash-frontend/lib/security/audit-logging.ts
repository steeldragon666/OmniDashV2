import { getCacheManager } from '@/lib/cache/cache-manager';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

/**
 * Audit event types
 */
export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'auth.login.success',
  LOGIN_FAILURE = 'auth.login.failure',
  LOGOUT = 'auth.logout',
  PASSWORD_CHANGE = 'auth.password.change',
  PASSWORD_RESET = 'auth.password.reset',
  
  // Authorization events
  ACCESS_GRANTED = 'authz.access.granted',
  ACCESS_DENIED = 'authz.access.denied',
  PERMISSION_CHANGE = 'authz.permission.change',
  
  // Data events
  DATA_CREATE = 'data.create',
  DATA_READ = 'data.read',
  DATA_UPDATE = 'data.update',
  DATA_DELETE = 'data.delete',
  DATA_EXPORT = 'data.export',
  
  // System events
  SYSTEM_START = 'system.start',
  SYSTEM_STOP = 'system.stop',
  SYSTEM_ERROR = 'system.error',
  CONFIG_CHANGE = 'system.config.change',
  
  // Security events
  SECURITY_BREACH_ATTEMPT = 'security.breach.attempt',
  SECURITY_POLICY_VIOLATION = 'security.policy.violation',
  RATE_LIMIT_EXCEEDED = 'security.rate_limit.exceeded',
  SUSPICIOUS_ACTIVITY = 'security.suspicious.activity',
  
  // Workflow events
  WORKFLOW_CREATE = 'workflow.create',
  WORKFLOW_UPDATE = 'workflow.update',
  WORKFLOW_DELETE = 'workflow.delete',
  WORKFLOW_EXECUTE = 'workflow.execute',
  
  // API events
  API_REQUEST = 'api.request',
  API_ERROR = 'api.error',
  API_RATE_LIMIT = 'api.rate_limit'
}

/**
 * Audit event severity levels
 */
export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Audit event interface
 */
export interface AuditEvent {
  // Required fields
  eventType: AuditEventType;
  timestamp: string;
  severity: AuditSeverity;
  
  // User information
  userId?: string;
  userEmail?: string;
  sessionId?: string;
  
  // Request information
  ip?: string;
  userAgent?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  
  // Event details
  resource?: string;
  action?: string;
  details?: Record<string, any>;
  
  // Result information
  success: boolean;
  errorMessage?: string;
  errorCode?: string;
  
  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Audit logger configuration
 */
interface AuditLoggerConfig {
  logLevel: string;
  logDir: string;
  maxFiles: string;
  datePattern: string;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

/**
 * Audit logger class
 */
export class AuditLogger {
  private logger: winston.Logger;
  private cacheManager = getCacheManager();
  private config: AuditLoggerConfig;
  
  constructor(config?: Partial<AuditLoggerConfig>) {
    this.config = {
      logLevel: 'info',
      logDir: './logs/audit',
      maxFiles: '30d',
      datePattern: 'YYYY-MM-DD',
      compressionEnabled: true,
      encryptionEnabled: process.env.NODE_ENV === 'production',
      ...config
    };
    
    this.initializeLogger();
  }
  
  private initializeLogger(): void {
    const transports: winston.transport[] = [
      // Daily rotate file transport for audit logs
      new DailyRotateFile({
        filename: `${this.config.logDir}/audit-%DATE%.log`,
        datePattern: this.config.datePattern,
        maxFiles: this.config.maxFiles,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
          winston.format.prettyPrint()
        )
      }),
      
      // Separate file for high-severity events
      new DailyRotateFile({
        filename: `${this.config.logDir}/security-%DATE%.log`,
        datePattern: this.config.datePattern,
        maxFiles: this.config.maxFiles,
        level: 'warn',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
          winston.format.prettyPrint()
        )
      })
    ];
    
    // Add console transport in development
    if (process.env.NODE_ENV === 'development') {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      );
    }
    
    this.logger = winston.createLogger({
      level: this.config.logLevel,
      transports,
      exceptionHandlers: [
        new DailyRotateFile({
          filename: `${this.config.logDir}/exceptions-%DATE%.log`,
          datePattern: this.config.datePattern,
          maxFiles: this.config.maxFiles
        })
      ],
      rejectionHandlers: [
        new DailyRotateFile({
          filename: `${this.config.logDir}/rejections-%DATE%.log`,
          datePattern: this.config.datePattern,
          maxFiles: this.config.maxFiles
        })
      ]
    });
  }
  
  /**
   * Log an audit event
   */
  async logEvent(event: AuditEvent): Promise<void> {
    try {
      // Add correlation ID if not present
      if (!event.requestId) {
        event.requestId = this.generateCorrelationId();
      }
      
      // Ensure timestamp is present
      if (!event.timestamp) {
        event.timestamp = new Date().toISOString();
      }
      
      // Determine log level based on severity
      const logLevel = this.getLogLevel(event.severity);
      
      // Log the event
      this.logger.log(logLevel, 'Audit Event', event);
      
      // Cache recent events for monitoring
      await this.cacheRecentEvent(event);
      
      // Check for security patterns
      await this.analyzeSecurity(event);
      
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }
  
  /**
   * Log authentication event
   */
  async logAuth(
    type: AuditEventType,
    userId: string,
    success: boolean,
    details?: Record<string, any>,
    request?: {
      ip?: string;
      userAgent?: string;
      endpoint?: string;
    }
  ): Promise<void> {
    const event: AuditEvent = {
      eventType: type,
      timestamp: new Date().toISOString(),
      severity: success ? AuditSeverity.LOW : AuditSeverity.MEDIUM,
      userId,
      success,
      details,
      ...request
    };
    
    await this.logEvent(event);
  }
  
  /**
   * Log data access event
   */
  async logDataAccess(
    type: AuditEventType,
    userId: string,
    resource: string,
    action: string,
    success: boolean,
    details?: Record<string, any>
  ): Promise<void> {
    const event: AuditEvent = {
      eventType: type,
      timestamp: new Date().toISOString(),
      severity: AuditSeverity.LOW,
      userId,
      resource,
      action,
      success,
      details
    };
    
    await this.logEvent(event);
  }
  
  /**
   * Log security event
   */
  async logSecurity(
    type: AuditEventType,
    severity: AuditSeverity,
    details: Record<string, any>,
    request?: {
      ip?: string;
      userAgent?: string;
      userId?: string;
    }
  ): Promise<void> {
    const event: AuditEvent = {
      eventType: type,
      timestamp: new Date().toISOString(),
      severity,
      success: false,
      details,
      ...request
    };
    
    await this.logEvent(event);
    
    // Alert on high-severity security events
    if (severity === AuditSeverity.CRITICAL) {
      await this.triggerSecurityAlert(event);
    }
  }
  
  /**
   * Log API request
   */
  async logAPIRequest(
    endpoint: string,
    method: string,
    userId: string | undefined,
    ip: string,
    userAgent: string,
    statusCode: number,
    responseTime: number,
    details?: Record<string, any>
  ): Promise<void> {
    const event: AuditEvent = {
      eventType: AuditEventType.API_REQUEST,
      timestamp: new Date().toISOString(),
      severity: AuditSeverity.LOW,
      userId,
      ip,
      userAgent,
      endpoint,
      method,
      success: statusCode < 400,
      details: {
        statusCode,
        responseTime,
        ...details
      }
    };
    
    await this.logEvent(event);
  }
  
  /**
   * Get recent audit events
   */
  async getRecentEvents(
    count: number = 100,
    eventType?: AuditEventType,
    severity?: AuditSeverity
  ): Promise<AuditEvent[]> {
    try {
      const cacheKey = 'audit:recent_events';
      const events = await this.cacheManager.get<AuditEvent[]>(cacheKey) || [];
      
      let filteredEvents = events;
      
      if (eventType) {
        filteredEvents = filteredEvents.filter(event => event.eventType === eventType);
      }
      
      if (severity) {
        filteredEvents = filteredEvents.filter(event => event.severity === severity);
      }
      
      return filteredEvents.slice(0, count);
      
    } catch (error) {
      console.error('Failed to get recent audit events:', error);
      return [];
    }
  }
  
  /**
   * Get audit statistics
   */
  async getAuditStats(timeframe: '1h' | '24h' | '7d' = '24h'): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    securityEvents: number;
    failedEvents: number;
  }> {
    try {
      const cacheKey = `audit:stats:${timeframe}`;
      const cached = await this.cacheManager.get(cacheKey);
      
      if (cached) {
        return cached;
      }
      
      const events = await this.getRecentEvents(1000);
      const cutoff = this.getTimeframeCutoff(timeframe);
      
      const recentEvents = events.filter(
        event => new Date(event.timestamp) >= cutoff
      );
      
      const stats = {
        totalEvents: recentEvents.length,
        eventsByType: this.groupBy(recentEvents, 'eventType'),
        eventsBySeverity: this.groupBy(recentEvents, 'severity'),
        securityEvents: recentEvents.filter(e => 
          e.eventType.startsWith('security.')
        ).length,
        failedEvents: recentEvents.filter(e => !e.success).length
      };
      
      // Cache for 5 minutes
      await this.cacheManager.set(cacheKey, stats, 300);
      
      return stats;
      
    } catch (error) {
      console.error('Failed to get audit stats:', error);
      return {
        totalEvents: 0,
        eventsByType: {},
        eventsBySeverity: {},
        securityEvents: 0,
        failedEvents: 0
      };
    }
  }
  
  private getLogLevel(severity: AuditSeverity): string {
    switch (severity) {
      case AuditSeverity.LOW:
        return 'info';
      case AuditSeverity.MEDIUM:
        return 'warn';
      case AuditSeverity.HIGH:
        return 'error';
      case AuditSeverity.CRITICAL:
        return 'error';
      default:
        return 'info';
    }
  }
  
  private generateCorrelationId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
  
  private async cacheRecentEvent(event: AuditEvent): Promise<void> {
    try {
      const cacheKey = 'audit:recent_events';
      const events = await this.cacheManager.get<AuditEvent[]>(cacheKey) || [];
      
      events.unshift(event);
      
      // Keep only last 1000 events
      const trimmedEvents = events.slice(0, 1000);
      
      await this.cacheManager.set(cacheKey, trimmedEvents, 3600); // 1 hour TTL
      
    } catch (error) {
      console.error('Failed to cache recent audit event:', error);
    }
  }
  
  private async analyzeSecurity(event: AuditEvent): Promise<void> {
    // Check for suspicious patterns
    if (event.eventType === AuditEventType.LOGIN_FAILURE) {
      await this.checkFailedLogins(event);
    }
    
    if (event.eventType === AuditEventType.RATE_LIMIT_EXCEEDED) {
      await this.checkRateLimitPattern(event);
    }
    
    // Check for brute force patterns
    if (event.ip) {
      await this.checkBruteForcePattern(event.ip);
    }
  }
  
  private async checkFailedLogins(event: AuditEvent): Promise<void> {
    const key = `failed_logins:${event.userId || event.ip}`;
    const count = await this.cacheManager.incr(key);
    
    if (count === 1) {
      // Set expiry for 15 minutes
      await this.cacheManager.set(key, count, 900);
    }
    
    if (count >= 5) {
      await this.logSecurity(
        AuditEventType.SUSPICIOUS_ACTIVITY,
        AuditSeverity.HIGH,
        {
          type: 'multiple_failed_logins',
          count,
          timeframe: '15min'
        },
        {
          userId: event.userId,
          ip: event.ip
        }
      );
    }
  }
  
  private async checkRateLimitPattern(event: AuditEvent): Promise<void> {
    const key = `rate_limit_violations:${event.ip}`;
    const count = await this.cacheManager.incr(key);
    
    if (count === 1) {
      // Set expiry for 1 hour
      await this.cacheManager.set(key, count, 3600);
    }
    
    if (count >= 10) {
      await this.logSecurity(
        AuditEventType.SECURITY_BREACH_ATTEMPT,
        AuditSeverity.CRITICAL,
        {
          type: 'persistent_rate_limit_violations',
          count,
          timeframe: '1hour'
        },
        {
          ip: event.ip
        }
      );
    }
  }
  
  private async checkBruteForcePattern(ip: string): Promise<void> {
    const key = `requests:${ip}`;
    const count = await this.cacheManager.incr(key);
    
    if (count === 1) {
      // Set expiry for 1 minute
      await this.cacheManager.set(key, count, 60);
    }
    
    if (count >= 100) {
      await this.logSecurity(
        AuditEventType.SECURITY_BREACH_ATTEMPT,
        AuditSeverity.HIGH,
        {
          type: 'potential_brute_force',
          requestCount: count,
          timeframe: '1min'
        },
        { ip }
      );
    }
  }
  
  private async triggerSecurityAlert(event: AuditEvent): Promise<void> {
    // In a real implementation, this would send alerts via:
    // - Email notifications
    // - Slack/Teams webhooks
    // - SMS alerts
    // - SIEM integration
    console.error('CRITICAL SECURITY EVENT:', event);
  }
  
  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((groups: Record<string, number>, item) => {
      const group = String(item[key]);
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {});
  }
  
  private getTimeframeCutoff(timeframe: '1h' | '24h' | '7d'): Date {
    const now = new Date();
    
    switch (timeframe) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }
}

// Singleton instance
let auditLogger: AuditLogger | null = null;

export function getAuditLogger(): AuditLogger {
  if (!auditLogger) {
    auditLogger = new AuditLogger();
  }
  return auditLogger;
}