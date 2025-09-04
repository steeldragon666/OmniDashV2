import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface WorkflowState {
  id: string;
  workflowId: string;
  executionId?: string;
  status: 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';
  currentStep: number;
  totalSteps: number;
  context: WorkflowContext;
  checkpoints: StateCheckpoint[];
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  metadata: Record<string, any>;
}

export interface WorkflowContext {
  variables: Map<string, any>;
  sessionData: Record<string, any>;
  userInputs: Record<string, any>;
  externalData: Record<string, any>;
  secrets: Map<string, string>;
  cache: Map<string, any>;
  history: ContextHistoryEntry[];
}

export interface StateCheckpoint {
  id: string;
  stepIndex: number;
  stepName: string;
  timestamp: Date;
  context: WorkflowContext;
  success: boolean;
  error?: string;
  duration: number;
  metadata: Record<string, any>;
}

export interface ContextHistoryEntry {
  timestamp: Date;
  action: 'set' | 'get' | 'delete' | 'clear';
  key?: string;
  value?: any;
  previousValue?: any;
}

export interface StateSnapshot {
  id: string;
  stateId: string;
  timestamp: Date;
  data: WorkflowState;
  reason: 'manual' | 'auto' | 'error' | 'checkpoint';
  compressed: boolean;
}

export interface StatePersistenceConfig {
  enablePersistence: boolean;
  enableSnapshots: boolean;
  snapshotInterval: number; // in milliseconds
  maxSnapshots: number;
  compressionThreshold: number; // size in bytes
  persistenceProvider: 'memory' | 'file' | 'database';
}

export class WorkflowStateManager extends EventEmitter {
  private states: Map<string, WorkflowState> = new Map();
  private snapshots: Map<string, StateSnapshot[]> = new Map();
  private persistenceConfig: StatePersistenceConfig;
  private snapshotTimer?: NodeJS.Timeout;
  private contextHistory: Map<string, ContextHistoryEntry[]> = new Map();
  private maxHistorySize = 1000;

  constructor(config: Partial<StatePersistenceConfig> = {}) {
    super();
    
    this.persistenceConfig = {
      enablePersistence: true,
      enableSnapshots: true,
      snapshotInterval: 300000, // 5 minutes
      maxSnapshots: 100,
      compressionThreshold: 50000, // 50KB
      persistenceProvider: 'memory',
      ...config
    };

    this.initialize();
  }

  private initialize() {
    if (this.persistenceConfig.enableSnapshots) {
      this.startSnapshotScheduler();
    }
  }

  public createState(
    workflowId: string,
    executionId?: string,
    initialContext: Partial<WorkflowContext> = {}
  ): string {
    const stateId = uuidv4();
    
    const workflowState: WorkflowState = {
      id: stateId,
      workflowId,
      executionId,
      status: 'active',
      currentStep: 0,
      totalSteps: 0,
      context: {
        variables: new Map(),
        sessionData: {},
        userInputs: {},
        externalData: {},
        secrets: new Map(),
        cache: new Map(),
        history: [],
        ...initialContext
      },
      checkpoints: [],
      startedAt: new Date(),
      updatedAt: new Date(),
      metadata: {}
    };

    this.states.set(stateId, workflowState);
    this.snapshots.set(stateId, []);
    this.contextHistory.set(stateId, []);

    this.emit('state:created', workflowState);
    console.log(`🏗️ Workflow state created: ${stateId} for workflow: ${workflowId}`);

    if (this.persistenceConfig.enablePersistence) {
      this.persistState(stateId);
    }

    return stateId;
  }

  public getState(stateId: string): WorkflowState | undefined {
    return this.states.get(stateId);
  }

  public updateState(stateId: string, updates: Partial<WorkflowState>): boolean {
    const state = this.states.get(stateId);
    if (!state) return false;

    const updatedState: WorkflowState = {
      ...state,
      ...updates,
      updatedAt: new Date()
    };

    this.states.set(stateId, updatedState);
    this.emit('state:updated', updatedState);

    if (this.persistenceConfig.enablePersistence) {
      this.persistState(stateId);
    }

    return true;
  }

  public setContextVariable(stateId: string, key: string, value: any): boolean {
    const state = this.states.get(stateId);
    if (!state) return false;

    const previousValue = state.context.variables.get(key);
    state.context.variables.set(key, value);
    state.updatedAt = new Date();

    // Record in history
    this.addToContextHistory(stateId, {
      timestamp: new Date(),
      action: 'set',
      key,
      value,
      previousValue
    });

    state.context.history.push({
      timestamp: new Date(),
      action: 'set',
      key,
      value,
      previousValue
    });

    this.states.set(stateId, state);
    this.emit('context:variable:set', { stateId, key, value, previousValue });

    return true;
  }

