/**
 * Core Agent Interface
 * Defines the contract that all agents must implement
 */

import { EventEmitter } from 'events';
import {
  AgentConfig,
  AgentTask,
  AgentStatus,
  AgentMetrics,
  AgentHealth,
  AgentCapability,
  TaskContext,
  AgentError,
  AgentEvent
} from '../types/AgentTypes';

/**
 * Core interface that all agents must implement
 */
export interface IAgent extends EventEmitter {
  // Basic Properties
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly config: AgentConfig;
  readonly capabilities: AgentCapability[];
  
  // Status Management
  status: AgentStatus;
  isRunning: boolean;
  isHealthy: boolean;
  
  // Core Lifecycle Methods
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  shutdown(): Promise<void>;
  
  // Task Processing
  processTask(task: AgentTask): Promise<any>;
  canHandleTask(task: AgentTask): boolean;
  validateTask(task: AgentTask): Promise<boolean>;
  
  // Health and Monitoring
  getHealth(): Promise<AgentHealth>;
  getMetrics(): Promise<AgentMetrics>;
  performHealthCheck(): Promise<boolean>;
  
  // Configuration Management
  updateConfig(config: Partial<AgentConfig>): Promise<void>;
  validateConfig(config: Partial<AgentConfig>): boolean;
  
  // Event Handling
  emitEvent(event: AgentEvent): void;
  
  // Utility Methods
  cleanup(): Promise<void>;
  reset(): Promise<void>;
}

/**
 * Extended interface for agents that support AI capabilities
 */
export interface IAIAgent extends IAgent {
  // AI-specific methods
  generateContent(prompt: string, context?: any): Promise<string>;
  analyzeContent(content: string, criteria?: any): Promise<any>;
  processAITask(task: AgentTask): Promise<any>;
  
  // Token and usage tracking
  getTokenUsage(): Promise<{
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    cost: number;
  }>;
  
  // Model management
  switchModel(modelName: string): Promise<void>;
  getAvailableModels(): Promise<string[]>;
}

/**
 * Interface for agents that can be scheduled
 */
export interface ISchedulableAgent extends IAgent {
  // Scheduling methods
  schedule(cronExpression: string, taskData?: any): Promise<string>;
  unschedule(scheduleId: string): Promise<void>;
  getSchedules(): Promise<any[]>;
  
  // Recurring task management
  createRecurringTask(interval: number, taskData: any): Promise<string>;
  cancelRecurringTask(taskId: string): Promise<void>;
}

/**
 * Interface for agents that integrate with external services
 */
export interface IIntegrationAgent extends IAgent {
  // Connection management
  connect(config: any): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  testConnection(): Promise<boolean>;
  
  // Data synchronization
  syncData(direction: 'in' | 'out' | 'both'): Promise<void>;
  getLastSyncTime(): Promise<Date | null>;
  
  // External API calls
  callExternalAPI(endpoint: string, method: string, data?: any): Promise<any>;
}

/**
 * Interface for workflow coordination agents
 */
export interface IWorkflowAgent extends IAgent {
  // Workflow management
  executeWorkflow(workflowId: string, input?: any): Promise<any>;
  pauseWorkflow(executionId: string): Promise<void>;
  resumeWorkflow(executionId: string): Promise<void>;
  cancelWorkflow(executionId: string): Promise<void>;
  
  // Step coordination
  coordinateStep(stepId: string, context: any): Promise<any>;
  handleStepFailure(stepId: string, error: AgentError): Promise<any>;
  
  // Workflow monitoring
  getWorkflowStatus(executionId: string): Promise<any>;
  getWorkflowHistory(workflowId: string): Promise<any[]>;
}

/**
 * Interface for agents that manage queues
 */
export interface IQueueAgent extends IAgent {
  // Queue management
  enqueue(queueName: string, data: any, options?: any): Promise<string>;
  dequeue(queueName: string): Promise<any>;
  peek(queueName: string): Promise<any>;
  
  // Queue monitoring
  getQueueStats(queueName: string): Promise<any>;
  getQueueLength(queueName: string): Promise<number>;
  clearQueue(queueName: string): Promise<void>;
  
  // Job management
  getJob(jobId: string): Promise<any>;
  cancelJob(jobId: string): Promise<void>;
  retryJob(jobId: string): Promise<void>;
}

/**
 * Interface for content creation agents
 */
export interface IContentAgent extends IAIAgent {
  // Content generation
  generateText(prompt: string, options?: any): Promise<string>;
  generateImage(prompt: string, options?: any): Promise<string>;
  generateVideo(prompt: string, options?: any): Promise<string>;
  
  // Content analysis
  analyzeText(text: string): Promise<any>;
  analyzeSentiment(text: string): Promise<any>;
  extractKeywords(text: string): Promise<string[]>;
  
  // Content optimization
  optimizeForSEO(content: string, keywords: string[]): Promise<string>;
  optimizeForPlatform(content: string, platform: string): Promise<string>;
}

/**
 * Interface for social media agents
 */
export interface ISocialAgent extends IIntegrationAgent {
  // Platform management
  connectPlatform(platform: string, credentials: any): Promise<void>;
  disconnectPlatform(platform: string): Promise<void>;
  getConnectedPlatforms(): Promise<string[]>;
  
  // Content publishing
  publishPost(platform: string, content: any): Promise<string>;
  schedulePost(platform: string, content: any, scheduledTime: Date): Promise<string>;
  deletePost(platform: string, postId: string): Promise<void>;
  
  // Engagement tracking
  getPostMetrics(platform: string, postId: string): Promise<any>;
  getAccountMetrics(platform: string): Promise<any>;
  
  // Content management
  getContentCalendar(): Promise<any[]>;
  updateContentCalendar(posts: any[]): Promise<void>;
}

/**
 * Interface for business lookup agents
 */
export interface IBusinessLookupAgent extends IIntegrationAgent {
  // Business information lookup
  lookupByABN(abn: string): Promise<any>;
  lookupByACN(acn: string): Promise<any>;
  lookupByName(name: string): Promise<any[]>;
  
  // Business verification
  verifyBusiness(identifier: string): Promise<boolean>;
  getBusinessDetails(identifier: string): Promise<any>;
  
  // Search and filtering
  searchBusinesses(criteria: any): Promise<any[]>;
  filterBusinesses(businesses: any[], filters: any): Promise<any[]>;
}