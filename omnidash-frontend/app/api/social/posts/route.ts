import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Mock social posts data
    const posts = [
      {
        id: 'post-1',
        content: 'Excited to share our latest automation features! 🚀 #automation #productivity',
        platform: 'twitter',
        status: 'published',
        published_at: new Date(Date.now() - 1800000).toISOString(),
        scheduled_for: null,
        media_urls: [],
        engagement: {
          likes: 45,
          shares: 12,
          comments: 8
        }
      },
      {
        id: 'post-2',
        content: 'Behind the scenes: How we built our workflow engine 👨‍💻',
        platform: 'linkedin',
        status: 'scheduled', 
        published_at: null,
        scheduled_for: new Date(Date.now() + 3600000).toISOString(),
        media_urls: ['https://example.com/workflow-diagram.png'],
        engagement: {
          likes: 0,
          shares: 0,
          comments: 0
        }
      },
      {
        id: 'post-3',
        content: 'Check out this beautiful automation dashboard! ✨ #design #UX',
        platform: 'instagram',
        status: 'published',
        published_at: new Date(Date.now() - 3600000).toISOString(),
        scheduled_for: null,
        media_urls: ['https://example.com/dashboard-screenshot.jpg'],
        engagement: {
          likes: 89,
          shares: 23,
          comments: 15
        }
      }
    ];

    let filteredPosts = posts;
    
    // Filter by status
    if (status) {
      filteredPosts = filteredPosts.filter(post => post.status === status);
    }
    
    // Filter by platform
    if (platform) {
      filteredPosts = filteredPosts.filter(post => post.platform === platform);
    }
    
    // Limit results
    filteredPosts = filteredPosts.slice(0, limit);

    return NextResponse.json({ 
      posts: filteredPosts,
      total: filteredPosts.length,
      stats: {
        total_posts: posts.length,
        published: posts.filter(p => p.status === 'published').length,
        scheduled: posts.filter(p => p.status === 'scheduled').length,
        failed: posts.filter(p => p.status === 'failed').length
      }
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
    const { content, platforms, scheduled_for, hashtags, media_urls } = body;
    
    if (!content || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: 'Content and platforms are required' },
        { status: 400 }
      );
    }

    // Mock post creation for each platform
    const posts = platforms.map((platform: string) => ({
      id: `post-${platform}-${Date.now()}`,
      content,
      platform,
      status: scheduled_for ? 'scheduled' : 'published',
      scheduled_for,
      published_at: scheduled_for ? null : new Date().toISOString(),
      media_urls: media_urls || [],
      hashtags: hashtags || [],
      engagement: {
        likes: 0,
        shares: 0,
        comments: 0
      }
    }));

    return NextResponse.json({
      posts,
      message: `Posts ${scheduled_for ? 'scheduled' : 'published'} successfully to ${platforms.length} platform(s)`
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating social posts:', error);
    return NextResponse.json(
      { error: 'Failed to create social posts' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, action } = body;
    
    if (!postId || !action) {
      return NextResponse.json(
        { error: 'Post ID and action are required' },
        { status: 400 }
      );
    }

    // Mock post update based on action
    let message = '';
    switch (action) {
      case 'publish_now':
        message = 'Post published immediately';
        break;
      case 'reschedule':
        message = 'Post rescheduled successfully';
        break;
      case 'cancel':
        message = 'Post cancelled successfully';
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error updating social post:', error);
    return NextResponse.json(
      { error: 'Failed to update social post' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    
    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    // Mock post deletion
    return NextResponse.json({
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting social post:', error);
    return NextResponse.json(
      { error: 'Failed to delete social post' },
      { status: 500 }
    );
  }
}