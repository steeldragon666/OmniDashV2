import { NextRequest, NextResponse } from 'next/server';
import { automationEngine } from '../../../../automation-engine';

// GET /api/automation/social/posts - List scheduled posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let posts = Array.from((automationEngine.socialPublisher as any).postQueue.values());

    // Filter by account if specified
    if (accountId) {
      posts = posts.filter((post: any) => post.accountId === accountId);
    }

    // Filter by status if specified
    if (status) {
      posts = posts.filter((post: any) => post.status === status);
    }

    // Sort by creation time (newest first) and limit
    posts = posts
      .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

// POST /api/automation/social/posts - Schedule post
export async function POST(request: NextRequest) {
  try {
    const postData = await request.json();
    
    // Validate required fields
    if (!postData.accountId || !postData.content) {
      return NextResponse.json(
        { error: 'Missing required fields: accountId, content' },
        { status: 400 }
      );
    }

    const postId = await automationEngine.schedulePost(
      postData.accountId,
      postData.content,
      postData.options || {}
    );
    
    return NextResponse.json({ 
      postId,
      message: 'Post scheduled successfully' 
    }, { status: 201 });
  } catch (error) {
    console.error('Error scheduling post:', error);
    return NextResponse.json(
      { error: 'Failed to schedule post', details: (error as Error).message },
      { status: 500 }
    );
  }
}