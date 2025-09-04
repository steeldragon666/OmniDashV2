import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  user_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  trigger_type?: string;
  trigger_data?: any;
  context: any;
  result?: any;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  nodes_executed: number;
  nodes_total: number;
}

export interface CreateExecutionData {
  workflow_id: string;
  trigger_type?: string;
  trigger_data?: any;
  context?: any;
  nodes_total?: number;
}

export interface UpdateExecutionData {
  status?: 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  context?: any;
  result?: any;
  error_message?: string;
  completed_at?: string;
  duration_ms?: number;
  nodes_executed?: number;
}

export class ExecutionRepository {
  async create(userId: string, data: CreateExecutionData): Promise<WorkflowExecution> {
    const { data: execution, error } = await supabase
      .from('workflow_executions')
      .insert({
        workflow_id: data.workflow_id,
        user_id: userId,
        status: 'running',
        trigger_type: data.trigger_type,
        trigger_data: data.trigger_data,
        context: data.context || {},
        nodes_executed: 0,
        nodes_total: data.nodes_total || 0
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create execution: ${error.message}`);
    }

    return execution;
  }

  async findById(id: string, userId: string): Promise<WorkflowExecution | null> {
    const { data, error } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to find execution: ${error.message}`);
    }

    return data;
  }

  async findByWorkflowId(
    workflowId: string, 
    userId: string, 
    options?: {
      status?: 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
      limit?: number;
      offset?: number;
    }
  ): Promise<WorkflowExecution[]> {
    let query = supabase
      .from('workflow_executions')
      .select('*')
      .eq('workflow_id', workflowId)
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to find executions: ${error.message}`);
    }

    return data || [];
  }

  async findAll(userId: string, options?: {
    status?: 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
    workflowId?: string;
    limit?: number;
    offset?: number;
  }): Promise<WorkflowExecution[]> {
    let query = supabase
      .from('workflow_executions')
      .select(`
        *,
        workflows (
          name,
          description
        )
      `)
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.workflowId) {
      query = query.eq('workflow_id', options.workflowId);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to find executions: ${error.message}`);
    }

    return data || [];
  }

  async update(id: string, userId: string, data: UpdateExecutionData): Promise<WorkflowExecution> {
    const updateData: any = { ...data };
    
    // Calculate duration if completing
    if (data.status && ['completed', 'failed', 'cancelled'].includes(data.status) && !data.duration_ms) {
      const execution = await this.findById(id, userId);
      if (execution) {
        const startTime = new Date(execution.started_at).getTime();
        const endTime = data.completed_at ? new Date(data.completed_at).getTime() : Date.now();
        updateData.duration_ms = endTime - startTime;
        updateData.completed_at = updateData.completed_at || new Date().toISOString();
      }
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const { data: execution, error } = await supabase
      .from('workflow_executions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update execution: ${error.message}`);
    }

    return execution;
  }

  async cancel(id: string, userId: string): Promise<WorkflowExecution> {
    return this.update(id, userId, {
      status: 'cancelled',
      completed_at: new Date().toISOString()
    });
  }

  async pause(id: string, userId: string): Promise<WorkflowExecution> {
    return this.update(id, userId, {
      status: 'paused'
    });
  }

  async resume(id: string, userId: string): Promise<WorkflowExecution> {
    return this.update(id, userId, {
      status: 'running'
    });
  }

  async getStats(userId: string, timeRange?: {
    startDate: string;
    endDate: string;
  }): Promise<{
    total: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    paused: number;
    successRate: number;
    averageDuration: number;
  }> {
    let query = supabase
      .from('workflow_executions')
      .select('status, duration_ms')
      .eq('user_id', userId);

    if (timeRange) {
      query = query
        .gte('started_at', timeRange.startDate)
        .lte('started_at', timeRange.endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get execution stats: ${error.message}`);
    }

    const stats = {
      total: data.length,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      paused: 0,
      successRate: 0,
      averageDuration: 0
    };

    let totalDuration = 0;
    let durationsCount = 0;

    data.forEach(execution => {
      stats[execution.status as keyof typeof stats]++;
      if (execution.duration_ms) {
        totalDuration += execution.duration_ms;
        durationsCount++;
      }
    });

    stats.successRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
    stats.averageDuration = durationsCount > 0 ? totalDuration / durationsCount : 0;

    return stats;
  }

  async getRecentActivity(userId: string, limit: number = 10): Promise<WorkflowExecution[]> {
    const { data, error } = await supabase
      .from('workflow_executions')
      .select(`
        *,
        workflows (
          name
        )
      `)
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get recent activity: ${error.message}`);
    }

    return data || [];
  }

  async getRunningExecutions(userId: string): Promise<WorkflowExecution[]> {
    return this.findAll(userId, { status: 'running' });
  }

  async cleanup(userId: string, olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { count, error } = await supabase
      .from('workflow_executions')
      .delete()
      .eq('user_id', userId)
      .in('status', ['completed', 'failed', 'cancelled'])
      .lt('completed_at', cutoffDate.toISOString());

    if (error) {
      throw new Error(`Failed to cleanup executions: ${error.message}`);
    }

    return count || 0;
  }

  async getDurationTrend(
    userId: string, 
    workflowId: string, 
    days: number = 7
  ): Promise<Array<{
    date: string;
    averageDuration: number;
    count: number;
  }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('workflow_executions')
      .select('started_at, duration_ms')
      .eq('user_id', userId)
      .eq('workflow_id', workflowId)
      .eq('status', 'completed')
      .gte('started_at', startDate.toISOString())
      .order('started_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get duration trend: ${error.message}`);
    }

    // Group by date
    const grouped = new Map<string, { durations: number[], count: number }>();
    
    data.forEach(execution => {
      const date = new Date(execution.started_at).toISOString().split('T')[0];
      if (!grouped.has(date)) {
        grouped.set(date, { durations: [], count: 0 });
      }
      if (execution.duration_ms) {
        grouped.get(date)!.durations.push(execution.duration_ms);
      }
      grouped.get(date)!.count++;
    });

    return Array.from(grouped.entries()).map(([date, data]) => ({
      date,
      averageDuration: data.durations.length > 0 
        ? data.durations.reduce((sum, d) => sum + d, 0) / data.durations.length 
        : 0,
      count: data.count
    }));
  }
}