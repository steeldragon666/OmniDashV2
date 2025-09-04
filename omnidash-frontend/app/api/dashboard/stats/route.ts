import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth/AuthManager';
import { WorkflowRepository } from '../../../lib/database/repositories/WorkflowRepository';
import { ExecutionRepository } from '../../../lib/database/repositories/ExecutionRepository';
import { SocialAccountRepository } from '../../../lib/database/repositories/SocialAccountRepository';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session as any).userId || session.user.id;

    // Initialize repositories
    const workflowRepo = new WorkflowRepository();
    const executionRepo = new ExecutionRepository();
    const socialAccountRepo = new SocialAccountRepository();

    // Fetch stats in parallel
    const [
      workflowStats,
      executionStats,
      socialAccountStats,
      recentExecutions
    ] = await Promise.all([
      workflowRepo.getStats(userId),
      executionRepo.getStats(userId),
      socialAccountRepo.getStats(userId),
      executionRepo.getRecentActivity(userId, 10)
    ]);

    // Transform recent executions to activity format
    const recentActivity = recentExecutions.map(execution => ({
      id: execution.id,
      type: 'workflow_executed' as const,
      title: `Workflow Executed`,
      description: `Status: ${execution.status}`,
      timestamp: execution.started_at,
      status: execution.status === 'completed' ? 'success' as const : 
              execution.status === 'failed' ? 'error' as const :
              execution.status === 'running' ? 'info' as const : 'warning' as const
    }));

    const stats = {
      workflows: workflowStats,
      executions: executionStats,
      socialAccounts: {
        total: socialAccountStats.total,
        byPlatform: socialAccountStats.byPlatform,
        active: socialAccountStats.byStatus.active || 0
      },
      recentActivity
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}