/**
 * N8N Integration Agent
 * Integrates with n8n workflow automation platform for external workflow execution
 */

import { BaseAgent } from '../../core/BaseAgent';
import {
  IIntegrationAgent,
  AgentConfig,
  AgentTask,
  AgentCapability,
  ServiceConnection,
  APICallResult
} from '../../types/AgentTypes';
import axios, { AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';

export interface N8NWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: N8NNode[];
  connections: Record<string, any>;
  settings: Record<string, any>;
  staticData: Record<string, any>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  versionId: string;
}

export interface N8NNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, string>;
  webhookId?: string;
  workflowId?: string;
}

export interface N8NExecution {
  id: string;
  workflowId: string;
  mode: 'manual' | 'trigger' | 'webhook' | 'retry';
  startedAt: string;
  stoppedAt?: string;
  status: 'new' | 'running' | 'success' | 'error' | 'canceled' | 'waiting';
  data?: {
    resultData: {
      runData: Record<string, any[]>;
      lastNodeExecuted: string;
      error?: {
        name: string;
        message: string;
        stack: string;
        node: string;
      };
    };
    executionData?: {
      contextData: Record<string, any>;
      nodeExecutionStack: any[];
      metadata: Record<string, any>;
    };
  };
}

export interface N8NCredentials {
  id: string;
  name: string;
  type: string;
  data: Record<string, any>;
}

export interface N8NWebhook {
  id: string;
  workflowId: string;
  node: string;
  method: string;
  path: string;
  isFullPath: boolean;
  responseCode: number;
  responseMode: string;
  responseData: string;
}

/**
 * N8N workflow automation integration agent
 */
export class N8NIntegrationAgent extends BaseAgent implements IIntegrationAgent {
  private n8nConnection: ServiceConnection | null = null;
  private baseUrl: string = '';
  private apiKey: string = '';
  private webhooks: Map<string, N8NWebhook> = new Map();
  private activeExecutions: Map<string, N8NExecution> = new Map();
  private workflowCache: Map<string, N8NWorkflow> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(config: AgentConfig) {
    super(config);
    this.setupCapabilities();
  }

  // =====================================
  // Agent Lifecycle
  // =====================================

  protected async onInitialize(): Promise<void> {
    await this.setupN8NConnection();
    this.logger.info('N8NIntegrationAgent initialized successfully');
  }

  protected async onStart(): Promise<void> {
    if (await this.testConnection()) {
      await this.loadWorkflows();
      await this.loadWebhooks();
      this.startExecutionPolling();
    } else {
      this.logger.warn('N8N connection test failed, but agent will continue');
    }
    this.logger.info('N8NIntegrationAgent started and ready');
  }

  protected async onStop(): Promise<void> {
    this.stopExecutionPolling();
    await this.cleanup();
    this.logger.info('N8NIntegrationAgent stopped');
  }

  // =====================================
  // Task Processing
  // =====================================

  public canHandleTask(task: AgentTask): boolean {
    const supportedTypes = [
      'execute-workflow',
      'get-workflow',
      'list-workflows',
      'create-workflow',
      'update-workflow',
      'activate-workflow',
      'deactivate-workflow',
      'get-execution',
      'list-executions',
      'stop-execution',
      'retry-execution',
      'get-credentials',
      'create-credentials',
      'update-credentials',
      'test-webhook',
      'sync-workflows',
      'export-workflow',
      'import-workflow'
    ];
    return supportedTypes.includes(task.type);
  }

