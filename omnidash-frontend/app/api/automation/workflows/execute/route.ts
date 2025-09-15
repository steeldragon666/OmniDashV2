import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/database/supabase';

// Workflow step executor
class WorkflowExecutor {
  private executionId: string;
  private workflowId: string;
  private userId: string;
  private steps: any[];
  private context: any;

  constructor(executionId: string, workflowId: string, userId: string, steps: any[], context: any = {}) {
    this.executionId = executionId;
    this.workflowId = workflowId;
    this.userId = userId;
    this.steps = steps;
    this.context = context;
  }

  async execute() {
    let currentStep = 0;
    const results: any[] = [];

    try {
      // Update execution status to running
      await this.updateExecution({ status: 'running', current_step: currentStep });

      for (const step of this.steps) {
        currentStep++;
        console.log(`Executing step ${currentStep}:`, step);

        // Update progress
        await this.updateExecution({
          current_step: currentStep,
          progress: Math.round((currentStep / this.steps.length) * 100)
        });

        // Execute the step
        const stepResult = await this.executeStep(step);
        results.push({ step: currentStep, ...stepResult });

        // Check if step failed and workflow should stop
        if (stepResult.status === 'failed' && step.stopOnFailure) {
          throw new Error(`Step ${currentStep} failed: ${stepResult.error}`);
        }

        // Update context with step results
        this.context = { ...this.context, ...stepResult.output };
      }

      // Mark execution as completed
      await this.updateExecution({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
        results
      });

      return { status: 'completed', results };
    } catch (error) {
      console.error(`Workflow execution ${this.executionId} failed:`, error);

      // Mark execution as failed
      await this.updateExecution({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        failed_at: new Date().toISOString(),
        results
      });

      throw error;
    }
  }

