import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY,
    });

    const response = await youtube.channels.list({
      part: ['snippet', 'statistics', 'brandingSettings'],
      id: [channelId],
    });

    if (!response.data.items || response.data.items.length === 0) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const channel = response.data.items[0];
    const channelData = {
      id: channel.id,
      title: channel.snippet?.title,
      description: channel.snippet?.description,
      customUrl: channel.snippet?.customUrl,
      publishedAt: channel.snippet?.publishedAt,
      thumbnails: channel.snippet?.thumbnails,
      statistics: {
        viewCount: channel.statistics?.viewCount,
        subscriberCount: channel.statistics?.subscriberCount,
        videoCount: channel.statistics?.videoCount,
      },
      branding: {
        bannerImageUrl: channel.brandingSettings?.image?.bannerExternalUrl,
        keywords: channel.brandingSettings?.channel?.keywords,
      },
    };

    return NextResponse.json(channelData);
  } catch (error) {
    console.error('YouTube Channel API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channel data' },
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
    const { channelName, description, keywords } = body;

    if (!channelName) {
      return NextResponse.json({ error: 'Channel name is required' }, { status: 400 });
    }

    // Note: This is a placeholder for channel creation
    // YouTube API doesn't allow programmatic channel creation
    // This would typically integrate with YouTube Studio API or manual process

    const channelData = {
      id: `UC${Math.random().toString(36).substr(2, 22)}`, // Mock ID
      title: channelName,
      description: description || '',
      keywords: keywords || [],
      createdAt: new Date().toISOString(),
      status: 'pending_verification',
    };

    return NextResponse.json(channelData, { status: 201 });
  } catch (error) {
    console.error('YouTube Channel creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create channel' },
      { status: 500 }
    );
  }
}