  protected async executeTask(task: AgentTask): Promise<any> {
    const startTime = Date.now();
    
    try {
      let result: any;

      switch (task.type) {
        case 'execute-workflow':
          result = await this.handleExecuteWorkflow(task);
          break;
        case 'get-workflow':
          result = await this.handleGetWorkflow(task);
          break;
        case 'list-workflows':
          result = await this.handleListWorkflows(task);
          break;
        case 'create-workflow':
          result = await this.handleCreateWorkflow(task);
          break;
        case 'update-workflow':
          result = await this.handleUpdateWorkflow(task);
          break;
        case 'activate-workflow':
          result = await this.handleActivateWorkflow(task);
          break;
        case 'deactivate-workflow':
          result = await this.handleDeactivateWorkflow(task);
          break;
        case 'get-execution':
          result = await this.handleGetExecution(task);
          break;
        case 'list-executions':
          result = await this.handleListExecutions(task);
          break;
        case 'stop-execution':
          result = await this.handleStopExecution(task);
          break;
        case 'retry-execution':
          result = await this.handleRetryExecution(task);
          break;
        case 'get-credentials':
          result = await this.handleGetCredentials(task);
          break;
        case 'create-credentials':
          result = await this.handleCreateCredentials(task);
          break;
        case 'update-credentials':
          result = await this.handleUpdateCredentials(task);
          break;
        case 'test-webhook':
          result = await this.handleTestWebhook(task);
          break;
        case 'sync-workflows':
          result = await this.handleSyncWorkflows(task);
          break;
        case 'export-workflow':
          result = await this.handleExportWorkflow(task);
          break;
        case 'import-workflow':
          result = await this.handleImportWorkflow(task);
          break;
        default:
          throw new Error(`Unsupported task type: ${task.type}`);
      }

      const duration = Date.now() - startTime;
      this.metricsCollector.recordTaskCompletion(task.type, duration, true);
      this.metricsCollector.recordAPICall('n8n', 'API', 200, duration);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsCollector.recordTaskCompletion(task.type, duration, false);
      this.metricsCollector.recordAPICall('n8n', 'API', 500, duration);
      throw error;
    }
  }

  protected async validateTaskPayload(task: AgentTask): Promise<boolean> {
    if (!task.payload) return false;

    switch (task.type) {
      case 'execute-workflow':
        return !!(task.payload.workflowId || task.payload.workflowName);
      case 'get-workflow':
      case 'activate-workflow':
      case 'deactivate-workflow':
        return !!task.payload.workflowId;
      case 'create-workflow':
      case 'update-workflow':
        return !!task.payload.workflow;
      case 'get-execution':
      case 'stop-execution':
      case 'retry-execution':
        return !!task.payload.executionId;
      case 'create-credentials':
      case 'update-credentials':
        return !!(task.payload.credentials && task.payload.type);
      case 'test-webhook':
        return !!task.payload.webhookId;
      case 'export-workflow':
        return !!task.payload.workflowId;
      case 'import-workflow':
        return !!task.payload.workflowData;
      default:
        return true;
    }
  }

  // =====================================
  // IIntegrationAgent Implementation
  // =====================================

  public async connect(config: any): Promise<void> {
    this.baseUrl = config.baseUrl || process.env.N8N_BASE_URL || 'http://localhost:5678';
    this.apiKey = config.apiKey || process.env.N8N_API_KEY || '';
    
    if (!this.baseUrl) {
      throw new Error('N8N base URL is required');
    }

    this.n8nConnection = {
      id: 'n8n-instance',
      name: 'N8N Workflow Automation',
      type: 'rest-api',
      config: { baseUrl: this.baseUrl },
      credentials: { apiKey: this.apiKey },
      status: 'active',
      lastConnected: new Date()
    };
    
    await this.testConnection();
    this.logger.info('Connected to N8N instance');
  }

  public async disconnect(): Promise<void> {
    if (this.n8nConnection) {
      this.n8nConnection.status = 'inactive';
      this.stopExecutionPolling();
      this.n8nConnection = null;
      this.logger.info('Disconnected from N8N instance');
    }
  }

  public isConnected(): boolean {
    return this.n8nConnection?.status === 'active';
  }

  public async testConnection(): Promise<boolean> {
    if (!this.baseUrl) {
      return false;
    }

    try {
      const response = await this.callExternalAPI('workflows', 'GET');
      return response && Array.isArray(response.data);
    } catch (error) {
      this.logger.error('N8N connection test failed:', error);
      return false;
    }
  }

  public async syncData(direction: 'in' | 'out' | 'both'): Promise<void> {
    if (direction === 'out' || direction === 'both') {
      throw new Error('N8N sync does not support outbound data sync');
    }
    
    // Sync workflows and executions from N8N
    await this.loadWorkflows();
    await this.loadWebhooks();
    await this.syncExecutions();
    
    this.logger.info('N8N data sync completed');
  }

  public async getLastSyncTime(): Promise<Date | null> {
    return this.n8nConnection?.lastConnected || null;
  }

