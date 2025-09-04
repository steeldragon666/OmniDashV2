import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Mock scheduled posts
    const posts = [
      {
        id: 'post-1',
        content: 'Check out our latest automation features! 🚀 #automation #productivity',
        platforms: ['twitter', 'linkedin'],
        scheduledTime: new Date(Date.now() + 3600000).toISOString(),
        status: 'scheduled',
        mediaUrls: [],
        hashtags: ['automation', 'productivity']
      },
      {
        id: 'post-2', 
        content: 'Behind the scenes of our workflow engine development 👨‍💻',
        platforms: ['instagram', 'facebook'],
        scheduledTime: new Date(Date.now() - 1800000).toISOString(),
        status: 'published',
        mediaUrls: ['https://example.com/image.jpg'],
        hashtags: ['development', 'workflows']
      }
    ];

    let filteredPosts = posts;
    if (status) {
      filteredPosts = posts.filter(post => post.status === status);
    }

    return NextResponse.json({ 
      posts: filteredPosts.slice(0, limit),
      total: filteredPosts.length
    });
  } catch (error) {
    console.error('Error fetching social posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch social posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Mock post creation
    const post = {
      id: `post-${Date.now()}`,
      ...body,
      status: 'scheduled',
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({
      post,
      message: 'Social post scheduled successfully'
    });
  } catch (error) {
    console.error('Error creating social post:', error);
    return NextResponse.json(
      { error: 'Failed to create social post' },
      { status: 500 }
    );
  }
}