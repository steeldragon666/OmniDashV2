/**
 * Agent Logger Utility
 * Provides centralized logging for all agents with structured logging and context
 */

import winston, { Logger, format } from 'winston';
import path from 'path';

export class AgentLogger {
  private static loggers: Map<string, Logger> = new Map();
  private static defaultLogLevel = process.env.LOG_LEVEL || 'info';
  private static logDirectory = process.env.LOG_DIR || 'logs';

  /**
   * Create or get a logger for a specific agent
   */
  public static createLogger(agentId: string, agentName: string): Logger {
    const loggerKey = `${agentId}-${agentName}`;
    
    if (this.loggers.has(loggerKey)) {
      return this.loggers.get(loggerKey)!;
    }

    const logger = winston.createLogger({
      level: this.defaultLogLevel,
      format: format.combine(
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss.SSS'
        }),
        format.errors({ stack: true }),
        format.json(),
        format.printf(({ timestamp, level, message, agentId, agentName, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            agentId,
            agentName,
            message,
            ...meta
          });
        })
      ),
      defaultMeta: {
        agentId,
        agentName,
        service: 'omnidash-agents'
      },
      transports: [
        // Console transport
        new winston.transports.Console({
          format: format.combine(
            format.colorize(),
            format.printf(({ timestamp, level, message, agentId, agentName }) => {
              return `${timestamp} [${level}] [${agentName}:${agentId}] ${message}`;
            })
          )
        }),
        
        // File transport for all logs
        new winston.transports.File({
          filename: path.join(this.logDirectory, 'agents.log'),
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 5,
          tailable: true
        }),
        
        // File transport for errors
        new winston.transports.File({
          filename: path.join(this.logDirectory, 'agents-error.log'),
          level: 'error',
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 5,
          tailable: true
        }),
        
        // File transport for specific agent
        new winston.transports.File({
          filename: path.join(this.logDirectory, `agent-${agentName.toLowerCase()}.log`),
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 3,
          tailable: true
        })
      ]
    });

    // Handle uncaught exceptions and rejections
    logger.exceptions.handle(
      new winston.transports.File({
        filename: path.join(this.logDirectory, 'exceptions.log')
      })
    );

    this.loggers.set(loggerKey, logger);
    return logger;
  }

  /**
   * Create a child logger with additional context
   */
  public static createChildLogger(
    parentLogger: Logger,
    context: Record<string, any>
  ): Logger {
    return parentLogger.child(context);
  }

  /**
   * Set log level for all loggers
   */
  public static setLogLevel(level: string): void {
    this.defaultLogLevel = level;
    this.loggers.forEach(logger => {
      logger.level = level;
    });
  }

  /**
   * Get all registered loggers
   */
  public static getAllLoggers(): Map<string, Logger> {
    return new Map(this.loggers);
  }

  /**
   * Clean up all loggers
   */
  public static cleanup(): void {
    this.loggers.forEach(logger => {
      logger.close();
    });
    this.loggers.clear();
  }

  /**
   * Create a structured log entry
   */
  public static createLogEntry(
    level: string,
    message: string,
    metadata: Record<string, any> = {}
  ): any {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...metadata
    };
  }
}

/**
 * Logger mixin for agents
 */
export function withLogger<T extends new (...args: any[]) => {}>(
  constructor: T,
  agentName: string
) {
  return class extends constructor {
    protected logger: Logger;

    constructor(...args: any[]) {
      super(...args);
      this.logger = AgentLogger.createLogger(
        (this as any).id || 'unknown',
        agentName
      );
    }
  };
}