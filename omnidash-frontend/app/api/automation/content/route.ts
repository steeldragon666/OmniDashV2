import { NextRequest, NextResponse } from 'next/server';
import { automationEngine } from '../../../automation-engine';

// GET /api/automation/content - List content generation requests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get all requests
    let requests = Array.from((automationEngine.contentAgent as any).requests.values());

    // Filter by status if specified
    if (status) {
      requests = requests.filter((req: any) => req.status === status);
    }

    // Sort by creation time (newest first) and limit
    requests = requests
      .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Error fetching content requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content requests' },
      { status: 500 }
    );
  }
}

// POST /api/automation/content - Generate content
export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    
    // Validate required fields
    if (!requestData.prompt || !requestData.contentType || !requestData.targetPlatforms) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt, contentType, targetPlatforms' },
        { status: 400 }
      );
    }

    const requestId = await automationEngine.generateContent(requestData);
    
    return NextResponse.json({ 
      requestId,
      message: 'Content generation started' 
    }, { status: 201 });
  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json(
      { error: 'Failed to generate content', details: (error as Error).message },
      { status: 500 }
    );
  }
}