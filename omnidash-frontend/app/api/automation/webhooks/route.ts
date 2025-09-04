import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const webhooks = [
      {
        id: 'webhook-1',
        name: 'Content Trigger',
        url: '/api/webhook/content',
        active: true,
        created_at: new Date().toISOString()
      }
    ];

    return NextResponse.json({ webhooks });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhooks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const webhook = {
      id: `webhook-${Date.now()}`,
      ...body,
      active: true,
      created_at: new Date().toISOString()
    };

    return NextResponse.json({
      webhook,
      message: 'Webhook created successfully'
    });
  } catch (error) {
    console.error('Error creating webhook:', error);
    return NextResponse.json(
      { error: 'Failed to create webhook' },
      { status: 500 }
    );
  }
}