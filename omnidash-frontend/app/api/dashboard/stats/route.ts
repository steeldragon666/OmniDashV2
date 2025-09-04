import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Mock dashboard statistics
    const stats = {
      workflows: {
        total: 12,
        active: 8,
        draft: 3,
        paused: 1
      },
      executions: {
        total: 347,
        running: 2,
        completed: 334,
        failed: 11,
        success_rate: 96.8
      },
      social: {
        connected_accounts: 4,
        total_posts: 89,
        scheduled_posts: 12,
        total_followers: 15420
      },
      system: {
        queue_jobs: 5,
        uptime: 2592000, // 30 days in seconds
        memory_usage: 45.2,
        cpu_usage: 12.8
      },
      recent_activity: [
        {
          id: '1',
          type: 'workflow_completed',
          message: 'Content Generation Pipeline completed',
          timestamp: new Date(Date.now() - 300000).toISOString()
        },
        {
          id: '2', 
          type: 'social_post',
          message: 'Posted to Twitter and LinkedIn',
          timestamp: new Date(Date.now() - 900000).toISOString()
        },
        {
          id: '3',
          type: 'workflow_created',
          message: 'New Email Automation workflow created',
          timestamp: new Date(Date.now() - 1800000).toISOString()
        }
      ]
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Mock stats update
    return NextResponse.json({
      message: 'Dashboard stats refreshed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error refreshing stats:', error);
    return NextResponse.json(
      { error: 'Failed to refresh stats' },
      { status: 500 }
    );
  }
}