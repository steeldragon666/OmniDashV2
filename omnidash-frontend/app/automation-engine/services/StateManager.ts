import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface WorkflowState {
  id: string;
  workflowId: string;
  executionId: string;
  status: 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';
  currentNode?: string;
  variables: Record<string, unknown>;
  context: ExecutionContext;
  checkpoints: StateCheckpoint[];
  metadata: {
    startedAt: Date;
    lastUpdated: Date;
    version: number;
    ttl?: Date;
  };
  persistence: {
    strategy: 'memory' | 'redis' | 'database' | 'file';
    location?: string;
    encrypted: boolean;
  };
}

export interface StateCheckpoint {
  id: string;
  nodeId: string;
  timestamp: Date;
  variables: Record<string, unknown>;
  context: Partial<ExecutionContext>;
  metadata: Record<string, unknown>;
}

export interface ExecutionContext {
  user?: {
    id: string;
    email: string;
    name?: string;
    permissions?: string[];
  };
  environment: 'development' | 'staging' | 'production';
  requestId?: string;
  sessionId?: string;
  source: 'api' | 'ui' | 'cron' | 'webhook' | 'manual';
  metadata: Record<string, unknown>;
  resources: {
    memory?: number;
    cpu?: number;
    timeout?: number;
    priority?: number;
  };
}

export interface StatePersistenceConfig {
  strategy: 'memory' | 'redis' | 'database' | 'file';
  options: {
    redis?: {
      host: string;
      port: number;
      password?: string;
      db?: number;
      keyPrefix?: string;
      ttl?: number;
    };
    database?: {
      connectionString: string;
      tableName: string;
      encryptionKey?: string;
    };
    file?: {
      directory: string;
      format: 'json' | 'binary';
      compression?: boolean;
      encryptionKey?: string;
    };
  };
  cleanup: {
    enabled: boolean;
    maxAge: number; // milliseconds
    maxEntries?: number;
    schedule?: string; // cron expression
  };
}

export interface StateQuery {
  workflowId?: string;
  executionId?: string;
  status?: WorkflowState['status'];
  currentNode?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

export interface StateMetrics {
  totalStates: number;
  activeStates: number;
  pausedStates: number;
  completedStates: number;
  failedStates: number;
  averageExecutionTime: number;
  memoryUsage: number;
  persistenceLatency: number;
  checkpointCount: number;
}

export class StateManager extends EventEmitter {
  private states: Map<string, WorkflowState> = new Map();
  private persistenceConfig: StatePersistenceConfig;
  private persistenceProvider: PersistenceProvider;
  private cleanupInterval?: NodeJS.Timeout;
  private metrics: StateMetrics = {
    totalStates: 0,
    activeStates: 0,
    pausedStates: 0,
    completedStates: 0,
    failedStates: 0,
    averageExecutionTime: 0,
    memoryUsage: 0,
    persistenceLatency: 0,
    checkpointCount: 0
  };

  constructor(config?: Partial<StatePersistenceConfig>) {
    super();
    this.persistenceConfig = {
      strategy: 'memory',
      options: {},
      cleanup: {
        enabled: true,
        maxAge: 86400000, // 24 hours
        maxEntries: 10000
      },
      ...config
    };
    
    this.persistenceProvider = this.createPersistenceProvider();
    this.initialize();
  }

  private initialize(): void {
    this.startCleanupSchedule();
    this.startMetricsCollection();
    console.log(`📊 StateManager initialized with ${this.persistenceConfig.strategy} persistence`);
  }

  public async createState(
    workflowId: string,
    executionId: string,
    initialVariables: Record<string, unknown> = {},
    context: Partial<ExecutionContext> = {}
  ): Promise<string> {
    const stateId = uuidv4();
    
    const state: WorkflowState = {
      id: stateId,
      workflowId,
      executionId,
      status: 'active',
      variables: initialVariables,
      context: {
        environment: 'development',
        source: 'api',
        metadata: {},
        resources: {},
        ...context
      },
      checkpoints: [],
      metadata: {
        startedAt: new Date(),
        lastUpdated: new Date(),
        version: 1
      },
      persistence: {
        strategy: this.persistenceConfig.strategy,
        encrypted: false
      }
    };

    this.states.set(stateId, state);
    await this.persistState(state);

    this.emit('state:created', state);
    this.updateMetrics();
    
    console.log(`📝 State created: ${stateId} for workflow ${workflowId}`);
    return stateId;
  }

