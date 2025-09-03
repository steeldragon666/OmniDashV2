import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';

const CLAUDE_API_BASE = 'https://api.anthropic.com/v1';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, model = 'claude-3-haiku-20240307', maxTokens = 150, temperature = 0.7 } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!process.env.CLAUDE_API_KEY) {
      return NextResponse.json({ 
        error: 'Claude API not configured',
        message: 'Please configure CLAUDE_API_KEY environment variable'
      }, { status: 503 });
    }

    const response = await fetch(`${CLAUDE_API_BASE}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: 'You are a helpful AI assistant for OmniDash, a multi-brand social media management platform. Help users with content creation, analytics insights, and social media strategy. Be concise and actionable in your responses.',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Claude API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      response: data.content[0]?.text || '',
      model,
      usage: data.usage
    });

  } catch (error) {
    console.error('Claude API Error:', error);
    return NextResponse.json({
      error: 'Failed to generate Claude response',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!process.env.CLAUDE_API_KEY) {
      return NextResponse.json({ 
        error: 'Claude API not configured',
        message: 'Please configure CLAUDE_API_KEY environment variable'
      }, { status: 503 });
    }

    // Claude models are static, so we can return them directly
    const models = [
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        description: 'Fast and efficient for everyday tasks'
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet', 
        description: 'Balanced performance and speed'
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        description: 'Most capable model for complex tasks'
      }
    ];

    return NextResponse.json({
      success: true,
      models
    });

  } catch (error) {
    console.error('Claude Models Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch Claude models',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}