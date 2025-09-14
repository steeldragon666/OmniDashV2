import { NextRequest, NextResponse } from 'next/server';

// GET /api/automation/social - List social automation data
export async function GET() {
  try {
    // Mock social automation data
    const socialData = {
      accounts: [
        {
          id: '1',
          platform: 'twitter',
          username: '@omnidash_demo',
          isActive: true,
          followers: 1250,
          posts: 45,
          engagement: 3.2
        },
        {
          id: '2',
          platform: 'instagram',
          username: '@omnidash_demo',
          isActive: true,
          followers: 890,
          posts: 32,
          engagement: 4.1
        }
      ],
      scheduledPosts: [
        {
          id: '1',
          content: 'Check out our latest automation features! 🚀',
          platforms: ['twitter', 'instagram'],
          scheduledTime: new Date(Date.now() + 3600000).toISOString(),
          status: 'scheduled'
        }
      ],
      stats: {
        totalPosts: 77,
        scheduledPosts: 5,
        engagementRate: 3.65,
        totalFollowers: 2140
      }
    };

    return NextResponse.json(socialData);
  } catch (error) {
    console.error('Error fetching social automation data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch social automation data' },
      { status: 500 }
    );
  }
}

// POST /api/automation/social - Create social automation
export async function POST() {
  try {
    const body = await request.json();
    const { type, config } = body;

    if (!type || !config) {
      return NextResponse.json(
        { error: 'Type and config are required' },
        { status: 400 }
      );
    }

    // Mock automation creation
    const automation = {
      id: `social-automation-${Date.now()}`,
      type,
      config,
      status: 'active',
      created_at: new Date().toISOString()
    };

    return NextResponse.json({
      automation,
      message: 'Social automation created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating social automation:', error);
    return NextResponse.json(
      { error: 'Failed to create social automation' },
      { status: 500 }
    );
  }
}