/**
 * Agent Registry - Central management system for all agents
 * Handles registration, discovery, lifecycle management, and health monitoring
 */

import {
  IAgent,
  IAgentRegistry,
  AgentCategory,
  AgentMetadata,
  AgentEvent
} from './AgentInterface';
import { EventEmitter } from 'events';

export class AgentRegistry extends EventEmitter implements IAgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, IAgent> = new Map();
  private agentsByCategory: Map<AgentCategory, Set<string>> = new Map();
  private agentsByCapability: Map<string, Set<string>> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  private constructor() {
    super();
    this.initializeCategories();
  }

  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  private initializeCategories(): void {
    const categories: AgentCategory[] = [
      'content', 'social', 'analytics', 'business', 
      'orchestration', 'integration', 'utility'
    ];
    
    categories.forEach(category => {
      this.agentsByCategory.set(category, new Set());
    });
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Start health check monitoring
    this.startHealthCheckMonitoring();
    
    this.isInitialized = true;
    this.emit('registryInitialized');
    console.log('Agent Registry initialized');
  }

  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Stop all agents
    await this.stopAllAgents();
    
    this.isInitialized = false;
    this.emit('registryShutdown');
    console.log('Agent Registry shutdown');
  }

  public async register(agent: IAgent): Promise<void> {
    try {
      const agentId = agent.metadata.id;
      
      if (this.agents.has(agentId)) {
        throw new Error(`Agent with ID '${agentId}' is already registered`);
      }

      // Validate agent metadata
      this.validateAgentMetadata(agent.metadata);

      // Register the agent
      this.agents.set(agentId, agent);
      
      // Index by category
      const categoryAgents = this.agentsByCategory.get(agent.metadata.category);
      if (categoryAgents) {
        categoryAgents.add(agentId);
      }

      // Index by capabilities
      agent.metadata.capabilities.forEach(capability => {
        if (!this.agentsByCapability.has(capability.name)) {
          this.agentsByCapability.set(capability.name, new Set());
        }
        this.agentsByCapability.get(capability.name)!.add(agentId);
      });

      // Set up event forwarding from agent to registry
      this.setupAgentEventForwarding(agent);

      // Initialize the agent if registry is initialized
      if (this.isInitialized) {
        await agent.initialize();
      }

      this.emit('agentRegistered', { 
        agentId, 
        category: agent.metadata.category,
        capabilities: agent.metadata.capabilities.map(c => c.name)
      });

      console.log(`Agent registered: ${agentId} (${agent.metadata.category})`);

    } catch (error) {
      console.error(`Failed to register agent ${agent.metadata.id}:`, error);
      throw error;
    }
  }

  public async unregister(agentId: string): Promise<void> {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        throw new Error(`Agent '${agentId}' is not registered`);
      }

      // Stop the agent
      await agent.stop();

      // Remove from main registry
      this.agents.delete(agentId);

      // Remove from category index
      const categoryAgents = this.agentsByCategory.get(agent.metadata.category);
      if (categoryAgents) {
        categoryAgents.delete(agentId);
      }

      // Remove from capability index
      agent.metadata.capabilities.forEach(capability => {
        const capabilityAgents = this.agentsByCapability.get(capability.name);
        if (capabilityAgents) {
          capabilityAgents.delete(agentId);
          if (capabilityAgents.size === 0) {
            this.agentsByCapability.delete(capability.name);
          }
        }
      });

      // Remove event listeners
      agent.removeAllListeners();

      this.emit('agentUnregistered', { 
        agentId, 
        category: agent.metadata.category 
      });

      console.log(`Agent unregistered: ${agentId}`);

    } catch (error) {
      console.error(`Failed to unregister agent ${agentId}:`, error);
      throw error;
    }
  }

  public get(agentId: string): IAgent | undefined {
    return this.agents.get(agentId);
  }

  public getByCategory(category: AgentCategory): IAgent[] {
    const agentIds = this.agentsByCategory.get(category);
    if (!agentIds) {
      return [];
    }

    return Array.from(agentIds)
      .map(id => this.agents.get(id))
      .filter((agent): agent is IAgent => agent !== undefined);
  }

  public getByCapability(capability: string): IAgent[] {
    const agentIds = this.agentsByCapability.get(capability);
    if (!agentIds) {
      return [];
    }

    return Array.from(agentIds)
      .map(id => this.agents.get(id))
      .filter((agent): agent is IAgent => agent !== undefined);
  }

  public list(): IAgent[] {
    return Array.from(this.agents.values());
  }

  public find(predicate: (agent: IAgent) => boolean): IAgent[] {
    return Array.from(this.agents.values()).filter(predicate);
  }

  public async healthCheck(): Promise<Record<string, boolean>> {
    const healthResults: Record<string, boolean> = {};
    
    const healthPromises = Array.from(this.agents.entries()).map(async ([agentId, agent]) => {
      try {
        const isHealthy = await agent.healthCheck();
        healthResults[agentId] = isHealthy;
        return { agentId, isHealthy };
      } catch (error) {
        console.error(`Health check failed for agent ${agentId}:`, error);
        healthResults[agentId] = false;
        return { agentId, isHealthy: false };
      }
    });

    const results = await Promise.allSettled(healthPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const agentId = Array.from(this.agents.keys())[index];
        healthResults[agentId] = false;
        console.error(`Health check promise rejected for agent ${agentId}:`, result.reason);
      }
    });

    return healthResults;
  }

  public getRegistryStats(): {
    totalAgents: number;
    agentsByCategory: Record<string, number>;
    agentsByStatus: Record<string, number>;
    healthyAgents: number;
    availableCapabilities: string[];
  } {
    const agents = Array.from(this.agents.values());
    
    // Count by category
    const agentsByCategory: Record<string, number> = {};
    Object.values(this.agentsByCategory).forEach((agentSet, index) => {
      const categories = Array.from(this.agentsByCategory.keys());
      agentsByCategory[categories[index]] = agentSet.size;
    });

    // Count by status
    const agentsByStatus: Record<string, number> = {};
    agents.forEach(agent => {
      const status = agent.state.status;
      agentsByStatus[status] = (agentsByStatus[status] || 0) + 1;
    });

    // Count healthy agents
    const healthyAgents = agents.filter(agent => 
      agent.state.status !== 'error' && agent.state.status !== 'cancelled'
    ).length;

    return {
      totalAgents: agents.length,
      agentsByCategory,
      agentsByStatus,
      healthyAgents,
      availableCapabilities: Array.from(this.agentsByCapability.keys())
    };
  }

  public async startAllAgents(): Promise<void> {
    const startPromises = Array.from(this.agents.values()).map(async agent => {
      try {
        if (agent.state.status === 'idle') {
          await agent.start();
        }
      } catch (error) {
        console.error(`Failed to start agent ${agent.metadata.id}:`, error);
      }
    });

    await Promise.allSettled(startPromises);
    this.emit('allAgentsStarted');
  }

  public async stopAllAgents(): Promise<void> {
    const stopPromises = Array.from(this.agents.values()).map(async agent => {
      try {
        if (agent.state.status === 'running' || agent.state.status === 'paused') {
          await agent.stop();
        }
      } catch (error) {
        console.error(`Failed to stop agent ${agent.metadata.id}:`, error);
      }
    });

    await Promise.allSettled(stopPromises);
    this.emit('allAgentsStopped');
  }

  public async restartAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent '${agentId}' is not registered`);
    }

    try {
      await agent.stop();
      await agent.start();
      this.emit('agentRestarted', { agentId });
    } catch (error) {
      console.error(`Failed to restart agent ${agentId}:`, error);
      throw error;
    }
  }

  public findBestAgentForTask(taskType: string, requirements?: {
    category?: AgentCategory;
    excludeAgents?: string[];
    preferredAgents?: string[];
  }): IAgent | null {
    let candidates = this.getByCapability(taskType);

    // Filter by category if specified
    if (requirements?.category) {
      candidates = candidates.filter(agent => agent.metadata.category === requirements.category);
    }

    // Exclude specific agents
    if (requirements?.excludeAgents) {
      candidates = candidates.filter(agent => !requirements.excludeAgents!.includes(agent.metadata.id));
    }

    // Filter out unhealthy agents
    candidates = candidates.filter(agent => 
      agent.state.status === 'idle' || agent.state.status === 'running'
    );

    // Prioritize preferred agents
    if (requirements?.preferredAgents && requirements.preferredAgents.length > 0) {
      const preferred = candidates.filter(agent => 
        requirements.preferredAgents!.includes(agent.metadata.id)
      );
      if (preferred.length > 0) {
        candidates = preferred;
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    // Simple load balancing - return agent with lowest current load
    // (you could implement more sophisticated algorithms here)
    return candidates.reduce((best, current) => {
      const bestLoad = this.getAgentLoad(best);
      const currentLoad = this.getAgentLoad(current);
      return currentLoad < bestLoad ? current : best;
    });
  }

  private validateAgentMetadata(metadata: AgentMetadata): void {
    if (!metadata.id || metadata.id.trim() === '') {
      throw new Error('Agent ID is required');
    }

    if (!metadata.name || metadata.name.trim() === '') {
      throw new Error('Agent name is required');
    }

    if (!metadata.category) {
      throw new Error('Agent category is required');
    }

    if (!this.agentsByCategory.has(metadata.category)) {
      throw new Error(`Invalid agent category: ${metadata.category}`);
    }

    if (!metadata.capabilities || metadata.capabilities.length === 0) {
      throw new Error('Agent must have at least one capability');
    }

    // Validate capability names
    metadata.capabilities.forEach(capability => {
      if (!capability.name || capability.name.trim() === '') {
        throw new Error('Capability name is required');
      }
    });
  }

  private setupAgentEventForwarding(agent: IAgent): void {
    const agentId = agent.metadata.id;

    // Forward important agent events to registry
    const eventsToForward = [
      'stateChanged', 'taskCompleted', 'taskFailed', 
      'error', 'initialized', 'started', 'stopped'
    ];

    eventsToForward.forEach(eventName => {
      agent.on(eventName, (data: any) => {
        this.emit(`agent:${eventName}`, {
          agentId,
          ...data
        });
      });
    });
  }

  private startHealthCheckMonitoring(): void {
    // Perform health checks every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        const healthResults = await this.healthCheck();
        const unhealthyAgents = Object.entries(healthResults)
          .filter(([_, isHealthy]) => !isHealthy)
          .map(([agentId]) => agentId);

        if (unhealthyAgents.length > 0) {
          this.emit('unhealthyAgents', { 
            agentIds: unhealthyAgents,
            timestamp: new Date()
          });
        }

        this.emit('healthCheckCompleted', {
          totalAgents: Object.keys(healthResults).length,
          healthyCount: Object.values(healthResults).filter(Boolean).length,
          unhealthyCount: unhealthyAgents.length,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Registry health check failed:', error);
        this.emit('healthCheckFailed', { error, timestamp: new Date() });
      }
    }, 30000); // 30 seconds
  }

  private getAgentLoad(agent: IAgent): number {
    // Simple load calculation based on agent state
    // You could implement more sophisticated load calculation here
    const state = agent.state;
    
    if (state.status === 'error' || state.status === 'cancelled') {
      return 100; // Highest load for unavailable agents
    }
    
    if (state.status === 'running' && state.currentTask) {
      return 80; // High load for busy agents
    }
    
    if (state.status === 'paused') {
      return 60; // Medium load for paused agents
    }
    
    return 10; // Low load for idle agents
  }

  // Event emitter methods (inherited)
  public on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public emit(event: string, ...args: any[]): boolean {
    return super.emit(event, ...args);
  }

  public removeListener(event: string, listener: (...args: any[]) => void): this {
    return super.removeListener(event, listener);
  }
}

// Singleton instance export
export const agentRegistry = AgentRegistry.getInstance();