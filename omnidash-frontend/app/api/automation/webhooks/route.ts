import { NextRequest, NextResponse } from 'next/server';
import { automationEngine } from '../../../automation-engine';

// GET /api/automation/webhooks - List webhook endpoints
export async function GET() {
  try {
    const endpoints = automationEngine.webhookService.getEndpoints();
    const triggers = automationEngine.webhookService.getTriggers();
    
    return NextResponse.json({ 
      endpoints,
      triggers,
      stats: automationEngine.webhookService.getWebhookStats()
    });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhooks' },
      { status: 500 }
    );
  }
}

// POST /api/automation/webhooks - Create webhook endpoint
export async function POST(request: NextRequest) {
  try {
    const webhookData = await request.json();
    
    // Validate required fields
    if (!webhookData.name || !webhookData.url || !webhookData.method) {
      return NextResponse.json(
        { error: 'Missing required fields: name, url, method' },
        { status: 400 }
      );
    }

    const endpointId = await automationEngine.createWebhookEndpoint({
      name: webhookData.name,
      url: webhookData.url,
      method: webhookData.method,
      description: webhookData.description,
      secret: webhookData.secret,
      headers: webhookData.headers || {},
      filters: webhookData.filters || [],
      retryPolicy: webhookData.retryPolicy || {
        maxRetries: 3,
        backoffStrategy: 'exponential',
        initialDelay: 1000
      },
      rateLimit: webhookData.rateLimit,
      authentication: webhookData.authentication
    });
    
    return NextResponse.json({ 
      endpointId,
      message: 'Webhook endpoint created successfully' 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating webhook endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to create webhook endpoint', details: (error as Error).message },
      { status: 500 }
    );
  }
}