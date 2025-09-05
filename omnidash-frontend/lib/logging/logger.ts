/**
 * Structured Logging System with Winston
 * Provides production-ready logging with rotation, formatting, and multiple transports
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'gray'
};

// Add colors to Winston
winston.addColors(logColors);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata, null, 2)}`;
    }
    
    return msg;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Get log configuration from environment
const getLogConfig = () => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');
  const logDir = process.env.LOG_DIR || './logs';
  
  return {
    isDevelopment,
    logLevel,
    logDir
  };
};

const { isDevelopment, logLevel, logDir } = getLogConfig();

// Create transports array
const transports: winston.transport[] = [];

// Console transport (always enabled in development)
if (isDevelopment) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: logLevel
    })
  );
} else {
  // In production, only log errors and above to console
  transports.push(
    new winston.transports.Console({
      format: fileFormat,
      level: 'error'
    })
  );
}

// File transport for errors
transports.push(
  new DailyRotateFile({
    filename: `${logDir}/error-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: fileFormat,
    maxSize: '20m',
    maxFiles: '30d',
    zippedArchive: true
  })
);

// File transport for all logs
transports.push(
  new DailyRotateFile({
    filename: `${logDir}/application-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    level: logLevel,
    format: fileFormat,
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true
  })
);

// Create logger instance
const logger = winston.createLogger({
  levels: logLevels,
  level: logLevel,
  transports,
  exitOnError: false,
  // Handle uncaught exceptions
  exceptionHandlers: [
    new DailyRotateFile({
      filename: `${logDir}/exceptions-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      format: fileFormat,
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true
    })
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new DailyRotateFile({
      filename: `${logDir}/rejections-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      format: fileFormat,
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true
    })
  ]
});

// Create a stream for Morgan HTTP logging
export const httpLogStream = {
  write: (message: string) => {
    logger.http(message.trim());
  }
};

// Performance logging helper
class PerformanceLogger {
  private timers: Map<string, number> = new Map();
  
  start(label: string): void {
    this.timers.set(label, Date.now());
    logger.debug(`Performance timer started: ${label}`);
  }
  
  end(label: string, metadata?: any): void {
    const startTime = this.timers.get(label);
    
    if (!startTime) {
      logger.warn(`Performance timer not found: ${label}`);
      return;
    }
    
    const duration = Date.now() - startTime;
    this.timers.delete(label);
    
    logger.info(`Performance: ${label}`, {
      duration: `${duration}ms`,
      ...metadata
    });
    
    // Log warning if operation took too long
    if (duration > 1000) {
      logger.warn(`Slow operation detected: ${label}`, {
        duration: `${duration}ms`,
        threshold: '1000ms',
        ...metadata
      });
    }
  }
}

// Audit logging helper
class AuditLogger {
  log(action: string, userId: string, metadata?: any): void {
    logger.info('AUDIT', {
      action,
      userId,
      timestamp: new Date().toISOString(),
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
      ...metadata
    });
  }
  
  logSuccess(action: string, userId: string, metadata?: any): void {
    this.log(action, userId, {
      status: 'success',
      ...metadata
    });
  }
  
  logFailure(action: string, userId: string, reason: string, metadata?: any): void {
    this.log(action, userId, {
      status: 'failure',
      reason,
      ...metadata
    });
  }
}

// Security logging helper
class SecurityLogger {
  logAuthAttempt(success: boolean, userId?: string, metadata?: any): void {
    const level = success ? 'info' : 'warn';
    
    logger[level]('SECURITY: Authentication attempt', {
      success,
      userId: userId || 'unknown',
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }
  
  logAccessDenied(resource: string, userId: string, reason: string): void {
    logger.warn('SECURITY: Access denied', {
      resource,
      userId,
      reason,
      timestamp: new Date().toISOString()
    });
  }
  
  logSuspiciousActivity(activity: string, userId?: string, metadata?: any): void {
    logger.error('SECURITY: Suspicious activity detected', {
      activity,
      userId: userId || 'unknown',
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }
  
  logRateLimitExceeded(endpoint: string, identifier: string): void {
    logger.warn('SECURITY: Rate limit exceeded', {
      endpoint,
      identifier,
      timestamp: new Date().toISOString()
    });
  }
}

// Database logging helper
class DatabaseLogger {
  logQuery(query: string, duration: number, metadata?: any): void {
    const level = duration > 1000 ? 'warn' : 'debug';
    
    logger[level]('DATABASE: Query executed', {
      query: query.substring(0, 500), // Truncate long queries
      duration: `${duration}ms`,
      slow: duration > 1000,
      ...metadata
    });
  }
  
  logError(operation: string, error: Error, metadata?: any): void {
    logger.error('DATABASE: Operation failed', {
      operation,
      error: error.message,
      stack: error.stack,
      ...metadata
    });
  }
  
  logConnection(event: 'connected' | 'disconnected' | 'error', metadata?: any): void {
    const level = event === 'error' ? 'error' : 'info';
    
    logger[level](`DATABASE: ${event}`, metadata);
  }
}

// API logging helper
class APILogger {
  logRequest(method: string, path: string, metadata?: any): void {
    logger.http('API Request', {
      method,
      path,
      ...metadata
    });
  }
  
  logResponse(method: string, path: string, statusCode: number, duration: number, metadata?: any): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'http';
    
    logger[level]('API Response', {
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
      ...metadata
    });
  }
  
  logError(method: string, path: string, error: Error, metadata?: any): void {
    logger.error('API Error', {
      method,
      path,
      error: error.message,
      stack: error.stack,
      ...metadata
    });
  }
}

// Export logger and helpers
export { logger };
export const performanceLogger = new PerformanceLogger();
export const auditLogger = new AuditLogger();
export const securityLogger = new SecurityLogger();
export const databaseLogger = new DatabaseLogger();
export const apiLogger = new APILogger();

// Replace console methods in production
if (process.env.NODE_ENV === 'production') {
  console.log = (...args) => logger.info(args.join(' '));
  console.info = (...args) => logger.info(args.join(' '));
  console.warn = (...args) => logger.warn(args.join(' '));
  console.error = (...args) => logger.error(args.join(' '));
  console.debug = (...args) => logger.debug(args.join(' '));
}

// Log startup
logger.info('Logger initialized', {
  environment: process.env.NODE_ENV,
  logLevel,
  logDir
});

export default logger;