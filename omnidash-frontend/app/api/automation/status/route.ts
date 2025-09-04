import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const status = {
      engine: {
        status: 'running',
        uptime: 86400,
        version: '1.0.0',
        workflows: {
          active: 5,
          total: 12
        },
        executions: {
          running: 2,
          completed_today: 48,
          failed_today: 1
        }
      },
      system: {
        memory_usage: 45.2,
        cpu_usage: 12.8,
        queue_size: 3
      },
      last_updated: new Date().toISOString()
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}