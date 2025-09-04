/**
 * Agent Registry
 * Manages registration, discovery, and lifecycle of all agents in the system
 */

import { EventEmitter } from 'events';
import { Logger } from 'winston';
import {
  IAgent,
  AgentConfig,
  AgentStatus,
  AgentMetrics,
  AgentHealth,
  AgentEvent,
  AgentEventType,
  EventSeverity
} from '../types/AgentTypes';
import { AgentLogger } from '../utils/AgentLogger';

export interface AgentRegistration {
  agent: IAgent;
  config: AgentConfig;
  registeredAt: Date;
  lastHeartbeat: Date;
  status: AgentStatus;
  metadata: Record<string, any>;
}

export interface AgentDiscovery {
  id: string;
  name: string;
  version: string;
  capabilities: string[];
  tags: string[];
  status: AgentStatus;
  endpoint?: string;
}

/**
 * Central registry for managing all agents in the system
 */
export class AgentRegistry extends EventEmitter {
  private agents: Map<string, AgentRegistration> = new Map();
  private agentsByType: Map<string, Set<string>> = new Map();
  private agentsByTag: Map<string, Set<string>> = new Map();
  private agentsByCapability: Map<string, Set<string>> = new Map();
  private logger: Logger;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.logger = AgentLogger.createLogger('agent-registry', 'AgentRegistry');
    this.setupPeriodicTasks();
  }

  // =====================================
  // Agent Registration & Management
  // =====================================

  /**
   * Register a new agent in the system
   */
  public async registerAgent(agent: IAgent, metadata?: Record<string, any>): Promise<void> {
    try {
      const existingAgent = this.agents.get(agent.id);
      if (existingAgent) {
        throw new Error(`Agent with ID ${agent.id} is already registered`);
      }

      // Create registration record
      const registration: AgentRegistration = {
        agent,
        config: agent.config,
        registeredAt: new Date(),
        lastHeartbeat: new Date(),
        status: agent.status,
        metadata: metadata || {}
      };

      // Store agent
      this.agents.set(agent.id, registration);

      // Index by various attributes
      this.indexAgent(agent);

      // Setup agent event listeners
      this.setupAgentEventListeners(agent);

      // Initialize the agent if not already initialized
      if (agent.status === AgentStatus.IDLE) {
        await agent.initialize();
      }

      this.logger.info(`Agent registered: ${agent.name} (${agent.id})`);

      // Emit registration event
      this.emit('agent-registered', {
        agentId: agent.id,
        agentName: agent.name,
        timestamp: new Date()
      });

    } catch (error) {
      this.logger.error(`Failed to register agent ${agent.id}:`, error);
      throw error;
    }
  }

  /**
   * Unregister an agent from the system
   */
  public async unregisterAgent(agentId: string): Promise<void> {
    try {
      const registration = this.agents.get(agentId);
      if (!registration) {
        throw new Error(`Agent ${agentId} is not registered`);
      }

      const agent = registration.agent;

      // Stop the agent if running
      if (agent.isRunning) {
        await agent.stop();
      }

      // Clean up agent
      await agent.shutdown();

      // Remove from indexes
      this.removeAgentFromIndexes(agent);

      // Remove from registry
      this.agents.delete(agentId);

      this.logger.info(`Agent unregistered: ${agent.name} (${agentId})`);

      // Emit unregistration event
      this.emit('agent-unregistered', {
        agentId,
        agentName: agent.name,
        timestamp: new Date()
      });

    } catch (error) {
      this.logger.error(`Failed to unregister agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Get an agent by ID
   */
  public getAgent(agentId: string): IAgent | null {
    const registration = this.agents.get(agentId);
    return registration ? registration.agent : null;
  }

  /**
   * Get all registered agents
   */
  public getAllAgents(): IAgent[] {
    return Array.from(this.agents.values()).map(reg => reg.agent);
  }

  /**
   * Get agents by type
   */
  public getAgentsByType(type: string): IAgent[] {
    const agentIds = this.agentsByType.get(type) || new Set();
    return Array.from(agentIds).map(id => this.getAgent(id)!).filter(Boolean);
  }

  /**
   * Get agents by tag
   */
  public getAgentsByTag(tag: string): IAgent[] {
    const agentIds = this.agentsByTag.get(tag) || new Set();
    return Array.from(agentIds).map(id => this.getAgent(id)!).filter(Boolean);
  }

  /**
   * Get agents by capability
   */
  public getAgentsByCapability(capability: string): IAgent[] {
    const agentIds = this.agentsByCapability.get(capability) || new Set();
    return Array.from(agentIds).map(id => this.getAgent(id)!).filter(Boolean);
  }

  /**
   * Find agents matching criteria
   */
  public findAgents(criteria: {
    name?: string;
    type?: string;
    status?: AgentStatus;
    tags?: string[];
    capabilities?: string[];
    enabled?: boolean;
  }): IAgent[] {
    const agents = this.getAllAgents();
    
    return agents.filter(agent => {
      // Name filter
      if (criteria.name && !agent.name.includes(criteria.name)) {
        return false;
      }

      // Status filter
      if (criteria.status && agent.status !== criteria.status) {
        return false;
      }

      // Enabled filter
      if (criteria.enabled !== undefined && agent.config.enabled !== criteria.enabled) {
        return false;
      }

      // Tags filter
      if (criteria.tags && criteria.tags.length > 0) {
        const hasAllTags = criteria.tags.every(tag => agent.config.tags.includes(tag));
        if (!hasAllTags) return false;
      }

      // Capabilities filter
      if (criteria.capabilities && criteria.capabilities.length > 0) {
        const agentCapabilityNames = agent.capabilities.map(cap => cap.name);
        const hasAllCapabilities = criteria.capabilities.every(cap => 
          agentCapabilityNames.includes(cap)
        );
        if (!hasAllCapabilities) return false;
      }

      return true;
    });
  }

  // =====================================
  // Agent Discovery
  // =====================================

  /**
   * Discover available agents
   */
  public discoverAgents(): AgentDiscovery[] {
    return Array.from(this.agents.values()).map(registration => ({
      id: registration.agent.id,
      name: registration.agent.name,
      version: registration.agent.version,
      capabilities: registration.agent.capabilities.map(cap => cap.name),
      tags: registration.config.tags,
      status: registration.status
    }));
  }

  // =====================================
  // Agent Lifecycle Management
  // =====================================

  /**
   * Start all registered agents
   */
  public async startAllAgents(): Promise<void> {
    const agents = this.getAllAgents();
    const startPromises = agents.map(agent => this.startAgent(agent.id));
    
    try {
      await Promise.all(startPromises);
      this.logger.info(`Started ${agents.length} agents`);
    } catch (error) {
      this.logger.error('Failed to start all agents:', error);
      throw error;
    }
  }

  /**
   * Stop all registered agents
   */
  public async stopAllAgents(): Promise<void> {
    const agents = this.getAllAgents();
    const stopPromises = agents.map(agent => this.stopAgent(agent.id));
    
    try {
      await Promise.all(stopPromises);
      this.logger.info(`Stopped ${agents.length} agents`);
    } catch (error) {
      this.logger.error('Failed to stop all agents:', error);
      throw error;
    }
  }

  /**
   * Start a specific agent
   */
  public async startAgent(agentId: string): Promise<void> {
    const registration = this.agents.get(agentId);
    if (!registration) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    try {
      await registration.agent.start();
      registration.status = AgentStatus.RUNNING;
      registration.lastHeartbeat = new Date();
      
      this.logger.info(`Started agent: ${registration.agent.name}`);
    } catch (error) {
      this.logger.error(`Failed to start agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Stop a specific agent
   */
  public async stopAgent(agentId: string): Promise<void> {
    const registration = this.agents.get(agentId);
    if (!registration) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    try {
      await registration.agent.stop();
      registration.status = AgentStatus.STOPPED;
      
      this.logger.info(`Stopped agent: ${registration.agent.name}`);
    } catch (error) {
      this.logger.error(`Failed to stop agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Restart a specific agent
   */
  public async restartAgent(agentId: string): Promise<void> {
    await this.stopAgent(agentId);
    await this.startAgent(agentId);
  }

  // =====================================
  // Health & Monitoring
  // =====================================

  /**
   * Get health status of all agents
   */
  public async getSystemHealth(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    agents: Array<{
      id: string;
      name: string;
      health: AgentHealth;
    }>;
    summary: {
      total: number;
      healthy: number;
      degraded: number;
      unhealthy: number;
    };
  }> {
    const agents = this.getAllAgents();
    const healthChecks = await Promise.all(
      agents.map(async agent => ({
        id: agent.id,
        name: agent.name,
        health: await agent.getHealth()
      }))
    );

    const summary = {
      total: agents.length,
      healthy: healthChecks.filter(h => h.health.status === 'healthy').length,
      degraded: healthChecks.filter(h => h.health.status === 'degraded').length,
      unhealthy: healthChecks.filter(h => h.health.status === 'unhealthy').length
    };

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (summary.unhealthy > 0) {
      overall = 'unhealthy';
    } else if (summary.degraded > 0) {
      overall = 'degraded';
    }

    return {
      overall,
      agents: healthChecks,
      summary
    };
  }

  /**
   * Get metrics for all agents
   */
  public async getSystemMetrics(): Promise<{
    timestamp: Date;
    agents: Array<{
      id: string;
      name: string;
      metrics: AgentMetrics;
    }>;
    aggregated: {
      totalTasksProcessed: number;
      totalTasksSuccessful: number;
      totalTasksFailed: number;
      averageErrorRate: number;
      totalThroughput: number;
    };
  }> {
    const agents = this.getAllAgents();
    const metricsData = await Promise.all(
      agents.map(async agent => ({
        id: agent.id,
        name: agent.name,
        metrics: await agent.getMetrics()
      }))
    );

    // Calculate aggregated metrics
    const aggregated = metricsData.reduce((acc, { metrics }) => ({
      totalTasksProcessed: acc.totalTasksProcessed + metrics.tasksProcessed,
      totalTasksSuccessful: acc.totalTasksSuccessful + metrics.tasksSuccessful,
      totalTasksFailed: acc.totalTasksFailed + metrics.tasksFailed,
      averageErrorRate: acc.averageErrorRate + metrics.errorRate,
      totalThroughput: acc.totalThroughput + metrics.throughput
    }), {
      totalTasksProcessed: 0,
      totalTasksSuccessful: 0,
      totalTasksFailed: 0,
      averageErrorRate: 0,
      totalThroughput: 0
    });

    // Average the error rate
    aggregated.averageErrorRate = metricsData.length > 0 ? 
      aggregated.averageErrorRate / metricsData.length : 0;

    return {
      timestamp: new Date(),
      agents: metricsData,
      aggregated
    };
  }

  // =====================================
  // Configuration Management
  // =====================================

  /**
   * Update agent configuration
   */
  public async updateAgentConfig(agentId: string, config: Partial<AgentConfig>): Promise<void> {
    const registration = this.agents.get(agentId);
    if (!registration) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    try {
      await registration.agent.updateConfig(config);
      registration.config = { ...registration.config, ...config };
      
      // Update indexes if necessary
      if (config.tags || config.capabilities) {
        this.removeAgentFromIndexes(registration.agent);
        this.indexAgent(registration.agent);
      }

      this.logger.info(`Updated configuration for agent: ${registration.agent.name}`);
    } catch (error) {
      this.logger.error(`Failed to update agent ${agentId} configuration:`, error);
      throw error;
    }
  }

  // =====================================
  // Event Handling
  // =====================================

  /**
   * Set up event listeners for an agent
   */
  private setupAgentEventListeners(agent: IAgent): void {
    agent.on('agent-event', (event: AgentEvent) => {
      this.handleAgentEvent(event);
    });

    agent.on('error', (error: Error) => {
      this.logger.error(`Agent ${agent.name} error:`, error);
      const registration = this.agents.get(agent.id);
      if (registration) {
        registration.status = AgentStatus.ERROR;
      }
    });
  }

  /**
   * Handle agent events
   */
  private handleAgentEvent(event: AgentEvent): void {
    // Update agent status based on events
    const registration = this.agents.get(event.agentId);
    if (registration) {
      switch (event.type) {
        case AgentEventType.AGENT_STARTED:
          registration.status = AgentStatus.RUNNING;
          registration.lastHeartbeat = new Date();
          break;
        case AgentEventType.AGENT_STOPPED:
          registration.status = AgentStatus.STOPPED;
          break;
        case AgentEventType.AGENT_PAUSED:
          registration.status = AgentStatus.PAUSED;
          break;
        case AgentEventType.AGENT_ERROR:
          registration.status = AgentStatus.ERROR;
          break;
        case AgentEventType.AGENT_HEALTH_CHECK:
          registration.lastHeartbeat = new Date();
          break;
      }
    }

    // Forward event to registry listeners
    this.emit('agent-event', event);
  }

  // =====================================
  // Private Methods
  // =====================================

  /**
   * Index agent for fast lookups
   */
  private indexAgent(agent: IAgent): void {
    // Index by tags
    agent.config.tags.forEach(tag => {
      if (!this.agentsByTag.has(tag)) {
        this.agentsByTag.set(tag, new Set());
      }
      this.agentsByTag.get(tag)!.add(agent.id);
    });

    // Index by capabilities
    agent.capabilities.forEach(capability => {
      if (!this.agentsByCapability.has(capability.name)) {
        this.agentsByCapability.set(capability.name, new Set());
      }
      this.agentsByCapability.get(capability.name)!.add(agent.id);
    });
  }

  /**
   * Remove agent from all indexes
   */
  private removeAgentFromIndexes(agent: IAgent): void {
    // Remove from tag index
    agent.config.tags.forEach(tag => {
      const tagSet = this.agentsByTag.get(tag);
      if (tagSet) {
        tagSet.delete(agent.id);
        if (tagSet.size === 0) {
          this.agentsByTag.delete(tag);
        }
      }
    });

    // Remove from capability index
    agent.capabilities.forEach(capability => {
      const capabilitySet = this.agentsByCapability.get(capability.name);
      if (capabilitySet) {
        capabilitySet.delete(agent.id);
        if (capabilitySet.size === 0) {
          this.agentsByCapability.delete(capability.name);
        }
      }
    });
  }

  /**
   * Set up periodic tasks
   */
  private setupPeriodicTasks(): void {
    // Heartbeat monitoring
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, 60000); // Check every minute

    // Health checks
    this.healthCheckInterval = setInterval(async () => {
      await this.performPeriodicHealthChecks();
    }, 300000); // Check every 5 minutes
  }

  /**
   * Check agent heartbeats
   */
  private checkHeartbeats(): void {
    const now = new Date();
    const heartbeatTimeout = 180000; // 3 minutes

    for (const [agentId, registration] of this.agents) {
      const timeSinceHeartbeat = now.getTime() - registration.lastHeartbeat.getTime();
      
      if (timeSinceHeartbeat > heartbeatTimeout) {
        this.logger.warn(`Agent ${registration.agent.name} heartbeat timeout`);
        registration.status = AgentStatus.ERROR;
        
        this.emit('agent-heartbeat-timeout', {
          agentId,
          agentName: registration.agent.name,
          lastHeartbeat: registration.lastHeartbeat
        });
      }
    }
  }

  /**
   * Perform periodic health checks
   */
  private async performPeriodicHealthChecks(): Promise<void> {
    const agents = this.getAllAgents();
    
    for (const agent of agents) {
      try {
        const isHealthy = await agent.performHealthCheck();
        if (!isHealthy) {
          this.logger.warn(`Agent ${agent.name} health check failed`);
        }
      } catch (error) {
        this.logger.error(`Health check error for agent ${agent.name}:`, error);
      }
    }
  }

  /**
   * Cleanup registry
   */
  public async cleanup(): Promise<void> {
    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Stop and unregister all agents
    const agentIds = Array.from(this.agents.keys());
    for (const agentId of agentIds) {
      try {
        await this.unregisterAgent(agentId);
      } catch (error) {
        this.logger.error(`Error unregistering agent ${agentId}:`, error);
      }
    }

    // Clear data structures
    this.agents.clear();
    this.agentsByType.clear();
    this.agentsByTag.clear();
    this.agentsByCapability.clear();

    this.removeAllListeners();
  }
}

// Export singleton instance
export const agentRegistry = new AgentRegistry();