  public async updateState(
    stateId: string,
    updates: {
      variables?: Record<string, unknown>;
      currentNode?: string;
      status?: WorkflowState['status'];
      context?: Partial<ExecutionContext>;
      metadata?: Record<string, unknown>;
    }
  ): Promise<boolean> {
    const state = this.states.get(stateId);
    if (!state) {
      console.warn(`State not found: ${stateId}`);
      return false;
    }

    const previousVersion = state.metadata.version;
    
    // Update state
    if (updates.variables) {
      state.variables = { ...state.variables, ...updates.variables };
    }
    
    if (updates.currentNode) {
      state.currentNode = updates.currentNode;
    }
    
    if (updates.status) {
      state.status = updates.status;
    }
    
    if (updates.context) {
      state.context = { ...state.context, ...updates.context };
    }

    // Update metadata
    state.metadata.lastUpdated = new Date();
    state.metadata.version = previousVersion + 1;
    
    if (updates.metadata) {
      state.metadata = { ...state.metadata, ...updates.metadata };
    }

    this.states.set(stateId, state);
    await this.persistState(state);

    this.emit('state:updated', { state, previousVersion, updates });
    this.updateMetrics();

    return true;
  }

  public async createCheckpoint(
    stateId: string,
    nodeId: string,
    additionalContext?: Record<string, unknown>
  ): Promise<string> {
    const state = this.states.get(stateId);
    if (!state) {
      throw new Error(`State not found: ${stateId}`);
    }

    const checkpointId = uuidv4();
    const checkpoint: StateCheckpoint = {
      id: checkpointId,
      nodeId,
      timestamp: new Date(),
      variables: { ...state.variables },
      context: { ...state.context, ...additionalContext },
      metadata: {
        stateVersion: state.metadata.version,
        executionId: state.executionId,
        workflowId: state.workflowId
      }
    };

    state.checkpoints.push(checkpoint);
    state.metadata.lastUpdated = new Date();
    state.metadata.version++;

    this.states.set(stateId, state);
    await this.persistState(state);

    this.emit('checkpoint:created', { state, checkpoint });
    this.metrics.checkpointCount++;

    console.log(`🎯 Checkpoint created: ${checkpointId} at node ${nodeId}`);
    return checkpointId;
  }

  public async restoreFromCheckpoint(
    stateId: string,
    checkpointId: string
  ): Promise<boolean> {
    const state = this.states.get(stateId);
    if (!state) {
      throw new Error(`State not found: ${stateId}`);
    }

    const checkpoint = state.checkpoints.find(cp => cp.id === checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }

    // Restore state from checkpoint
    state.variables = { ...checkpoint.variables };
    state.currentNode = checkpoint.nodeId;
    state.context = { ...state.context, ...checkpoint.context };
    state.metadata.lastUpdated = new Date();
    state.metadata.version++;

    this.states.set(stateId, state);
    await this.persistState(state);

    this.emit('state:restored', { state, checkpoint });
    console.log(`🔄 State restored from checkpoint: ${checkpointId}`);

    return true;
  }

  public getState(stateId: string): WorkflowState | undefined {
    return this.states.get(stateId);
  }

  public getStateByExecution(executionId: string): WorkflowState | undefined {
    return Array.from(this.states.values())
      .find(state => state.executionId === executionId);
  }