  public async callExternalAPI(endpoint: string, method: string, data?: any): Promise<APICallResult> {
    if (!this.isConnected()) {
      throw new Error('Not connected to N8N instance');
    }

    const url = `${this.baseUrl}/api/v1/${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.apiKey) {
      headers['X-N8N-API-KEY'] = this.apiKey;
    }

    const startTime = Date.now();

    try {
      const response = await axios.request({
        url,
        method,
        headers,
        params: method === 'GET' ? data : undefined,
        data: method !== 'GET' ? data : undefined,
        timeout: 30000
      });

      return {
        success: true,
        statusCode: response.status,
        data: response.data,
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  // =====================================
  // N8N Workflow Management
  // =====================================

  public async executeWorkflow(workflowId: string, inputData?: any): Promise<N8NExecution> {
    const result = await this.callExternalAPI(`workflows/${workflowId}/execute`, 'POST', {
      data: inputData || {}
    });

    if (!result.success) {
      throw new Error(`Failed to execute workflow: ${result.error}`);
    }

    const execution = result.data as N8NExecution;
    this.activeExecutions.set(execution.id, execution);
    
    return execution;
  }

  public async getWorkflow(workflowId: string): Promise<N8NWorkflow | null> {
    // Check cache first
    const cached = this.workflowCache.get(workflowId);
    if (cached) {
      return cached;
    }

    const result = await this.callExternalAPI(`workflows/${workflowId}`, 'GET');
    
    if (!result.success) {
      this.logger.error(`Failed to get workflow ${workflowId}:`, result.error);
      return null;
    }

    const workflow = result.data as N8NWorkflow;
    this.workflowCache.set(workflowId, workflow);
    
    return workflow;
  }

  public async listWorkflows(): Promise<N8NWorkflow[]> {
    const result = await this.callExternalAPI('workflows', 'GET');
    
    if (!result.success) {
      throw new Error(`Failed to list workflows: ${result.error}`);
    }

    const workflows = result.data.data as N8NWorkflow[];
    
    // Update cache
    workflows.forEach(workflow => {
      this.workflowCache.set(workflow.id, workflow);
    });
    
    return workflows;
  }

  public async createWorkflow(workflow: Partial<N8NWorkflow>): Promise<N8NWorkflow> {
    const result = await this.callExternalAPI('workflows', 'POST', workflow);
    
    if (!result.success) {
      throw new Error(`Failed to create workflow: ${result.error}`);
    }

    const createdWorkflow = result.data as N8NWorkflow;
    this.workflowCache.set(createdWorkflow.id, createdWorkflow);
    
    return createdWorkflow;
  }

  public async updateWorkflow(workflowId: string, updates: Partial<N8NWorkflow>): Promise<N8NWorkflow> {
    const result = await this.callExternalAPI(`workflows/${workflowId}`, 'PUT', updates);
    
    if (!result.success) {
      throw new Error(`Failed to update workflow: ${result.error}`);
    }

    const updatedWorkflow = result.data as N8NWorkflow;
    this.workflowCache.set(workflowId, updatedWorkflow);
    
    return updatedWorkflow;
  }

  public async activateWorkflow(workflowId: string): Promise<void> {
    const result = await this.callExternalAPI(`workflows/${workflowId}/activate`, 'POST');
    
    if (!result.success) {
      throw new Error(`Failed to activate workflow: ${result.error}`);
    }

    // Update cache
    const workflow = this.workflowCache.get(workflowId);
    if (workflow) {
      workflow.active = true;
    }
  }

  public async deactivateWorkflow(workflowId: string): Promise<void> {
    const result = await this.callExternalAPI(`workflows/${workflowId}/deactivate`, 'POST');
    
    if (!result.success) {
      throw new Error(`Failed to deactivate workflow: ${result.error}`);
    }

    // Update cache
    const workflow = this.workflowCache.get(workflowId);
    if (workflow) {
      workflow.active = false;
    }
  }

  // =====================================
  // N8N Execution Management
  // =====================================

  public async getExecution(executionId: string): Promise<N8NExecution | null> {
    const result = await this.callExternalAPI(`executions/${executionId}`, 'GET');
    
    if (!result.success) {
      this.logger.error(`Failed to get execution ${executionId}:`, result.error);
      return null;
    }

    const execution = result.data as N8NExecution;
    this.activeExecutions.set(executionId, execution);
    
    return execution;
  }

  public async listExecutions(workflowId?: string, limit: number = 50): Promise<N8NExecution[]> {
    const params: any = { limit };
    if (workflowId) {
      params.workflowId = workflowId;
    }

    const result = await this.callExternalAPI('executions', 'GET', params);
    
    if (!result.success) {
      throw new Error(`Failed to list executions: ${result.error}`);
    }

    return result.data.data as N8NExecution[];
  }

  public async stopExecution(executionId: string): Promise<void> {
    const result = await this.callExternalAPI(`executions/${executionId}/stop`, 'POST');
    
    if (!result.success) {
      throw new Error(`Failed to stop execution: ${result.error}`);
    }

    // Update local tracking
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      execution.status = 'canceled';
    }
  }

  public async retryExecution(executionId: string): Promise<N8NExecution> {
    const result = await this.callExternalAPI(`executions/${executionId}/retry`, 'POST');
    
    if (!result.success) {
      throw new Error(`Failed to retry execution: ${result.error}`);
    }

    const newExecution = result.data as N8NExecution;
    this.activeExecutions.set(newExecution.id, newExecution);
    
    return newExecution;
  }

  // =====================================
  // N8N Credentials Management
  // =====================================

  public async getCredentials(credentialsId: string): Promise<N8NCredentials | null> {
    const result = await this.callExternalAPI(`credentials/${credentialsId}`, 'GET');
    
    if (!result.success) {
      this.logger.error(`Failed to get credentials ${credentialsId}:`, result.error);
      return null;
    }

    return result.data as N8NCredentials;
  }

  public async createCredentials(credentials: Partial<N8NCredentials>): Promise<N8NCredentials> {
    const result = await this.callExternalAPI('credentials', 'POST', credentials);
    
    if (!result.success) {
      throw new Error(`Failed to create credentials: ${result.error}`);
    }

    return result.data as N8NCredentials;
  }

  public async updateCredentials(credentialsId: string, updates: Partial<N8NCredentials>): Promise<N8NCredentials> {
    const result = await this.callExternalAPI(`credentials/${credentialsId}`, 'PUT', updates);
    
    if (!result.success) {
      throw new Error(`Failed to update credentials: ${result.error}`);
    }

    return result.data as N8NCredentials;
  }

  // =====================================
  // Task Handlers
  // =====================================

  private async handleExecuteWorkflow(task: AgentTask): Promise<N8NExecution> {
    const { workflowId, workflowName, inputData, waitForCompletion = false } = task.payload;
    
    let targetWorkflowId = workflowId;
    
    if (!targetWorkflowId && workflowName) {
      // Find workflow by name
      const workflows = await this.listWorkflows();
      const workflow = workflows.find(w => w.name === workflowName);
      if (!workflow) {
        throw new Error(`Workflow with name "${workflowName}" not found`);
      }
      targetWorkflowId = workflow.id;
    }

    if (!targetWorkflowId) {
      throw new Error('Workflow ID or name is required');
    }

    const execution = await this.executeWorkflow(targetWorkflowId, inputData);
    
    // If waiting for completion, poll for result
    if (waitForCompletion) {
      return await this.waitForExecution(execution.id);
    }
    
    return execution;
  }

  private async handleGetWorkflow(task: AgentTask): Promise<N8NWorkflow | null> {
    const { workflowId } = task.payload;
    return await this.getWorkflow(workflowId);
  }

  private async handleListWorkflows(task: AgentTask): Promise<N8NWorkflow[]> {
    const { activeOnly = false, tags } = task.payload;
    let workflows = await this.listWorkflows();
    
    if (activeOnly) {
      workflows = workflows.filter(w => w.active);
    }
    
    if (tags && Array.isArray(tags)) {
      workflows = workflows.filter(w => 
        tags.some(tag => w.tags?.includes(tag))
      );
    }
    
    return workflows;
  }

  private async handleCreateWorkflow(task: AgentTask): Promise<N8NWorkflow> {
    const { workflow } = task.payload;
    return await this.createWorkflow(workflow);
  }

  private async handleUpdateWorkflow(task: AgentTask): Promise<N8NWorkflow> {
    const { workflowId, workflow } = task.payload;
    return await this.updateWorkflow(workflowId, workflow);
  }

  private async handleActivateWorkflow(task: AgentTask): Promise<void> {
    const { workflowId } = task.payload;
    await this.activateWorkflow(workflowId);
  }

  private async handleDeactivateWorkflow(task: AgentTask): Promise<void> {
    const { workflowId } = task.payload;
    await this.deactivateWorkflow(workflowId);
  }

  private async handleGetExecution(task: AgentTask): Promise<N8NExecution | null> {
    const { executionId } = task.payload;
    return await this.getExecution(executionId);
  }

  private async handleListExecutions(task: AgentTask): Promise<N8NExecution[]> {
    const { workflowId, limit = 50, status } = task.payload;
    let executions = await this.listExecutions(workflowId, limit);
    
    if (status) {
      executions = executions.filter(e => e.status === status);
    }
    
    return executions;
  }

  private async handleStopExecution(task: AgentTask): Promise<void> {
    const { executionId } = task.payload;
    await this.stopExecution(executionId);
  }

  private async handleRetryExecution(task: AgentTask): Promise<N8NExecution> {
    const { executionId } = task.payload;
    return await this.retryExecution(executionId);
  }

  private async handleGetCredentials(task: AgentTask): Promise<N8NCredentials | null> {
    const { credentialsId } = task.payload;
    return await this.getCredentials(credentialsId);
  }

  private async handleCreateCredentials(task: AgentTask): Promise<N8NCredentials> {
    const { credentials, type } = task.payload;
    return await this.createCredentials({ ...credentials, type });
  }

  private async handleUpdateCredentials(task: AgentTask): Promise<N8NCredentials> {
    const { credentialsId, credentials } = task.payload;
    return await this.updateCredentials(credentialsId, credentials);
  }

  private async handleTestWebhook(task: AgentTask): Promise<any> {
    const { webhookId, testData } = task.payload;
    
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    // Send test data to webhook
    const webhookUrl = `${this.baseUrl}/${webhook.path}`;
    const response = await axios.request({
      url: webhookUrl,
      method: webhook.method,
      data: testData,
      timeout: 30000
    });

    return response.data;
  }

  private async handleSyncWorkflows(task: AgentTask): Promise<any> {
    const { direction = 'in' } = task.payload;
    await this.syncData(direction);
    
    return {
      success: true,
      workflowsLoaded: this.workflowCache.size,
      webhooksLoaded: this.webhooks.size,
      timestamp: new Date()
    };
  }

  private async handleExportWorkflow(task: AgentTask): Promise<any> {
    const { workflowId, format = 'json' } = task.payload;
    
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Export workflow in specified format
    switch (format) {
      case 'json':
        return workflow;
      case 'n8n':
        // N8N specific export format
        return {
          name: workflow.name,
          nodes: workflow.nodes,
          connections: workflow.connections,
          active: workflow.active,
          settings: workflow.settings,
          staticData: workflow.staticData,
          tags: workflow.tags,
          meta: {
            exportedAt: new Date().toISOString(),
            exportedBy: 'omnidash-n8n-agent'
          }
        };
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private async handleImportWorkflow(task: AgentTask): Promise<N8NWorkflow> {
    const { workflowData, name, activate = false } = task.payload;
    
    // Prepare workflow data for import
    const workflowToImport: Partial<N8NWorkflow> = {
      name: name || workflowData.name,
      nodes: workflowData.nodes,
      connections: workflowData.connections,
      settings: workflowData.settings || {},
      staticData: workflowData.staticData || {},
      tags: workflowData.tags || [],
      active: false // Always import as inactive initially
    };

    const createdWorkflow = await this.createWorkflow(workflowToImport);
    
    if (activate) {
      await this.activateWorkflow(createdWorkflow.id);
    }
    
    return createdWorkflow;
  }

  // =====================================
  // Helper Methods
  // =====================================

  private async waitForExecution(executionId: string, timeout: number = 300000): Promise<N8NExecution> {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds
    
    while (Date.now() - startTime < timeout) {
      const execution = await this.getExecution(executionId);
      
      if (execution && ['success', 'error', 'canceled'].includes(execution.status)) {
        return execution;
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error(`Execution ${executionId} did not complete within ${timeout}ms`);
  }

  private async loadWorkflows(): Promise<void> {
    try {
      const workflows = await this.listWorkflows();
      this.logger.info(`Loaded ${workflows.length} workflows from N8N`);
    } catch (error) {
      this.logger.error('Failed to load workflows from N8N:', error);
    }
  }

  private async loadWebhooks(): Promise<void> {
    try {
      // N8N doesn't have a direct webhooks API endpoint
      // We'd need to parse workflows to find webhook nodes
      const workflows = await this.listWorkflows();
      
      for (const workflow of workflows) {
        const webhookNodes = workflow.nodes.filter(node => 
          node.type === 'n8n-nodes-base.webhook'
        );
        
        for (const node of webhookNodes) {
          const webhook: N8NWebhook = {
            id: node.id,
            workflowId: workflow.id,
            node: node.name,
            method: node.parameters.httpMethod || 'GET',
            path: node.parameters.path || '',
            isFullPath: node.parameters.isFullPath || false,
            responseCode: node.parameters.responseCode || 200,
            responseMode: node.parameters.responseMode || 'onReceived',
            responseData: node.parameters.responseData || 'allEntries'
          };
          
          this.webhooks.set(webhook.id, webhook);
        }
      }
      
      this.logger.info(`Loaded ${this.webhooks.size} webhooks from N8N`);
    } catch (error) {
      this.logger.error('Failed to load webhooks from N8N:', error);
    }
  }

  private async syncExecutions(): Promise<void> {
    try {
      const executions = await this.listExecutions(undefined, 100);
      
      // Update active executions
      for (const execution of executions) {
        if (['new', 'running', 'waiting'].includes(execution.status)) {
          this.activeExecutions.set(execution.id, execution);
        }
      }
      
      this.logger.info(`Synced ${executions.length} executions from N8N`);
    } catch (error) {
      this.logger.error('Failed to sync executions from N8N:', error);
    }
  }

  private startExecutionPolling(): void {
    if (this.pollInterval) {
      return;
    }

    this.pollInterval = setInterval(async () => {
      try {
        await this.syncExecutions();
      } catch (error) {
        this.logger.error('Error during execution polling:', error);
      }
    }, 30000); // Poll every 30 seconds
  }

  private stopExecutionPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // =====================================
  // Initialization Methods
  // =====================================

  private async setupN8NConnection(): Promise<void> {
    const baseUrl = process.env.N8N_BASE_URL;
    const apiKey = process.env.N8N_API_KEY;
    
    if (baseUrl) {
      await this.connect({ baseUrl, apiKey });
    } else {
      this.logger.warn('N8N_BASE_URL not provided. Agent will run in limited mode.');
    }
  }

  private setupCapabilities(): void {
    this.capabilities.push(
      {
        name: 'n8n-workflow-execution',
        version: '1.0.0',
        description: 'Execute N8N workflows programmatically',
        inputSchema: {},
        outputSchema: {},
        requirements: ['N8N API access'],
        limitations: ['N8N instance must be accessible']
      },
      {
        name: 'n8n-workflow-management',
        version: '1.0.0',
        description: 'Create, update, and manage N8N workflows',
        inputSchema: {},
        outputSchema: {},
        requirements: ['N8N API access with write permissions'],
        limitations: ['Limited by N8N API capabilities']
      },
      {
        name: 'n8n-execution-monitoring',
        version: '1.0.0',
        description: 'Monitor and manage N8N workflow executions',
        inputSchema: {},
        outputSchema: {},
        requirements: ['N8N API access'],
        limitations: ['Real-time monitoring limited by polling frequency']
      },
      {
        name: 'n8n-webhook-integration',
        version: '1.0.0',
        description: 'Integrate with N8N webhooks',
        inputSchema: {},
        outputSchema: {},
        requirements: ['N8N instance with webhook nodes'],
        limitations: ['Webhook discovery limited to workflow parsing']
      }
    );
  }

  protected async getCustomMetrics(): Promise<Record<string, number>> {
    return {
      'n8n.workflows_cached': this.workflowCache.size,
      'n8n.webhooks_loaded': this.webhooks.size,
      'n8n.active_executions': this.activeExecutions.size,
      'n8n.connection_status': this.isConnected() ? 1 : 0,
      'n8n.api_calls': this.metricsCollector.getCounterValue('api.calls') || 0
    };
  }

  public async cleanup(): Promise<void> {
    this.stopExecutionPolling();
    this.workflowCache.clear();
    this.webhooks.clear();
    this.activeExecutions.clear();
    await super.cleanup();
  }
}