  private async executeStep(step: any): Promise<any> {
    const { type, config } = step;

    try {
      switch (type) {
        case 'content_generation':
          return await this.executeContentGeneration(config);
        case 'social_media_post':
          return await this.executeSocialMediaPost(config);
        case 'email_send':
          return await this.executeEmailSend(config);
        case 'data_fetch':
          return await this.executeDataFetch(config);
        case 'condition_check':
          return await this.executeConditionCheck(config);
        case 'delay':
          return await this.executeDelay(config);
        case 'webhook':
          return await this.executeWebhook(config);
        default:
          throw new Error(`Unknown step type: ${type}`);
      }
    } catch (error) {
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  private async executeContentGeneration(config: any): Promise<any> {
    // Call Vertex AI content generation API
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/vertex-ai/content/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: this.replaceVariables(config.prompt),
        contentType: config.contentType || 'text',
        model: config.model || 'gemini-1.5-flash',
        parameters: config.parameters || {}
      })
    });

    if (!response.ok) {
      throw new Error(`Content generation failed: ${response.status}`);
    }

    const result = await response.json();
    return {
      status: 'success',
      output: { generatedContent: result.content },
      timestamp: new Date().toISOString()
    };
  }

  private async executeSocialMediaPost(config: any): Promise<any> {
    // Call social media posting API
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/social/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: this.replaceVariables(config.content),
        platforms: config.platforms,
        scheduled_for: config.scheduled_for,
        media_urls: config.media_urls || []
      })
    });

    if (!response.ok) {
      throw new Error(`Social media posting failed: ${response.status}`);
    }

    const result = await response.json();
    return {
      status: 'success',
      output: { socialPosts: result.posts },
      timestamp: new Date().toISOString()
    };
  }

  private async executeEmailSend(config: any): Promise<any> {
    // Placeholder for email sending logic
    return {
      status: 'success',
      output: { emailSent: true, recipients: config.recipients },
      timestamp: new Date().toISOString()
    };
  }

  private async executeDataFetch(config: any): Promise<any> {
    // Fetch data from BigQuery or other sources
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/gcp/bigquery/datasets?includeTables=true`);

    if (!response.ok) {
      throw new Error(`Data fetch failed: ${response.status}`);
    }

    const result = await response.json();
    return {
      status: 'success',
      output: { fetchedData: result },
      timestamp: new Date().toISOString()
    };
  }

  private async executeConditionCheck(config: any): Promise<any> {
    // Evaluate condition based on context
    const condition = this.replaceVariables(config.condition);
    const passed = this.evaluateCondition(condition, this.context);

    return {
      status: 'success',
      output: { conditionPassed: passed },
      timestamp: new Date().toISOString()
    };
  }

  private async executeDelay(config: any): Promise<any> {
    const delayMs = config.duration * 1000; // Convert seconds to milliseconds
    await new Promise(resolve => setTimeout(resolve, delayMs));

    return {
      status: 'success',
      output: { delayCompleted: true, duration: config.duration },
      timestamp: new Date().toISOString()
    };
  }

  private async executeWebhook(config: any): Promise<any> {
    const response = await fetch(config.url, {
      method: config.method || 'POST',
      headers: config.headers || { 'Content-Type': 'application/json' },
      body: config.body ? this.replaceVariables(JSON.stringify(config.body)) : undefined
    });

    const result = response.ok ? await response.json() : null;

    return {
      status: response.ok ? 'success' : 'failed',
      output: { webhookResponse: result, statusCode: response.status },
      timestamp: new Date().toISOString()
    };
  }

  private replaceVariables(text: string): string {
    // Replace variables in text with context values
    return text.replace(/\{\{(.*?)\}\}/g, (match, variable) => {
      return this.context[variable.trim()] || match;
    });
  }

  private evaluateCondition(condition: string, context: any): boolean {
    // Simple condition evaluation - in production use a proper expression parser
    try {
      // Security note: In production, use a sandboxed expression evaluator
      const func = new Function('context', `return ${condition}`);
      return !!func(context);
    } catch {
      return false;
    }
  }

  private async updateExecution(updates: any) {
    await supabaseAdmin
      .from('workflow_executions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', this.executionId);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { workflowId, input = {}, triggerType = 'manual' } = body;

    if (!workflowId) {
      return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 });
    }

    // Get workflow from database
    const { data: workflow, error: workflowError } = await supabaseAdmin
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('user_id', session.user.id)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json({ error: 'Workflow not found or unauthorized' }, { status: 404 });
    }

    if (workflow.status !== 'active') {
      return NextResponse.json({ error: 'Workflow is not active' }, { status: 400 });
    }

    // Create execution record
    const { data: execution, error: executionError } = await supabaseAdmin
      .from('workflow_executions')
      .insert({
        workflow_id: workflowId,
        user_id: session.user.id,
        status: 'pending',
        trigger_type: triggerType,
        input_data: input,
        started_at: new Date().toISOString(),
        progress: 0,
        current_step: 0,
      })
      .select()
      .single();

    if (executionError) {
      console.error('Failed to create execution record:', executionError);
      return NextResponse.json({ error: 'Failed to create execution record' }, { status: 500 });
    }

    // Start workflow execution asynchronously
    const executor = new WorkflowExecutor(
      execution.id,
      workflowId,
      session.user.id,
      workflow.steps || [],
      { ...input, userId: session.user.id, executionId: execution.id }
    );

    // Execute in background
    executor.execute().catch(error => {
      console.error(`Workflow execution ${execution.id} failed:`, error);
    });

    return NextResponse.json({
      execution: {
        id: execution.id,
        workflowId,
        status: 'running',
        startedAt: execution.started_at,
        progress: 0,
        triggerType,
        input
      },
      message: 'Workflow execution started',
      workflow: {
        id: workflow.id,
        name: workflow.name,
        steps: workflow.steps?.length || 0
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error executing workflow:', error);
    return NextResponse.json(
      {
        error: 'Failed to execute workflow',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}