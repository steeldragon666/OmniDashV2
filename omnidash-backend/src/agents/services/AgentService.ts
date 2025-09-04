/**
 * Agent Service
 * Service for initializing and managing the agent system
 */

import { agentRegistry } from '../core/AgentRegistry';
import { ContentCreatorAgent } from '../implementations/content/ContentCreatorAgent';
import { PostSchedulerAgent } from '../implementations/social/PostSchedulerAgent';
import { ABNLookupAgent } from '../implementations/business/ABNLookupAgent';
import { WorkflowCoordinatorAgent } from '../implementations/workflow/WorkflowCoordinatorAgent';
import { N8NIntegrationAgent } from '../implementations/integration/N8NIntegrationAgent';
import { AgentConfig, AgentPriority } from '../types/AgentTypes';
import { Logger } from 'winston';
import { AgentLogger } from '../utils/AgentLogger';

export class AgentService {
  private logger: Logger;
  private initialized: boolean = false;

  constructor() {
    this.logger = AgentLogger.createLogger('agent-service', 'AgentService');
  }

  /**
   * Initialize the agent system
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Agent service already initialized');
      return;
    }

    try {
      this.logger.info('Initializing Agent Service...');

      // Initialize default agents based on environment configuration
      await this.initializeDefaultAgents();

      // Set up event listeners
      this.setupEventListeners();

      this.initialized = true;
      this.logger.info('Agent Service initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Agent Service:', error);
      throw error;
    }
  }

  /**
   * Start all registered agents
   */
  public async startAll(): Promise<void> {
    try {
      this.logger.info('Starting all agents...');
      await agentRegistry.startAllAgents();
      this.logger.info('All agents started successfully');
    } catch (error) {
      this.logger.error('Failed to start all agents:', error);
      throw error;
    }
  }

  /**
   * Stop all registered agents
   */
  public async stopAll(): Promise<void> {
    try {
      this.logger.info('Stopping all agents...');
      await agentRegistry.stopAllAgents();
      this.logger.info('All agents stopped successfully');
    } catch (error) {
      this.logger.error('Failed to stop all agents:', error);
      throw error;
    }
  }

  /**
   * Gracefully shutdown the agent system
   */
  public async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down Agent Service...');
      
      await this.stopAll();
      await agentRegistry.cleanup();
      
      // Cleanup loggers
      AgentLogger.cleanup();
      