  public queryStates(query: StateQuery): WorkflowState[] {
    let results = Array.from(this.states.values());

    if (query.workflowId) {
      results = results.filter(state => state.workflowId === query.workflowId);
    }

    if (query.executionId) {
      results = results.filter(state => state.executionId === query.executionId);
    }

    if (query.status) {
      results = results.filter(state => state.status === query.status);
    }

    if (query.currentNode) {
      results = results.filter(state => state.currentNode === query.currentNode);
    }

    if (query.createdAfter) {
      results = results.filter(state => state.metadata.startedAt >= query.createdAfter!);
    }

    if (query.createdBefore) {
      results = results.filter(state => state.metadata.startedAt <= query.createdBefore!);
    }

    // Sort by creation time (newest first)
    results.sort((a, b) => b.metadata.startedAt.getTime() - a.metadata.startedAt.getTime());

    // Apply pagination
    if (query.offset) {
      results = results.slice(query.offset);
    }

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  public async pauseState(stateId: string): Promise<boolean> {
    const state = this.states.get(stateId);
    if (!state || state.status !== 'active') {
      return false;
    }

    state.status = 'paused';
    state.metadata.lastUpdated = new Date();
    state.metadata.version++;

    this.states.set(stateId, state);
    await this.persistState(state);

    this.emit('state:paused', state);
    this.updateMetrics();

    console.log(`⏸️ State paused: ${stateId}`);
    return true;
  }

  public async resumeState(stateId: string): Promise<boolean> {
    const state = this.states.get(stateId);
    if (!state || state.status !== 'paused') {
      return false;
    }

    state.status = 'active';
    state.metadata.lastUpdated = new Date();
    state.metadata.version++;

    this.states.set(stateId, state);
    await this.persistState(state);

    this.emit('state:resumed', state);
    this.updateMetrics();

    console.log(`▶️ State resumed: ${stateId}`);
    return true;
  }

  public async completeState(
    stateId: string,
    finalVariables?: Record<string, unknown>
  ): Promise<boolean> {
    const state = this.states.get(stateId);
    if (!state) {
      return false;
    }

    if (finalVariables) {
      state.variables = { ...state.variables, ...finalVariables };
    }

    state.status = 'completed';
    state.metadata.lastUpdated = new Date();
    state.metadata.version++;

    this.states.set(stateId, state);
    await this.persistState(state);

    this.emit('state:completed', state);
    this.updateMetrics();

    console.log(`✅ State completed: ${stateId}`);
    return true;
  }

  public async failState(
    stateId: string,
    error: string,
    errorContext?: Record<string, unknown>
  ): Promise<boolean> {
    const state = this.states.get(stateId);
    if (!state) {
      return false;
    }

    state.status = 'failed';
    state.variables.error = error;
    state.variables.errorContext = errorContext;
    state.metadata.lastUpdated = new Date();
    state.metadata.version++;

    this.states.set(stateId, state);
    await this.persistState(state);

    this.emit('state:failed', { state, error, errorContext });
    this.updateMetrics();

    console.error(`❌ State failed: ${stateId} - ${error}`);
    return true;
  }

  public async deleteState(stateId: string): Promise<boolean> {
    const state = this.states.get(stateId);
    if (!state) {
      return false;
    }

    this.states.delete(stateId);
    await this.persistenceProvider.delete(stateId);

    this.emit('state:deleted', state);
    this.updateMetrics();

    console.log(`🗑️ State deleted: ${stateId}`);
    return true;
  }

  public async cleanupExpiredStates(): Promise<number> {
    const now = new Date();
    const maxAge = this.persistenceConfig.cleanup.maxAge;
    const maxEntries = this.persistenceConfig.cleanup.maxEntries;
    let cleanedCount = 0;

    // Remove expired states
    if (this.persistenceConfig.cleanup.enabled) {
      for (const [stateId, state] of this.states.entries()) {
        const age = now.getTime() - state.metadata.startedAt.getTime();
        
        if (age > maxAge || (state.metadata.ttl && now > state.metadata.ttl)) {
          await this.deleteState(stateId);
          cleanedCount++;
        }
      }

      // Remove excess states if over limit
      if (maxEntries && this.states.size > maxEntries) {
        const sortedStates = Array.from(this.states.entries())
          .sort(([, a], [, b]) => a.metadata.startedAt.getTime() - b.metadata.startedAt.getTime());

        const toRemove = sortedStates.slice(0, this.states.size - maxEntries);
        
        for (const [stateId] of toRemove) {
          await this.deleteState(stateId);
          cleanedCount++;
        }
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired states`);
    }

    return cleanedCount;
  }

  private async persistState(state: WorkflowState): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.persistenceProvider.save(state.id, state);
      this.metrics.persistenceLatency = Date.now() - startTime;
    } catch (error) {
      console.error(`Failed to persist state ${state.id}:`, error);
      this.emit('persistence:error', { stateId: state.id, error });
    }
  }

  private createPersistenceProvider(): PersistenceProvider {
    switch (this.persistenceConfig.strategy) {
      case 'memory':
        return new MemoryPersistenceProvider();
      case 'redis':
        return new RedisPersistenceProvider(this.persistenceConfig.options.redis!);
      case 'database':
        return new DatabasePersistenceProvider(this.persistenceConfig.options.database!);
      case 'file':
        return new FilePersistenceProvider(this.persistenceConfig.options.file!);
      default:
        throw new Error(`Unknown persistence strategy: ${this.persistenceConfig.strategy}`);
    }
  }

  private startCleanupSchedule(): void {
    if (this.persistenceConfig.cleanup.enabled) {
      // Run cleanup every hour
      this.cleanupInterval = setInterval(async () => {
        try {
          await this.cleanupExpiredStates();
        } catch (error) {
          console.error('Error during state cleanup:', error);
        }
      }, 3600000); // 1 hour
    }
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.updateMetrics();
    }, 30000); // Update every 30 seconds
  }

  private updateMetrics(): void {
    const states = Array.from(this.states.values());
    
    this.metrics.totalStates = states.length;
    this.metrics.activeStates = states.filter(s => s.status === 'active').length;
    this.metrics.pausedStates = states.filter(s => s.status === 'paused').length;
    this.metrics.completedStates = states.filter(s => s.status === 'completed').length;
    this.metrics.failedStates = states.filter(s => s.status === 'failed').length;

    // Calculate average execution time for completed states
    const completedStates = states.filter(s => s.status === 'completed');
    if (completedStates.length > 0) {
      const totalTime = completedStates.reduce((sum, state) => {
        return sum + (state.metadata.lastUpdated.getTime() - state.metadata.startedAt.getTime());
      }, 0);
      this.metrics.averageExecutionTime = totalTime / completedStates.length;
    }

    // Estimate memory usage
    this.metrics.memoryUsage = JSON.stringify(Array.from(this.states.values())).length;

    this.emit('metrics:updated', this.metrics);
  }

  // Public API methods
  public getMetrics(): StateMetrics {
    return { ...this.metrics };
  }

  public async backup(): Promise<WorkflowState[]> {
    return Array.from(this.states.values());
  }

  public async restore(states: WorkflowState[]): Promise<number> {
    let restoredCount = 0;
    
    for (const state of states) {
      this.states.set(state.id, state);
      await this.persistState(state);
      restoredCount++;
    }

    this.updateMetrics();
    console.log(`📦 Restored ${restoredCount} states from backup`);
    
    return restoredCount;
  }

  public async bulkUpdate(
    query: StateQuery,
    updates: Partial<WorkflowState>
  ): Promise<number> {
    const states = this.queryStates(query);
    let updatedCount = 0;

    for (const state of states) {
      const success = await this.updateState(state.id, updates);
      if (success) updatedCount++;
    }

    console.log(`📝 Bulk updated ${updatedCount} states`);
    return updatedCount;
  }

  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.persistenceProvider.close?.();
    this.removeAllListeners();
    
    console.log('🛑 StateManager shutdown complete');
  }
}

// Persistence providers
interface PersistenceProvider {
  save(stateId: string, state: WorkflowState): Promise<void>;
  load(stateId: string): Promise<WorkflowState | null>;
  delete(stateId: string): Promise<void>;
  list(): Promise<string[]>;
  close?(): Promise<void>;
}

class MemoryPersistenceProvider implements PersistenceProvider {
  private storage: Map<string, WorkflowState> = new Map();

  async save(stateId: string, state: WorkflowState): Promise<void> {
    this.storage.set(stateId, JSON.parse(JSON.stringify(state)));
  }

  async load(stateId: string): Promise<WorkflowState | null> {
    const state = this.storage.get(stateId);
    return state ? JSON.parse(JSON.stringify(state)) : null;
  }

  async delete(stateId: string): Promise<void> {
    this.storage.delete(stateId);
  }

  async list(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }
}

class RedisPersistenceProvider implements PersistenceProvider {
  constructor(private config: NonNullable<StatePersistenceConfig['options']['redis']>) {}

  async save(stateId: string, state: WorkflowState): Promise<void> {
    // In production, implement actual Redis client
    console.log(`Redis save: ${stateId}`);
  }

  async load(stateId: string): Promise<WorkflowState | null> {
    console.log(`Redis load: ${stateId}`);
    return null;
  }

  async delete(stateId: string): Promise<void> {
    console.log(`Redis delete: ${stateId}`);
  }

  async list(): Promise<string[]> {
    return [];
  }

  async close(): Promise<void> {
    console.log('Redis connection closed');
  }
}

class DatabasePersistenceProvider implements PersistenceProvider {
  constructor(private config: NonNullable<StatePersistenceConfig['options']['database']>) {}

  async save(stateId: string, state: WorkflowState): Promise<void> {
    console.log(`Database save: ${stateId}`);
  }

  async load(stateId: string): Promise<WorkflowState | null> {
    console.log(`Database load: ${stateId}`);
    return null;
  }

  async delete(stateId: string): Promise<void> {
    console.log(`Database delete: ${stateId}`);
  }

  async list(): Promise<string[]> {
    return [];
  }

  async close(): Promise<void> {
    console.log('Database connection closed');
  }
}

class FilePersistenceProvider implements PersistenceProvider {
  constructor(private config: NonNullable<StatePersistenceConfig['options']['file']>) {}

  async save(stateId: string, state: WorkflowState): Promise<void> {
    console.log(`File save: ${stateId} to ${this.config.directory}`);
  }

  async load(stateId: string): Promise<WorkflowState | null> {
    console.log(`File load: ${stateId} from ${this.config.directory}`);
    return null;
  }

  async delete(stateId: string): Promise<void> {
    console.log(`File delete: ${stateId}`);
  }

  async list(): Promise<string[]> {
    return [];
  }
}

export const stateManager = new StateManager();