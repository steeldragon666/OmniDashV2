/**
 * Agent Controller
 * Handles HTTP requests for agent management and operations
 */

import { Request, Response } from 'express';
import { agentRegistry } from '../agents/core/AgentRegistry';
import { ContentCreatorAgent } from '../agents/implementations/content/ContentCreatorAgent';
import { PostSchedulerAgent } from '../agents/implementations/social/PostSchedulerAgent';
import { ABNLookupAgent } from '../agents/implementations/business/ABNLookupAgent';
import { WorkflowCoordinatorAgent } from '../agents/implementations/workflow/WorkflowCoordinatorAgent';
import { N8NIntegrationAgent } from '../agents/implementations/integration/N8NIntegrationAgent';
import {
  AgentConfig,
  AgentTask,
  AgentStatus,
  AgentPriority,
  TaskStatus
} from '../agents/types/AgentTypes';
import { v4 as uuidv4 } from 'uuid';

export class AgentController {
  
  // =====================================
  // Agent Registry Management
  // =====================================

  /**
   * Get all registered agents
   */
  public static async getAllAgents(req: Request, res: Response): Promise<void> {
    try {
      const agents = agentRegistry.discoverAgents();
      
      res.json({
        success: true,
        data: agents,
        count: agents.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve agents',
        details: error.message
      });
    }
  }

  /**
   * Get agent by ID
   */
  public static async getAgent(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const agent = agentRegistry.getAgent(agentId);
      
      if (!agent) {
        res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
        return;
      }

      const health = await agent.getHealth();
      const metrics = await agent.getMetrics();

      res.json({
        success: true,
        data: {
          id: agent.id,
          name: agent.name,
          version: agent.version,
          status: agent.status,
          capabilities: agent.capabilities,
          config: agent.config,
          health,
          metrics
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve agent',
        details: error.message
      });
    }
  }

  /**
   * Create and register a new agent
   */
  public static async createAgent(req: Request, res: Response): Promise<void> {
    try {
      const { type, config } = req.body;

      if (!type || !config) {
        res.status(400).json({
          success: false,
          error: 'Agent type and config are required'
        });
        return;
      }

      const agentConfig: AgentConfig = {
        id: uuidv4(),
        ...config
      };

      let agent;
      
      switch (type) {
        case 'content-creator':
          agent = new ContentCreatorAgent(agentConfig);
          break;
        case 'post-scheduler':
          agent = new PostSchedulerAgent(agentConfig);
          break;
        case 'abn-lookup':
          agent = new ABNLookupAgent(agentConfig);
          break;
        case 'workflow-coordinator':
          agent = new WorkflowCoordinatorAgent(agentConfig);
          break;
        case 'n8n-integration':
          agent = new N8NIntegrationAgent(agentConfig);
          break;
        default:
          res.status(400).json({
            success: false,
            error: `Unsupported agent type: ${type}`
          });
          return;
      }

      await agentRegistry.registerAgent(agent);
      await agent.start();

      res.status(201).json({
        success: true,
        data: {
          id: agent.id,
          name: agent.name,
          type,
          status: agent.status
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create agent',
        details: error.message
      });
    }
  }

  /**
   * Update agent configuration
   */
  public static async updateAgent(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const { config } = req.body;

      if (!config) {
        res.status(400).json({
          success: false,
          error: 'Agent config is required'
        });
        return;
      }

      await agentRegistry.updateAgentConfig(agentId, config);

      res.json({
        success: true,
        message: 'Agent updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update agent',
        details: error.message
      });
    }
  }

