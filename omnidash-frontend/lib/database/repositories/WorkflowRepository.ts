import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface Workflow {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  definition: any;
  status: 'draft' | 'active' | 'paused' | 'archived';
  version: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  last_run_at?: string;
  run_count: number;
}

export interface CreateWorkflowData {
  name: string;
  description?: string;
  definition: any;
  status?: 'draft' | 'active' | 'paused' | 'archived';
  version?: string;
  tags?: string[];
}

export interface UpdateWorkflowData {
  name?: string;
  description?: string;
  definition?: any;
  status?: 'draft' | 'active' | 'paused' | 'archived';
  version?: string;
  tags?: string[];
}

export class WorkflowRepository {
  async create(userId: string, data: CreateWorkflowData): Promise<Workflow> {
    const { data: workflow, error } = await supabase
      .from('workflows')
      .insert({
        user_id: userId,
        name: data.name,
        description: data.description,
        definition: data.definition,
        status: data.status || 'draft',
        version: data.version || '1.0.0',
        tags: data.tags || []
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create workflow: ${error.message}`);
    }

    return workflow;
  }

  async findById(id: string, userId: string): Promise<Workflow | null> {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to find workflow: ${error.message}`);
    }

    return data;
  }

  async findAll(userId: string, options?: {
    status?: 'draft' | 'active' | 'paused' | 'archived';
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<Workflow[]> {
    let query = supabase
      .from('workflows')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.tags && options.tags.length > 0) {
      query = query.overlaps('tags', options.tags);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to find workflows: ${error.message}`);
    }

    return data || [];
  }

  async update(id: string, userId: string, data: UpdateWorkflowData): Promise<Workflow> {
    const updateData: any = { ...data };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const { data: workflow, error } = await supabase
      .from('workflows')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update workflow: ${error.message}`);
    }

    return workflow;
  }

  async delete(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete workflow: ${error.message}`);
    }
  }

  async incrementRunCount(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('workflows')
      .update({
        run_count: supabase.sql`run_count + 1`,
        last_run_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to increment run count: ${error.message}`);
    }
  }

  async findByTags(userId: string, tags: string[]): Promise<Workflow[]> {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('user_id', userId)
      .overlaps('tags', tags)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find workflows by tags: ${error.message}`);
    }

    return data || [];
  }

  async getStats(userId: string): Promise<{
    total: number;
    active: number;
    draft: number;
    paused: number;
    archived: number;
  }> {
    const { data, error } = await supabase
      .from('workflows')
      .select('status')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to get workflow stats: ${error.message}`);
    }

    const stats = {
      total: data.length,
      active: 0,
      draft: 0,
      paused: 0,
      archived: 0
    };

    data.forEach(workflow => {
      stats[workflow.status as keyof typeof stats]++;
    });

    return stats;
  }

  async search(userId: string, query: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<Workflow[]> {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('user_id', userId)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('updated_at', { ascending: false })
      .limit(options?.limit || 10)
      .range(
        options?.offset || 0,
        (options?.offset || 0) + (options?.limit || 10) - 1
      );

    if (error) {
      throw new Error(`Failed to search workflows: ${error.message}`);
    }

    return data || [];
  }

  async duplicate(id: string, userId: string, newName: string): Promise<Workflow> {
    // First get the original workflow
    const original = await this.findById(id, userId);
    if (!original) {
      throw new Error('Workflow not found');
    }

    // Create a copy with new name
    return this.create(userId, {
      name: newName,
      description: original.description,
      definition: original.definition,
      status: 'draft',
      version: '1.0.0',
      tags: original.tags
    });
  }

  async export(id: string, userId: string): Promise<any> {
    const workflow = await this.findById(id, userId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    return {
      version: '1.0',
      workflow: {
        name: workflow.name,
        description: workflow.description,
        definition: workflow.definition,
        tags: workflow.tags
      },
      exportedAt: new Date().toISOString()
    };
  }

  async import(userId: string, workflowData: any): Promise<Workflow> {
    if (!workflowData.workflow || !workflowData.workflow.name) {
      throw new Error('Invalid workflow data');
    }

    return this.create(userId, {
      name: workflowData.workflow.name,
      description: workflowData.workflow.description,
      definition: workflowData.workflow.definition,
      status: 'draft',
      version: '1.0.0',
      tags: workflowData.workflow.tags
    });
  }
}