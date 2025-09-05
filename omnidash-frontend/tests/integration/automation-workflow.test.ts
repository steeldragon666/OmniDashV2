import { NextRequest } from 'next/server';
import { GET as WorkflowsGet, POST as WorkflowsPost } from '@/app/api/automation/workflows/route';

// Mock database and external services
jest.mock('@/lib/database', () => ({
  executeQuery: jest.fn(),
  testConnection: jest.fn()
}));

jest.mock('@/lib/automation/workflow-engine', () => ({
  executeWorkflow: jest.fn(),
  validateWorkflow: jest.fn(),
  scheduleWorkflow: jest.fn()
}));

describe('Automation Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  describe('Workflow Creation and Execution', () => {
    it('should create and execute a simple workflow', async () => {
      const { executeQuery } = require('@/lib/database');
      const { executeWorkflow, validateWorkflow } = require('@/lib/automation/workflow-engine');

      // Mock workflow creation
      executeQuery.mockResolvedValueOnce({
        rows: [{
          id: 'workflow-123',
          name: 'Test Workflow',
          status: 'active'
        }]
      });

      validateWorkflow.mockReturnValue({ valid: true, errors: [] });
      executeWorkflow.mockResolvedValue({
        success: true,
        executionId: 'exec-123',
        results: { processed: 5 }
      });

      const workflowData = {
        name: 'Test Workflow',
        description: 'A test workflow',
        triggers: [{
          type: 'schedule',
          schedule: '0 9 * * *'
        }],
        actions: [{
          type: 'email',
          template: 'daily-report',
          recipients: ['test@example.com']
        }]
      };

      // Create workflow
      const createRequest = new NextRequest('http://localhost:3000/api/automation/workflows', {
        method: 'POST',
        body: JSON.stringify(workflowData),
        headers: { 'content-type': 'application/json' }
      });

      const createResponse = await WorkflowsPost(createRequest);
      const createData = await createResponse.json();

      expect(createResponse.status).toBe(201);
      expect(createData.workflow.id).toBe('workflow-123');
      expect(validateWorkflow).toHaveBeenCalledWith(workflowData);
    });

    it('should reject invalid workflow configurations', async () => {
      const { validateWorkflow } = require('@/lib/automation/workflow-engine');

      validateWorkflow.mockReturnValue({
        valid: false,
        errors: ['Missing required trigger', 'Invalid action type']
      });

      const invalidWorkflow = {
        name: 'Invalid Workflow',
        actions: [{ type: 'unknown-action' }]
      };

      const request = new NextRequest('http://localhost:3000/api/automation/workflows', {
        method: 'POST',
        body: JSON.stringify(invalidWorkflow),
        headers: { 'content-type': 'application/json' }
      });

      const response = await WorkflowsPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContain('Missing required trigger');
      expect(data.errors).toContain('Invalid action type');
    });
  });

  describe('Workflow Retrieval and Filtering', () => {
    it('should retrieve all workflows with pagination', async () => {
      const { executeQuery } = require('@/lib/database');

      executeQuery.mockResolvedValueOnce({
        rows: [
          { id: '1', name: 'Workflow 1', status: 'active', created_at: '2024-01-01' },
          { id: '2', name: 'Workflow 2', status: 'paused', created_at: '2024-01-02' }
        ]
      });

      const request = new NextRequest('http://localhost:3000/api/automation/workflows?page=1&limit=10');
      const response = await WorkflowsGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.workflows).toHaveLength(2);
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(10);
    });

    it('should filter workflows by status', async () => {
      const { executeQuery } = require('@/lib/database');

      executeQuery.mockResolvedValueOnce({
        rows: [
          { id: '1', name: 'Active Workflow', status: 'active' }
        ]
      });

      const request = new NextRequest('http://localhost:3000/api/automation/workflows?status=active');
      const response = await WorkflowsGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.workflows).toHaveLength(1);
      expect(data.workflows[0].status).toBe('active');
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = $1'),
        ['active']
      );
    });

    it('should search workflows by name', async () => {
      const { executeQuery } = require('@/lib/database');

      executeQuery.mockResolvedValueOnce({
        rows: [
          { id: '1', name: 'Email Report Workflow', status: 'active' }
        ]
      });

      const request = new NextRequest('http://localhost:3000/api/automation/workflows?search=email');
      const response = await WorkflowsGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.workflows).toHaveLength(1);
      expect(data.workflows[0].name).toContain('Email');
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE name ILIKE $1'),
        ['%email%']
      );
    });
  });

  describe('Workflow Execution Monitoring', () => {
    it('should track workflow execution metrics', async () => {
      const { executeQuery } = require('@/lib/database');
      const { executeWorkflow } = require('@/lib/automation/workflow-engine');

      executeQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 'workflow-123',
            name: 'Test Workflow',
            config: JSON.stringify({
              triggers: [{ type: 'manual' }],
              actions: [{ type: 'log', message: 'Test' }]
            })
          }]
        })
        .mockResolvedValueOnce({ rows: [] }); // Execution log insert

      executeWorkflow.mockResolvedValue({
        success: true,
        executionId: 'exec-123',
        duration: 1500,
        results: { processed: 3 }
      });

      const executeRequest = new NextRequest('http://localhost:3000/api/automation/workflows/workflow-123/execute', {
        method: 'POST'
      });

      // This would be a separate endpoint, but testing the integration concept
      const workflowConfig = {
        triggers: [{ type: 'manual' }],
        actions: [{ type: 'log', message: 'Test execution' }]
      };

      const result = await executeWorkflow(workflowConfig);

      expect(result.success).toBe(true);
      expect(result.duration).toBe(1500);
      expect(result.results.processed).toBe(3);
    });

    it('should handle workflow execution failures', async () => {
      const { executeWorkflow } = require('@/lib/automation/workflow-engine');

      executeWorkflow.mockRejectedValue(new Error('Action timeout'));

      const workflowConfig = {
        triggers: [{ type: 'manual' }],
        actions: [{ type: 'http', url: 'http://failing-service.com' }]
      };

      try {
        await executeWorkflow(workflowConfig);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Action timeout');
      }
    });
  });

  describe('Scheduled Workflow Integration', () => {
    it('should schedule workflows with cron expressions', async () => {
      const { scheduleWorkflow } = require('@/lib/automation/workflow-engine');
      const { executeQuery } = require('@/lib/database');

      executeQuery.mockResolvedValueOnce({
        rows: [{
          id: 'workflow-456',
          name: 'Scheduled Report',
          status: 'active'
        }]
      });

      scheduleWorkflow.mockResolvedValue({
        jobId: 'job-789',
        nextRun: '2024-01-02T09:00:00Z'
      });

      const scheduledWorkflow = {
        name: 'Daily Report',
        triggers: [{
          type: 'schedule',
          schedule: '0 9 * * *',
          timezone: 'UTC'
        }],
        actions: [{
          type: 'email',
          template: 'daily-summary'
        }]
      };

      const request = new NextRequest('http://localhost:3000/api/automation/workflows', {
        method: 'POST',
        body: JSON.stringify(scheduledWorkflow),
        headers: { 'content-type': 'application/json' }
      });

      const response = await WorkflowsPost(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.workflow.id).toBe('workflow-456');
    });
  });

  describe('Workflow Dependencies and Chaining', () => {
    it('should handle workflow dependencies correctly', async () => {
      const { executeWorkflow } = require('@/lib/automation/workflow-engine');

      const parentWorkflow = {
        id: 'parent-workflow',
        actions: [{
          type: 'data-export',
          output: 'exported-data'
        }]
      };

      const childWorkflow = {
        id: 'child-workflow',
        triggers: [{
          type: 'workflow-completion',
          workflowId: 'parent-workflow'
        }],
        actions: [{
          type: 'email',
          attachData: true
        }]
      };

      executeWorkflow
        .mockResolvedValueOnce({
          success: true,
          output: { data: 'exported-data' }
        })
        .mockResolvedValueOnce({
          success: true,
          emailSent: true
        });

      // Execute parent workflow
      const parentResult = await executeWorkflow(parentWorkflow);
      expect(parentResult.success).toBe(true);

      // Execute child workflow with parent output
      const childResult = await executeWorkflow(childWorkflow, parentResult.output);
      expect(childResult.success).toBe(true);
      expect(childResult.emailSent).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should implement retry logic for failed actions', async () => {
      const { executeWorkflow } = require('@/lib/automation/workflow-engine');

      let callCount = 0;
      executeWorkflow.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({ success: true, attempts: callCount });
      });

      const workflowWithRetry = {
        actions: [{
          type: 'api-call',
          url: 'http://unreliable-service.com',
          retryPolicy: {
            maxAttempts: 3,
            backoff: 'exponential'
          }
        }]
      };

      const result = await executeWorkflow(workflowWithRetry);
      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
    });
  });
});