  /**
   * Delete (unregister) an agent
   */
  public static async deleteAgent(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      
      await agentRegistry.unregisterAgent(agentId);

      res.json({
        success: true,
        message: 'Agent deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete agent',
        details: error.message
      });
    }
  }

  // =====================================
  // Agent Control Operations
  // =====================================

  /**
   * Start an agent
   */
  public static async startAgent(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      
      await agentRegistry.startAgent(agentId);

      res.json({
        success: true,
        message: 'Agent started successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to start agent',
        details: error.message
      });
    }
  }

  /**
   * Stop an agent
   */
  public static async stopAgent(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      
      await agentRegistry.stopAgent(agentId);

      res.json({
        success: true,
        message: 'Agent stopped successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to stop agent',
        details: error.message
      });
    }
  }

  /**
   * Restart an agent
   */
  public static async restartAgent(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      
      await agentRegistry.restartAgent(agentId);

      res.json({
        success: true,
        message: 'Agent restarted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to restart agent',
        details: error.message
      });
    }
  }

  // =====================================
  // Task Management
  // =====================================

  /**
   * Execute a task on an agent
   */
  public static async executeTask(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const { type, payload, priority = 'medium', context } = req.body;

      const agent = agentRegistry.getAgent(agentId);
      if (!agent) {
        res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
        return;
      }

      const task: AgentTask = {
        id: uuidv4(),
        agentId,
        type,
        status: TaskStatus.PENDING,
        priority: AgentController.mapPriority(priority),
        payload,
        context: {
          correlationId: uuidv4(),
          requestId: uuidv4(),
          source: 'http-api',
          environment: process.env.NODE_ENV || 'development',
          customData: context || {},
          ...context
        },
        metadata: {
          tags: [],
          labels: {},
          estimatedDuration: req.body.estimatedDuration
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        maxRetries: req.body.maxRetries || 3
      };

      // Check if agent can handle this task
      if (!agent.canHandleTask(task)) {
        res.status(400).json({
          success: false,
          error: `Agent ${agent.name} cannot handle task type: ${type}`
        });
        return;
      }

      const result = await agent.processTask(task);

      res.json({
        success: true,
        data: {
          taskId: task.id,
          result,
          executedAt: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to execute task',
        details: error.message
      });
    }
  }

  // =====================================
  // Health and Monitoring
  // =====================================

  /**
   * Get system health of all agents
   */
  public static async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await agentRegistry.getSystemHealth();
      
      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system health',
        details: error.message
      });
    }
  }

  /**
   * Get system metrics for all agents
   */
  public static async getSystemMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await agentRegistry.getSystemMetrics();
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system metrics',
        details: error.message
      });
    }
  }

  /**
   * Get agent health
   */
  public static async getAgentHealth(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const agent = agentRegistry.getAgent(agentId);
      
      if (!agent) {
        res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
        return;
      }

      const health = await agent.getHealth();
      
      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve agent health',
        details: error.message
      });
    }
  }

  /**
   * Get agent metrics
   */
  public static async getAgentMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const agent = agentRegistry.getAgent(agentId);
      
      if (!agent) {
        res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
        return;
      }

      const metrics = await agent.getMetrics();
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve agent metrics',
        details: error.message
      });
    }
  }

  // =====================================
  // Agent Discovery and Search
  // =====================================

  /**
   * Find agents by criteria
   */
  public static async findAgents(req: Request, res: Response): Promise<void> {
    try {
      const { 
        name, 
        status, 
        tags, 
        capabilities, 
        enabled 
      } = req.query;

      const criteria: any = {};
      
      if (name) criteria.name = name as string;
      if (status) criteria.status = status as AgentStatus;
      if (tags) criteria.tags = Array.isArray(tags) ? tags as string[] : [tags as string];
      if (capabilities) criteria.capabilities = Array.isArray(capabilities) ? capabilities as string[] : [capabilities as string];
      if (enabled !== undefined) criteria.enabled = enabled === 'true';

      const agents = agentRegistry.findAgents(criteria);
      const agentData = agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        version: agent.version,
        status: agent.status,
        capabilities: agent.capabilities.map(cap => cap.name),
        tags: agent.config.tags,
        enabled: agent.config.enabled
      }));

      res.json({
        success: true,
        data: agentData,
        count: agentData.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to find agents',
        details: error.message
      });
    }
  }

  /**
   * Get agents by capability
   */
  public static async getAgentsByCapability(req: Request, res: Response): Promise<void> {
    try {
      const { capability } = req.params;
      
      const agents = agentRegistry.getAgentsByCapability(capability);
      const agentData = agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        status: agent.status,
        capabilities: agent.capabilities.filter(cap => cap.name === capability)
      }));

      res.json({
        success: true,
        data: agentData,
        count: agentData.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve agents by capability',
        details: error.message
      });
    }
  }

  // =====================================
  // Content Creator Agent Endpoints
  // =====================================

  /**
   * Generate content using ContentCreatorAgent
   */
  public static async generateContent(req: Request, res: Response): Promise<void> {
    try {
      const contentAgents = agentRegistry.getAgentsByCapability('content-generation');
      if (contentAgents.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No content creation agents available'
        });
        return;
      }

      const agent = contentAgents[0];
      const task: AgentTask = {
        id: uuidv4(),
        agentId: agent.id,
        type: 'generate-content',
        status: TaskStatus.PENDING,
        priority: AgentPriority.MEDIUM,
        payload: req.body,
        context: {
          correlationId: uuidv4(),
          requestId: uuidv4(),
          source: 'content-api',
          environment: process.env.NODE_ENV || 'development',
          customData: {}
        },
        metadata: { tags: [], labels: {} },
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        maxRetries: 3
      };

      const result = await agent.processTask(task);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to generate content',
        details: error.message
      });
    }
  }

  // =====================================
  // Post Scheduler Agent Endpoints
  // =====================================

  /**
   * Schedule a social media post
   */
  public static async schedulePost(req: Request, res: Response): Promise<void> {
    try {
      const schedulerAgents = agentRegistry.getAgentsByCapability('social-media-publishing');
      if (schedulerAgents.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No post scheduler agents available'
        });
        return;
      }

      const agent = schedulerAgents[0];
      const task: AgentTask = {
        id: uuidv4(),
        agentId: agent.id,
        type: 'schedule-post',
        status: TaskStatus.PENDING,
        priority: AgentPriority.MEDIUM,
        payload: req.body,
        context: {
          correlationId: uuidv4(),
          requestId: uuidv4(),
          source: 'social-api',
          environment: process.env.NODE_ENV || 'development',
          customData: {}
        },
        metadata: { tags: [], labels: {} },
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        maxRetries: 3
      };

      const result = await agent.processTask(task);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to schedule post',
        details: error.message
      });
    }
  }

  // =====================================
  // ABN Lookup Agent Endpoints
  // =====================================

  /**
   * Lookup business by ABN
   */
  public static async lookupABN(req: Request, res: Response): Promise<void> {
    try {
      const { abn } = req.params;
      
      const abnAgents = agentRegistry.getAgentsByCapability('abn-lookup');
      if (abnAgents.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No ABN lookup agents available'
        });
        return;
      }

      const agent = abnAgents[0];
      const task: AgentTask = {
        id: uuidv4(),
        agentId: agent.id,
        type: 'lookup-abn',
        status: TaskStatus.PENDING,
        priority: AgentPriority.MEDIUM,
        payload: { abn },
        context: {
          correlationId: uuidv4(),
          requestId: uuidv4(),
          source: 'business-api',
          environment: process.env.NODE_ENV || 'development',
          customData: {}
        },
        metadata: { tags: [], labels: {} },
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        maxRetries: 3
      };

      const result = await agent.processTask(task);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to lookup ABN',
        details: error.message
      });
    }
  }

  // =====================================
  // Workflow Coordinator Agent Endpoints
  // =====================================

  /**
   * Execute a workflow
   */
  public static async executeWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const workflowAgents = agentRegistry.getAgentsByCapability('workflow-execution');
      if (workflowAgents.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No workflow coordinator agents available'
        });
        return;
      }

      const agent = workflowAgents[0];
      const task: AgentTask = {
        id: uuidv4(),
        agentId: agent.id,
        type: 'execute-workflow',
        status: TaskStatus.PENDING,
        priority: AgentPriority.MEDIUM,
        payload: req.body,
        context: {
          correlationId: uuidv4(),
          requestId: uuidv4(),
          source: 'workflow-api',
          environment: process.env.NODE_ENV || 'development',
          customData: {}
        },
        metadata: { tags: [], labels: {} },
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        maxRetries: 3
      };

      const result = await agent.processTask(task);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to execute workflow',
        details: error.message
      });
    }
  }

  // =====================================
  // Helper Methods
  // =====================================

  private static mapPriority(priority: string): AgentPriority {
    switch (priority.toLowerCase()) {
      case 'low': return AgentPriority.LOW;
      case 'medium': return AgentPriority.MEDIUM;
      case 'high': return AgentPriority.HIGH;
      case 'critical': return AgentPriority.CRITICAL;
      default: return AgentPriority.MEDIUM;
    }
  }
}