      this.initialized = false;
      this.logger.info('Agent Service shutdown completed');
    } catch (error) {
      this.logger.error('Error during Agent Service shutdown:', error);
      throw error;
    }
  }

  /**
   * Get service status
   */
  public getStatus(): {
    initialized: boolean;
    agentCount: number;
    systemHealth: any;
  } {
    const agents = agentRegistry.getAllAgents();
    
    return {
      initialized: this.initialized,
      agentCount: agents.length,
      systemHealth: {
        running: agents.filter(a => a.isRunning).length,
        healthy: agents.filter(a => a.isHealthy).length,
        total: agents.length
      }
    };
  }

  /**
   * Initialize default agents based on configuration
   */
  private async initializeDefaultAgents(): Promise<void> {
    const agentConfigs = this.getDefaultAgentConfigs();
    
    for (const config of agentConfigs) {
      try {
        if (!config.enabled) {
          this.logger.info(`Skipping disabled agent: ${config.name}`);
          continue;
        }

        const agent = await this.createAgent(config.type, config.config);
        await agentRegistry.registerAgent(agent);
        
        this.logger.info(`Registered agent: ${config.name} (${config.type})`);
      } catch (error) {
        this.logger.error(`Failed to initialize agent ${config.name}:`, error);
        // Continue with other agents even if one fails
      }
    }
  }

  /**
   * Create an agent instance based on type and configuration
   */
  private async createAgent(type: string, config: AgentConfig): Promise<any> {
    switch (type) {
      case 'content-creator':
        return new ContentCreatorAgent(config);
      
      case 'post-scheduler':
        return new PostSchedulerAgent(config);
      
      case 'abn-lookup':
        return new ABNLookupAgent(config);
      
      case 'workflow-coordinator':
        return new WorkflowCoordinatorAgent(config);
      
      case 'n8n-integration':
        return new N8NIntegrationAgent(config);
      
      default:
        throw new Error(`Unknown agent type: ${type}`);
    }
  }

  /**
   * Get default agent configurations from environment and defaults
   */
  private getDefaultAgentConfigs(): Array<{
    type: string;
    enabled: boolean;
    name: string;
    config: AgentConfig;
  }> {
    const baseConfig = {
      version: '1.0.0',
      maxConcurrentTasks: 5,
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 30000,
      priority: AgentPriority.MEDIUM,
      dependencies: [],
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        logLevel: process.env.LOG_LEVEL || 'info',
        enableMetrics: process.env.ENABLE_METRICS === 'true',
        enableTracing: process.env.ENABLE_TRACING === 'true',
        customSettings: {}
      },
      rateLimiting: {
        enabled: false,
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        burstLimit: 10
      },
      monitoring: {
        enableHealthCheck: true,
        enablePerformanceMetrics: true,
        enableErrorTracking: true,
        healthCheckInterval: 30000,
        metricsRetentionDays: 7
      }
    };

    return [
      {
        type: 'content-creator',
        enabled: process.env.ENABLE_CONTENT_AGENT !== 'false',
        name: 'ContentCreatorAgent',
        config: {
          id: 'content-creator-default',
          name: 'Content Creator Agent',
          description: 'AI-powered content generation agent',
          enabled: true,
          tags: ['content', 'ai', 'generation'],
          capabilities: ['content-generation', 'content-analysis', 'content-optimization'],
          ...baseConfig
        }
      },
      {
        type: 'post-scheduler',
        enabled: process.env.ENABLE_SCHEDULER_AGENT !== 'false',
        name: 'PostSchedulerAgent',
        config: {
          id: 'post-scheduler-default',
          name: 'Post Scheduler Agent',
          description: 'Social media post scheduling and publishing agent',
          enabled: true,
          tags: ['social', 'scheduling', 'publishing'],
          capabilities: ['social-media-publishing', 'content-scheduling', 'social-analytics'],
          ...baseConfig
        }
      },
      {
        type: 'abn-lookup',
        enabled: process.env.ENABLE_ABN_AGENT !== 'false' && !!process.env.ABR_GUID,
        name: 'ABNLookupAgent',
        config: {
          id: 'abn-lookup-default',
          name: 'ABN Lookup Agent',
          description: 'Australian Business Register lookup agent',
          enabled: true,
          tags: ['business', 'lookup', 'australia'],
          capabilities: ['abn-lookup', 'acn-lookup', 'business-search', 'business-verification'],
          ...baseConfig
        }
      },
      {
        type: 'workflow-coordinator',
        enabled: process.env.ENABLE_WORKFLOW_AGENT !== 'false',
        name: 'WorkflowCoordinatorAgent',
        config: {
          id: 'workflow-coordinator-default',
          name: 'Workflow Coordinator Agent',
          description: 'Workflow orchestration and coordination agent',
          enabled: true,
          tags: ['workflow', 'orchestration', 'coordination'],
          capabilities: ['workflow-execution', 'workflow-orchestration', 'workflow-management'],
          ...baseConfig,
          maxConcurrentTasks: 10 // Workflows might need more concurrent capacity
        }
      },
      {
        type: 'n8n-integration',
        enabled: process.env.ENABLE_N8N_AGENT !== 'false' && !!process.env.N8N_BASE_URL,
        name: 'N8NIntegrationAgent',
        config: {
          id: 'n8n-integration-default',
          name: 'N8N Integration Agent',
          description: 'N8N workflow automation integration agent',
          enabled: true,
          tags: ['n8n', 'integration', 'automation'],
          capabilities: ['n8n-workflow-execution', 'n8n-workflow-management', 'n8n-execution-monitoring', 'n8n-webhook-integration'],
          ...baseConfig
        }
      }
    ];
  }

  /**
   * Set up event listeners for the agent system
   */
  private setupEventListeners(): void {
    // Listen for agent registry events
    agentRegistry.on('agent-registered', (event) => {
      this.logger.info(`Agent registered: ${event.agentName} (${event.agentId})`);
    });

    agentRegistry.on('agent-unregistered', (event) => {
      this.logger.info(`Agent unregistered: ${event.agentName} (${event.agentId})`);
    });

    agentRegistry.on('agent-heartbeat-timeout', (event) => {
      this.logger.warn(`Agent heartbeat timeout: ${event.agentName} (${event.agentId})`);
    });

    agentRegistry.on('agent-event', (event) => {
      // Log important agent events
      if (['agent.error', 'task.failed', 'workflow.failed'].includes(event.type)) {
        this.logger.error(`Agent event: ${event.type} from ${event.agentId}`, event.data);
      } else if (['agent.started', 'agent.stopped', 'workflow.completed'].includes(event.type)) {
        this.logger.info(`Agent event: ${event.type} from ${event.agentId}`, event.data);
      }
    });

    // Handle process signals for graceful shutdown
    process.on('SIGINT', this.handleShutdown.bind(this));
    process.on('SIGTERM', this.handleShutdown.bind(this));
    process.on('uncaughtException', this.handleError.bind(this));
    process.on('unhandledRejection', this.handleError.bind(this));
  }

  /**
   * Handle graceful shutdown
   */
  private async handleShutdown(signal: string): Promise<void> {
    this.logger.info(`Received ${signal}, shutting down gracefully...`);
    
    try {
      await this.shutdown();
      process.exit(0);
    } catch (error) {
      this.logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    this.logger.error('Unhandled error:', error);
    
    // Try to shutdown gracefully
    this.shutdown().catch(() => {
      process.exit(1);
    });
  }
}

// Export singleton instance
export const agentService = new AgentService();