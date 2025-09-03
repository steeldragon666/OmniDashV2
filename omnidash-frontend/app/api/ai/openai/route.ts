import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';

const OPENAI_API_BASE = 'https://api.openai.com/v1';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, model = 'gpt-3.5-turbo', maxTokens = 150, temperature = 0.7 } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API not configured',
        message: 'Please configure OPENAI_API_KEY environment variable'
      }, { status: 503 });
    }

    const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant for OmniDash, a multi-brand social media management platform. Help users with content creation, analytics insights, and social media strategy.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      response: data.choices[0]?.message?.content || '',
      model,
      usage: data.usage
    });

  } catch (error) {
    console.error('OpenAI API Error:', error);
    return NextResponse.json({
      error: 'Failed to generate AI response',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API not configured',
        message: 'Please configure OPENAI_API_KEY environment variable'
      }, { status: 503 });
    }

    const response = await fetch(`${OPENAI_API_BASE}/models`, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();

    // Filter to commonly used models
    const commonModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo-preview'];
    const availableModels = data.data.filter((model: any) => 
      commonModels.some(common => model.id.includes(common))
    );

    return NextResponse.json({
      success: true,
      models: availableModels.map((model: any) => ({
        id: model.id,
        name: model.id,
        created: model.created
      }))
    });

  } catch (error) {
    console.error('OpenAI Models API Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch OpenAI models',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}