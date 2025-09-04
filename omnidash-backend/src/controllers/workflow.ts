import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { WorkflowService, WorkflowDefinition } from '@/services/workflow';

const prisma = new PrismaClient();
const workflowService = new WorkflowService();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class WorkflowController {
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const workflowData: WorkflowDefinition = req.body;

      const workflowId = await workflowService.createWorkflow(brandId, workflowData);
      
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          logs: {
            orderBy: { executedAt: 'desc' },
            take: 5
          }
        }
      });

      res.status(201).json({ workflow });
    } catch (error) {
      console.error('Create workflow error:', error);
      res.status(500).json({
        error: 'Failed to create workflow'
      });
    }
  }

  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { status, isActive } = req.query;

      const where: any = { brandId };
      
      if (status) {
        where.status = status;
      }
      
      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }

      const workflows = await prisma.workflow.findMany({
        where,
        include: {
          logs: {
            orderBy: { executedAt: 'desc' },
            take: 1
          },
          _count: {
            select: {
              logs: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Add status information
      const workflowsWithStatus = await Promise.all(
        workflows.map(async (workflow) => {
          try {
            const status = await workflowService.getWorkflowStatus(workflow.id);
            return {
              ...workflow,
              statusInfo: status
            };
          } catch (error) {
            return {
              ...workflow,
              statusInfo: {
                status: 'error',
                lastExecution: null,
                successRate: 0,
                totalExecutions: 0
              }
            };
          }
        })
      );

      res.json({ workflows: workflowsWithStatus });
    } catch (error) {
      console.error('List workflows error:', error);
      res.status(500).json({
        error: 'Failed to fetch workflows'
      });
    }
  }

  async get(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;

      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          logs: {
            orderBy: { executedAt: 'desc' },
            take: 20
          }
        }
      });

      if (!workflow) {
        res.status(404).json({
          error: 'Workflow not found'
        });
        return;
      }

      // Get detailed status
      const statusInfo = await workflowService.getWorkflowStatus(workflowId);

      res.json({ 
        workflow: {
          ...workflow,
          statusInfo
        }
      });
    } catch (error) {
      console.error('Get workflow error:', error);
      res.status(500).json({
        error: 'Failed to fetch workflow'
      });
    }
  }

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const updates: Partial<WorkflowDefinition> = req.body;

      await workflowService.updateWorkflow(workflowId, updates);

      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      });

      res.json({ workflow });
    } catch (error) {
      console.error('Update workflow error:', error);
      res.status(500).json({
        error: 'Failed to update workflow'
      });
    }
  }

  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;

      await workflowService.deleteWorkflow(workflowId);

      res.json({ message: 'Workflow deleted successfully' });
    } catch (error) {
      console.error('Delete workflow error:', error);
      res.status(500).json({
        error: 'Failed to delete workflow'
      });
    }
  }

  async execute(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const inputData = req.body;

      const executionId = await workflowService.executeWorkflow(workflowId, inputData);

      res.json({ 
        message: 'Workflow execution started',
        executionId
      });
    } catch (error) {
      console.error('Execute workflow error:', error);
      res.status(500).json({
        error: 'Failed to execute workflow'
      });
    }
  }

  async toggleStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const { isActive } = req.body;

      await workflowService.updateWorkflow(workflowId, { isActive });

      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        select: {
          id: true,
          name: true,
          isActive: true,
          status: true
        }
      });

      res.json({ workflow });
    } catch (error) {
      console.error('Toggle workflow status error:', error);
      res.status(500).json({
        error: 'Failed to toggle workflow status'
      });
    }
  }

  async getExecutionHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const [logs, total] = await Promise.all([
        prisma.automationLog.findMany({
          where: { workflowId },
          orderBy: { executedAt: 'desc' },
          skip,
          take,
          include: {
            workflow: {
              select: {
                name: true
              }
            }
          }
        }),
        prisma.automationLog.count({
          where: { workflowId }
        })
      ]);

      res.json({
        logs,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      });
    } catch (error) {
      console.error('Get execution history error:', error);
      res.status(500).json({
        error: 'Failed to fetch execution history'
      });
    }
  }

  async getTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const templates = await workflowService.getWorkflowTemplates();
      res.json({ templates });
    } catch (error) {
      console.error('Get workflow templates error:', error);
      res.status(500).json({
        error: 'Failed to fetch workflow templates'
      });
    }
  }

  async createFromTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { templateId, customizations = {} } = req.body;

      const templates = await workflowService.getWorkflowTemplates();
      const template = templates.find(t => t.id === templateId);

      if (!template) {
        res.status(404).json({
          error: 'Template not found'
        });
        return;
      }

      // Apply customizations to template
      const workflowData: WorkflowDefinition = {
        name: customizations.name || template.name,
        description: customizations.description || template.description,
        trigger: customizations.trigger || template.trigger,
        actions: customizations.actions || template.actions,
        isActive: customizations.isActive !== undefined ? customizations.isActive : false
      };

      const workflowId = await workflowService.createWorkflow(brandId, workflowData);
      
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      });

      res.status(201).json({ workflow });
    } catch (error) {
      console.error('Create workflow from template error:', error);
      res.status(500).json({
        error: 'Failed to create workflow from template'
      });
    }
  }

  async getBrandWorkflowStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { days = 30 } = req.query;

      const daysBack = parseInt(days as string);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Get workflow counts and statistics
      const [
        totalWorkflows,
        activeWorkflows,
        recentExecutions,
        successfulExecutions,
        failedExecutions
      ] = await Promise.all([
        prisma.workflow.count({
          where: { brandId }
        }),
        prisma.workflow.count({
          where: { brandId, isActive: true }
        }),
        prisma.automationLog.count({
          where: {
            workflow: { brandId },
            executedAt: { gte: startDate }
          }
        }),
        prisma.automationLog.count({
          where: {
            workflow: { brandId },
            status: 'success',
            executedAt: { gte: startDate }
          }
        }),
        prisma.automationLog.count({
          where: {
            workflow: { brandId },
            status: 'failure',
            executedAt: { gte: startDate }
          }
        })
      ]);

      const successRate = recentExecutions > 0 
        ? (successfulExecutions / recentExecutions) * 100 
        : 0;

      // Get execution trends (last 7 days)
      const trendData = await prisma.automationLog.groupBy({
        by: ['executedAt'],
        where: {
          workflow: { brandId },
          executedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        _count: {
          id: true
        }
      });

      const stats = {
        totals: {
          workflows: totalWorkflows,
          activeWorkflows,
          recentExecutions,
          successfulExecutions,
          failedExecutions
        },
        metrics: {
          successRate: parseFloat(successRate.toFixed(2)),
          avgExecutionsPerDay: parseFloat((recentExecutions / daysBack).toFixed(2))
        },
        trends: trendData.map(item => ({
          date: item.executedAt,
          executions: item._count.id
        }))
      };

      res.json({ stats });
    } catch (error) {
      console.error('Get brand workflow stats error:', error);
      res.status(500).json({
        error: 'Failed to fetch workflow statistics'
      });
    }
  }
}