  public getContextVariable(stateId: string, key: string): any {
    const state = this.states.get(stateId);
    if (!state) return undefined;

    const value = state.context.variables.get(key);

    // Record access in history
    this.addToContextHistory(stateId, {
      timestamp: new Date(),
      action: 'get',
      key,
      value
    });

    this.emit('context:variable:get', { stateId, key, value });
    return value;
  }

  public deleteContextVariable(stateId: string, key: string): boolean {
    const state = this.states.get(stateId);
    if (!state) return false;

    const previousValue = state.context.variables.get(key);
    const deleted = state.context.variables.delete(key);
    
    if (deleted) {
      state.updatedAt = new Date();

      this.addToContextHistory(stateId, {
        timestamp: new Date(),
        action: 'delete',
        key,
        previousValue
      });

      state.context.history.push({
        timestamp: new Date(),
        action: 'delete',
        key,
        previousValue
      });

      this.states.set(stateId, state);
      this.emit('context:variable:deleted', { stateId, key, previousValue });
    }

    return deleted;
  }

  public setSessionData(stateId: string, key: string, value: any): boolean {
    const state = this.states.get(stateId);
    if (!state) return false;

    state.context.sessionData[key] = value;
    state.updatedAt = new Date();

    this.states.set(stateId, state);
    this.emit('context:session:set', { stateId, key, value });

    return true;
  }

  public getSessionData(stateId: string, key?: string): any {
    const state = this.states.get(stateId);
    if (!state) return undefined;

    return key ? state.context.sessionData[key] : state.context.sessionData;
  }

  public cacheData(stateId: string, key: string, value: any, ttl?: number): boolean {
    const state = this.states.get(stateId);
    if (!state) return false;

    const cacheEntry = {
      value,
      timestamp: new Date(),
      ttl: ttl ? Date.now() + ttl : undefined
    };

    state.context.cache.set(key, cacheEntry);
    state.updatedAt = new Date();

    this.states.set(stateId, state);
    this.emit('context:cache:set', { stateId, key, value, ttl });

    return true;
  }

  public getCachedData(stateId: string, key: string): any {
    const state = this.states.get(stateId);
    if (!state) return undefined;

    const cacheEntry = state.context.cache.get(key);
    if (!cacheEntry) return undefined;

    // Check TTL
    if (cacheEntry.ttl && Date.now() > cacheEntry.ttl) {
      state.context.cache.delete(key);
      this.emit('context:cache:expired', { stateId, key });
      return undefined;
    }

    this.emit('context:cache:hit', { stateId, key, value: cacheEntry.value });
    return cacheEntry.value;
  }

  public clearCache(stateId: string): boolean {
    const state = this.states.get(stateId);
    if (!state) return false;

    const clearedCount = state.context.cache.size;
    state.context.cache.clear();
    state.updatedAt = new Date();

    this.states.set(stateId, state);
    this.emit('context:cache:cleared', { stateId, clearedCount });

    return true;
  }

  public createCheckpoint(
    stateId: string,
    stepIndex: number,
    stepName: string,
    success: boolean,
    duration: number,
    error?: string,
    metadata: Record<string, any> = {}
  ): string {
    const state = this.states.get(stateId);
    if (!state) throw new Error(`State not found: ${stateId}`);

    const checkpointId = uuidv4();
    const checkpoint: StateCheckpoint = {
      id: checkpointId,
      stepIndex,
      stepName,
      timestamp: new Date(),
      context: this.cloneContext(state.context),
      success,
      error,
      duration,
      metadata
    };

    state.checkpoints.push(checkpoint);
    state.currentStep = stepIndex;
    state.updatedAt = new Date();

    this.states.set(stateId, state);
    this.emit('checkpoint:created', { stateId, checkpoint });

    console.log(`📍 Checkpoint created: ${stepName} (${checkpointId})`);

    if (this.persistenceConfig.enableSnapshots) {
      this.createSnapshot(stateId, 'checkpoint');
    }

    return checkpointId;
  }

