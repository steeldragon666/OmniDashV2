import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Mock content data
    const content = [
      {
        id: '1',
        title: 'AI-Generated Blog Post',
        content: 'This is a sample AI-generated blog post...',
        type: 'blog',
        status: 'generated',
        created_at: new Date().toISOString()
      }
    ];

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

export async function POST(_request: NextRequest) {
  try {
    const body = await request.json();
    
    // Mock content generation
    const content = {
      id: `content-${Date.now()}`,
      ...body,
      status: 'generated',
      created_at: new Date().toISOString()
    };

    return NextResponse.json({
      content,
      message: 'Content generated successfully'
    });
  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}