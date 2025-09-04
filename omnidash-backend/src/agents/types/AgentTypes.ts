/**
 * Core Agent Types and Interfaces
 * Defines the foundational types for the OmniDash AI Agents system
 */

import { EventEmitter } from 'events';

// Agent Status Enums
export enum AgentStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped'
}

export enum AgentPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRY = 'retry'
}

// Base Agent Configuration
export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  maxConcurrentTasks: number;
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
  priority: AgentPriority;
  tags: string[];
  capabilities: string[];
  dependencies: string[];
  environment: AgentEnvironment;
  rateLimiting: RateLimitConfig;
  monitoring: MonitoringConfig;
}

export interface AgentEnvironment {
  nodeEnv: string;
  logLevel: string;
  enableMetrics: boolean;
  enableTracing: boolean;
  customSettings: Record<string, any>;
}

export interface RateLimitConfig {
  enabled: boolean;
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
}

export interface MonitoringConfig {
  enableHealthCheck: boolean;
  enablePerformanceMetrics: boolean;
  enableErrorTracking: boolean;
  healthCheckInterval: number;
  metricsRetentionDays: number;
}

// Task Management
export interface AgentTask {
  id: string;
  agentId: string;
  type: string;
  status: TaskStatus;
  priority: AgentPriority;
  payload: Record<string, any>;
  context: TaskContext;
  metadata: TaskMetadata;
  createdAt: Date;
  updatedAt: Date;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  retryCount: number;
  maxRetries: number;
  result?: any;
  error?: AgentError;
}

export interface TaskContext {
  userId?: string;
  sessionId?: string;
  workflowId?: string;
  parentTaskId?: string;
  correlationId: string;
  requestId: string;
  source: string;
  environment: string;
  customData: Record<string, any>;
}

export interface TaskMetadata {
  estimatedDuration?: number;
  actualDuration?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  diskUsage?: number;
  networkCalls?: number;
  apiCalls?: Record<string, number>;
  tags: string[];
  labels: Record<string, string>;
}

// Agent Events
export interface AgentEvent {
  id: string;
  agentId: string;
  type: AgentEventType;
  timestamp: Date;
  data: Record<string, any>;
  source: string;
  severity: EventSeverity;
  correlationId?: string;
}

export enum AgentEventType {
  // Lifecycle Events
  AGENT_STARTED = 'agent.started',
  AGENT_STOPPED = 'agent.stopped',
  AGENT_PAUSED = 'agent.paused',
  AGENT_RESUMED = 'agent.resumed',
  AGENT_ERROR = 'agent.error',
  AGENT_HEALTH_CHECK = 'agent.health_check',

  // Task Events
  TASK_CREATED = 'task.created',
  TASK_STARTED = 'task.started',
  TASK_COMPLETED = 'task.completed',
  TASK_FAILED = 'task.failed',
  TASK_RETRY = 'task.retry',
  TASK_CANCELLED = 'task.cancelled',
  TASK_TIMEOUT = 'task.timeout',

  // Workflow Events
  WORKFLOW_STARTED = 'workflow.started',
  WORKFLOW_COMPLETED = 'workflow.completed',
  WORKFLOW_FAILED = 'workflow.failed',

  // Integration Events
  API_CALL_SUCCESS = 'api.call.success',
  API_CALL_FAILURE = 'api.call.failure',
  EXTERNAL_SERVICE_ERROR = 'external.service.error'
}

export enum EventSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Agent Capabilities
export interface AgentCapability {
  name: string;
  version: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  requirements: string[];
  limitations: string[];
}

// Agent Metrics
export interface AgentMetrics {
  agentId: string;
  timestamp: Date;
  status: AgentStatus;
  tasksProcessed: number;
  tasksSuccessful: number;
  tasksFailed: number;
  averageTaskDuration: number;
  memoryUsage: number;
  cpuUsage: number;
  errorRate: number;
  throughput: number;
  queueLength: number;
  customMetrics: Record<string, number>;
}

// Agent Health
export interface AgentHealth {
  agentId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  lastHeartbeat: Date;
  checks: HealthCheck[];
  resources: ResourceUsage;
  dependencies: DependencyStatus[];
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  duration: number;
  timestamp: Date;
}

export interface ResourceUsage {
  memory: {
    used: number;
    available: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
  disk: {
    used: number;
    available: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    connectionsActive: number;
  };
}

export interface DependencyStatus {
  name: string;
  type: 'database' | 'api' | 'service' | 'queue';
  status: 'available' | 'unavailable' | 'degraded';
  responseTime?: number;
  lastCheck: Date;
  errorCount: number;
}

// Error Handling
export interface AgentError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
  timestamp: Date;
  retryable: boolean;
  severity: EventSeverity;
}

// AI Provider Integration
export interface AIProviderConfig {
  provider: 'openai' | 'anthropic' | 'google';
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  timeout?: number;
  retryAttempts?: number;
  customSettings?: Record<string, any>;
}

export interface AIRequest {
  prompt: string;
  context?: string;
  maxTokens?: number;
  temperature?: number;
  systemMessage?: string;
  tools?: any[];
  metadata?: Record<string, any>;
}

export interface AIResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost?: number;
  };
  model: string;
  finishReason: string;
  metadata?: Record<string, any>;
}

// Queue Management
export interface QueueConfig {
  name: string;
  maxSize: number;
  maxConcurrency: number;
  defaultJobOptions: {
    delay?: number;
    priority?: number;
    attempts?: number;
    backoff?: {
      type: 'fixed' | 'exponential';
      delay: number;
    };
    removeOnComplete?: boolean;
    removeOnFail?: boolean;
  };
}

export interface JobData {
  taskId: string;
  agentId: string;
  type: string;
  payload: Record<string, any>;
  context: TaskContext;
  priority: AgentPriority;
}

// Workflow Types
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  variables: Record<string, any>;
  settings: WorkflowSettings;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'agent' | 'condition' | 'parallel' | 'delay' | 'webhook';
  agentId?: string;
  config: Record<string, any>;
  dependencies: string[];
  conditions?: WorkflowCondition[];
  onSuccess?: string[];
  onFailure?: string[];
  retry?: RetryPolicy;
}

export interface WorkflowTrigger {
  type: 'schedule' | 'webhook' | 'event' | 'manual';
  config: Record<string, any>;
  enabled: boolean;
}

export interface WorkflowCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: any;
  logicalOperator?: 'and' | 'or';
}

export interface WorkflowSettings {
  maxExecutionTime: number;
  maxRetries: number;
  enableLogging: boolean;
  enableMetrics: boolean;
  notificationSettings: {
    onSuccess: boolean;
    onFailure: boolean;
    channels: string[];
  };
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffType: 'fixed' | 'exponential' | 'linear';
  initialDelay: number;
  maxDelay: number;
  multiplier?: number;
}

// External Service Integration
export interface ServiceConnection {
  id: string;
  name: string;
  type: string;
  config: Record<string, any>;
  credentials: Record<string, string>;
  status: 'active' | 'inactive' | 'error';
  lastConnected?: Date;
  rateLimits?: RateLimitConfig;
}

export interface APICallResult {
  success: boolean;
  statusCode?: number;
  data?: any;
  error?: string;
  duration: number;
  timestamp: Date;
  retryCount?: number;
}