  public restoreFromCheckpoint(stateId: string, checkpointId: string): boolean {
    const state = this.states.get(stateId);
    if (!state) return false;

    const checkpoint = state.checkpoints.find(cp => cp.id === checkpointId);
    if (!checkpoint) return false;

    // Restore context
    state.context = this.cloneContext(checkpoint.context);
    state.currentStep = checkpoint.stepIndex;
    state.status = 'active';
    state.updatedAt = new Date();

    this.states.set(stateId, state);
    this.emit('state:restored', { stateId, checkpointId, checkpoint });

    console.log(`🔄 State restored from checkpoint: ${checkpoint.stepName}`);
    return true;
  }

  public getLastCheckpoint(stateId: string): StateCheckpoint | undefined {
    const state = this.states.get(stateId);
    if (!state || state.checkpoints.length === 0) return undefined;

    return state.checkpoints[state.checkpoints.length - 1];
  }

  public getCheckpointsByStep(stateId: string, stepIndex: number): StateCheckpoint[] {
    const state = this.states.get(stateId);
    if (!state) return [];

    return state.checkpoints.filter(cp => cp.stepIndex === stepIndex);
  }

  public createSnapshot(stateId: string, reason: StateSnapshot['reason'] = 'manual'): string {
    const state = this.states.get(stateId);
    if (!state) throw new Error(`State not found: ${stateId}`);

    const snapshotId = uuidv4();
    const serializedData = JSON.stringify(state);
    const shouldCompress = serializedData.length > this.persistenceConfig.compressionThreshold;

    const snapshot: StateSnapshot = {
      id: snapshotId,
      stateId,
      timestamp: new Date(),
      data: shouldCompress ? this.compressData(state) : state,
      reason,
      compressed: shouldCompress
    };

    const stateSnapshots = this.snapshots.get(stateId) || [];
    stateSnapshots.push(snapshot);

    // Maintain snapshot limit
    if (stateSnapshots.length > this.persistenceConfig.maxSnapshots) {
      stateSnapshots.shift(); // Remove oldest snapshot
    }

    this.snapshots.set(stateId, stateSnapshots);
    this.emit('snapshot:created', snapshot);

    console.log(`📸 Snapshot created: ${snapshotId} (${reason})`);
    return snapshotId;
  }

  public restoreFromSnapshot(stateId: string, snapshotId: string): boolean {
    const stateSnapshots = this.snapshots.get(stateId);
    if (!stateSnapshots) return false;

    const snapshot = stateSnapshots.find(s => s.id === snapshotId);
    if (!snapshot) return false;

    const restoredState = snapshot.compressed 
      ? this.decompressData(snapshot.data) 
      : snapshot.data;

    restoredState.updatedAt = new Date();
    this.states.set(stateId, restoredState);

    this.emit('state:restored_from_snapshot', { stateId, snapshotId, snapshot });
    console.log(`📷 State restored from snapshot: ${snapshotId}`);

    return true;
  }

  public getSnapshots(stateId: string): StateSnapshot[] {
    return this.snapshots.get(stateId) || [];
  }

  public deleteSnapshot(stateId: string, snapshotId: string): boolean {
    const stateSnapshots = this.snapshots.get(stateId);
    if (!stateSnapshots) return false;

    const index = stateSnapshots.findIndex(s => s.id === snapshotId);
    if (index === -1) return false;

    stateSnapshots.splice(index, 1);
    this.snapshots.set(stateId, stateSnapshots);

    this.emit('snapshot:deleted', { stateId, snapshotId });
    return true;
  }

  public completeState(stateId: string, metadata: Record<string, any> = {}): boolean {
    const state = this.states.get(stateId);
    if (!state) return false;

    state.status = 'completed';
    state.completedAt = new Date();
    state.updatedAt = new Date();
    state.metadata = { ...state.metadata, ...metadata };

    this.states.set(stateId, state);
    this.emit('state:completed', state);

    console.log(`✅ Workflow state completed: ${stateId}`);

    if (this.persistenceConfig.enableSnapshots) {
      this.createSnapshot(stateId, 'auto');
    }

    return true;
  }

  public failState(stateId: string, error: string, metadata: Record<string, any> = {}): boolean {
    const state = this.states.get(stateId);
    if (!state) return false;

    state.status = 'failed';
    state.completedAt = new Date();
    state.updatedAt = new Date();
    state.metadata = { ...state.metadata, error, ...metadata };

    this.states.set(stateId, state);
    this.emit('state:failed', { state, error });

    console.log(`❌ Workflow state failed: ${stateId} - ${error}`);

    if (this.persistenceConfig.enableSnapshots) {
      this.createSnapshot(stateId, 'error');
    }

    return true;
  }

