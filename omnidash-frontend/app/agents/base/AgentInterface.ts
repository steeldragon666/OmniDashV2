/**
 * Core interfaces for the AI Agents system
 * Defines the contract that all agents must implement
 */

export interface AgentCapability {
  name: string;
  description: string;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
}

export interface AgentMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  category: AgentCategory;
  capabilities: AgentCapability[];
  dependencies?: string[];
  tags?: string[];
  author?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type AgentCategory = 
  | 'content'
  | 'social'
  | 'analytics'
  | 'business'
  | 'orchestration'
  | 'integration'
  | 'utility';

export type AgentStatus = 
  | 'idle'
  | 'running'
  | 'paused'
  | 'error'
  | 'completed'
  | 'cancelled';

export interface AgentState {
  status: AgentStatus;
  progress?: number;
  currentTask?: string;
  lastActivity?: Date;
  error?: AgentError;
  metadata?: Record<string, any>;
}

export interface AgentError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
  retryCount?: number;
  maxRetries?: number;
}

export interface AgentTask {
  id: string;
  type: string;
  priority: number;
  data: any;
  createdAt: Date;
  scheduledAt?: Date;
  deadline?: Date;
  dependencies?: string[];
  retryCount?: number;
  maxRetries?: number;
}

export interface AgentResult {
  success: boolean;
  data?: any;
  error?: AgentError;
  metadata?: {
    executionTime?: number;
    tokensUsed?: number;
    cost?: number;
    cacheHit?: boolean;
  };
}

export interface AgentEvent {
  id: string;
  agentId: string;
  type: string;
  data?: any;
  timestamp: Date;
  correlationId?: string;
}

export interface AgentContext {
  userId?: string;
  organizationId?: string;
  workflowId?: string;
  taskId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

export interface IAgent {
  // Core properties
  readonly metadata: AgentMetadata;
  readonly state: AgentState;
  
  // Lifecycle methods
  initialize(config?: Record<string, any>): Promise<void>;
  start(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  reset(): Promise<void>;
  
  // Task execution
  execute(task: AgentTask, context?: AgentContext): Promise<AgentResult>;
  canExecute(task: AgentTask): boolean;
  
  // State management
  getState(): AgentState;
  updateState(updates: Partial<AgentState>): void;
  
  // Event handling
  on(event: string, handler: (data: any) => void): void;
  off(event: string, handler?: (data: any) => void): void;
  emit(event: string, data?: any): void;
  
  // Health check
  healthCheck(): Promise<boolean>;
  
  // Configuration
  configure(config: Record<string, any>): Promise<void>;
  getConfiguration(): Record<string, any>;
  
  // Metrics
  getMetrics(): Promise<Record<string, any>>;
}

export interface IAgentRegistry {
  register(agent: IAgent): Promise<void>;
  unregister(agentId: string): Promise<void>;
  get(agentId: string): IAgent | undefined;
  getByCategory(category: AgentCategory): IAgent[];
  getByCapability(capability: string): IAgent[];
  list(): IAgent[];
  find(predicate: (agent: IAgent) => boolean): IAgent[];
  healthCheck(): Promise<Record<string, boolean>>;
}

export interface IAgentOrchestrator {
  executeWorkflow(workflowId: string, input: any, context?: AgentContext): Promise<any>;
  scheduleTask(task: AgentTask, context?: AgentContext): Promise<string>;
  cancelTask(taskId: string): Promise<boolean>;
  getTaskStatus(taskId: string): Promise<AgentTask | undefined>;
  
  // Workflow management
  createWorkflow(definition: WorkflowDefinition): Promise<string>;
  updateWorkflow(workflowId: string, definition: WorkflowDefinition): Promise<void>;
  deleteWorkflow(workflowId: string): Promise<void>;
  getWorkflow(workflowId: string): Promise<WorkflowDefinition | undefined>;
}

export interface WorkflowStep {
  id: string;
  agentId: string;
  type: string;
  config?: Record<string, any>;
  dependencies?: string[];
  condition?: string;
  timeout?: number;
  retries?: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  steps: WorkflowStep[];
  triggers?: WorkflowTrigger[];
  variables?: Record<string, any>;
  settings?: {
    timeout?: number;
    retries?: number;
    errorHandling?: 'stop' | 'continue' | 'rollback';
  };
}

export interface WorkflowTrigger {
  type: 'manual' | 'schedule' | 'webhook' | 'event';
  config: Record<string, any>;
}

export interface AIProvider {
  name: string;
  generate(prompt: string, options?: any): Promise<string>;
  chat(messages: Array<{role: string, content: string}>, options?: any): Promise<string>;
  embed(text: string): Promise<number[]>;
  moderate(content: string): Promise<boolean>;
}

export interface DatabaseProvider {
  query(sql: string, params?: any[]): Promise<any[]>;
  insert(table: string, data: Record<string, any>): Promise<any>;
  update(table: string, data: Record<string, any>, where: Record<string, any>): Promise<any>;
  delete(table: string, where: Record<string, any>): Promise<any>;
  transaction<T>(callback: () => Promise<T>): Promise<T>;
}

export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(pattern?: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export interface QueueProvider {
  add(queueName: string, job: any, options?: any): Promise<string>;
  process(queueName: string, processor: (job: any) => Promise<any>): void;
  getJob(jobId: string): Promise<any>;
  removeJob(jobId: string): Promise<boolean>;
  getQueueStatus(queueName: string): Promise<any>;
}

export interface LoggerProvider {
  info(message: string, metadata?: any): void;
  error(message: string, error?: Error, metadata?: any): void;
  warn(message: string, metadata?: any): void;
  debug(message: string, metadata?: any): void;
  trace(message: string, metadata?: any): void;
}

export interface MetricsProvider {
  increment(metric: string, value?: number, tags?: Record<string, string>): void;
  gauge(metric: string, value: number, tags?: Record<string, string>): void;
  histogram(metric: string, value: number, tags?: Record<string, string>): void;
  timing(metric: string, duration: number, tags?: Record<string, string>): void;
}