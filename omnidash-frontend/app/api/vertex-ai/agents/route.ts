import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Mock agent data
const mockAgents = [
  {
    id: 'agent-001',
    name: 'Content Generator',
    description: 'AI agent specialized in generating marketing content',
    model: 'gemini-pro',
    status: 'active',
    capabilities: ['text-generation', 'content-optimization', 'seo-analysis'],
    lastActive: new Date().toISOString(),
    metrics: {
      totalRequests: 1250,
      successRate: 98.4,
      avgResponseTime: 1.2,
    },
  },
  {
    id: 'agent-002',
    name: 'Data Analyst',
    description: 'AI agent for analyzing business data and generating insights',
    model: 'gemini-ultra',
    status: 'active',
    capabilities: ['data-analysis', 'pattern-recognition', 'forecasting'],
    lastActive: new Date(Date.now() - 300000).toISOString(),
    metrics: {
      totalRequests: 850,
      successRate: 99.1,
      avgResponseTime: 2.8,
    },
  },
  {
    id: 'agent-003',
    name: 'Social Media Manager',
    description: 'AI agent for managing social media campaigns',
    model: 'gemini-pro',
    status: 'inactive',
    capabilities: ['social-posting', 'engagement-analysis', 'hashtag-optimization'],
    lastActive: new Date(Date.now() - 86400000).toISOString(),
    metrics: {
      totalRequests: 560,
      successRate: 97.8,
      avgResponseTime: 1.8,
    },
  },
];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const capability = searchParams.get('capability');

    let filteredAgents = [...mockAgents];

    if (status) {
      filteredAgents = filteredAgents.filter(agent => agent.status === status);
    }

    if (capability) {
      filteredAgents = filteredAgents.filter(agent =>
        agent.capabilities.includes(capability)
      );
    }

    return NextResponse.json({
      agents: filteredAgents,
      total: filteredAgents.length,
    });
  } catch (error) {
    console.error('Vertex AI Agents API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, model, capabilities } = body;

    if (!name || !model) {
      return NextResponse.json(
        { error: 'Name and model are required' },
        { status: 400 }
      );
    }

    const newAgent = {
      id: `agent-${Date.now()}`,
      name,
      description: description || '',
      model,
      status: 'inactive',
      capabilities: capabilities || [],
      createdAt: new Date().toISOString(),
      lastActive: null,
      metrics: {
        totalRequests: 0,
        successRate: 0,
        avgResponseTime: 0,
      },
    };

    return NextResponse.json(newAgent, { status: 201 });
  } catch (error) {
    console.error('Vertex AI Agent creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}