  public pauseState(stateId: string): boolean {
    const state = this.states.get(stateId);
    if (!state || state.status !== 'active') return false;

    state.status = 'paused';
    state.updatedAt = new Date();

    this.states.set(stateId, state);
    this.emit('state:paused', state);

    return true;
  }

  public resumeState(stateId: string): boolean {
    const state = this.states.get(stateId);
    if (!state || state.status !== 'paused') return false;

    state.status = 'active';
    state.updatedAt = new Date();

    this.states.set(stateId, state);
    this.emit('state:resumed', state);

    return true;
  }

  public cancelState(stateId: string): boolean {
    const state = this.states.get(stateId);
    if (!state) return false;

    state.status = 'cancelled';
    state.completedAt = new Date();
    state.updatedAt = new Date();

    this.states.set(stateId, state);
    this.emit('state:cancelled', state);

    return true;
  }

  public deleteState(stateId: string): boolean {
    const state = this.states.get(stateId);
    if (!state) return false;

    this.states.delete(stateId);
    this.snapshots.delete(stateId);
    this.contextHistory.delete(stateId);

    this.emit('state:deleted', state);
    console.log(`🗑️ Workflow state deleted: ${stateId}`);

    return true;
  }

  private cloneContext(context: WorkflowContext): WorkflowContext {
    return {
      variables: new Map(context.variables),
      sessionData: { ...context.sessionData },
      userInputs: { ...context.userInputs },
      externalData: { ...context.externalData },
      secrets: new Map(context.secrets),
      cache: new Map(context.cache),
      history: [...context.history]
    };
  }

  private addToContextHistory(stateId: string, entry: ContextHistoryEntry) {
    const history = this.contextHistory.get(stateId) || [];
    history.push(entry);

    // Maintain history size
    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    this.contextHistory.set(stateId, history);
  }

  private compressData(data: WorkflowState): WorkflowState {
    // Simple compression simulation - in production use actual compression
    return JSON.parse(JSON.stringify(data));
  }

  private decompressData(data: WorkflowState): WorkflowState {
    // Simple decompression simulation
    return data;
  }

  private async persistState(stateId: string) {
    // Persistence implementation would go here
    // For now, just emit an event
    this.emit('state:persisted', { stateId });
  }

  private startSnapshotScheduler() {
    this.snapshotTimer = setInterval(() => {
      // Create automatic snapshots for active states
      for (const [stateId, state] of this.states.entries()) {
        if (state.status === 'active') {
          this.createSnapshot(stateId, 'auto');
        }
      }
    }, this.persistenceConfig.snapshotInterval);
  }

  // Query methods
  public getActiveStates(): WorkflowState[] {
    return Array.from(this.states.values()).filter(state => state.status === 'active');
  }

  public getStatesByWorkflow(workflowId: string): WorkflowState[] {
    return Array.from(this.states.values()).filter(state => state.workflowId === workflowId);
  }

  public getStatesByStatus(status: WorkflowState['status']): WorkflowState[] {
    return Array.from(this.states.values()).filter(state => state.status === status);
  }

  public getContextHistory(stateId: string): ContextHistoryEntry[] {
    return this.contextHistory.get(stateId) || [];
  }

  public getStateStats(): {
    total: number;
    active: number;
    completed: number;
    failed: number;
    paused: number;
    cancelled: number;
  } {
    const states = Array.from(this.states.values());
    
    return {
      total: states.length,
      active: states.filter(s => s.status === 'active').length,
      completed: states.filter(s => s.status === 'completed').length,
      failed: states.filter(s => s.status === 'failed').length,
      paused: states.filter(s => s.status === 'paused').length,
      cancelled: states.filter(s => s.status === 'cancelled').length
    };
  }

  public cleanup(maxAge: number = 86400000): number {
    // Clean up states older than maxAge (default 24 hours)
    const cutoffTime = new Date(Date.now() - maxAge);
    let cleaned = 0;

    for (const [stateId, state] of this.states.entries()) {
      if ((state.completedAt && state.completedAt < cutoffTime) ||
          (state.status !== 'active' && state.updatedAt < cutoffTime)) {
        this.deleteState(stateId);
        cleaned++;
      }
    }

    this.emit('cleanup:completed', { cleaned, cutoffTime });
    console.log(`🧹 Cleaned up ${cleaned} old states`);

    return cleaned;
  }

  public shutdown() {
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
    }
    
    this.removeAllListeners();
    console.log('📴 WorkflowStateManager shutdown complete');
  }
}

export const createStateManager = (config?: Partial<StatePersistenceConfig>) => 
  new WorkflowStateManager(config);