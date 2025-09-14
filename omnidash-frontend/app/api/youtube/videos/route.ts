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
    const maxResults = parseInt(searchParams.get('maxResults') || '25');
    const order = searchParams.get('order') || 'date';

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY,
    });

    const response = await youtube.search.list({
      part: ['snippet'],
      channelId,
      maxResults,
      order: order as any,
      type: ['video'],
    });

    const videos = response.data.items?.map(item => ({
      id: item.id?.videoId,
      title: item.snippet?.title,
      description: item.snippet?.description,
      publishedAt: item.snippet?.publishedAt,
      thumbnails: item.snippet?.thumbnails,
      channelTitle: item.snippet?.channelTitle,
    })) || [];

    // Get detailed statistics for each video
    if (videos.length > 0) {
      const videoIds = videos.map(video => video.id).filter(Boolean);
      const statsResponse = await youtube.videos.list({
        part: ['statistics', 'contentDetails'],
        id: videoIds,
      });

      const statsMap = new Map(
        statsResponse.data.items?.map(item => [
          item.id,
          {
            statistics: item.statistics,
            duration: item.contentDetails?.duration,
          }
        ])
      );

      videos.forEach(video => {
        if (video.id && statsMap.has(video.id)) {
          const stats = statsMap.get(video.id);
          video.statistics = stats?.statistics;
          video.duration = stats?.duration;
        }
      });
    }

    return NextResponse.json({
      videos,
      totalResults: response.data.pageInfo?.totalResults,
      nextPageToken: response.data.nextPageToken,
    });
  } catch (error) {
    console.error('YouTube Videos API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
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
    const { title, description, tags, categoryId, privacy = 'private' } = body;

    if (!title) {
      return NextResponse.json({ error: 'Video title is required' }, { status: 400 });
    }

    // Note: This is a placeholder for video upload
    // Actual implementation would handle file upload to YouTube
    const videoData = {
      id: Math.random().toString(36).substr(2, 11),
      title,
      description: description || '',
      tags: tags || [],
      categoryId: categoryId || '22', // People & Blogs
      privacy,
      status: 'uploaded',
      uploadedAt: new Date().toISOString(),
      url: `https://youtube.com/watch?v=${Math.random().toString(36).substr(2, 11)}`,
    };

    return NextResponse.json(videoData, { status: 201 });
  } catch (error) {
    console.error('YouTube Video upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload video' },
      { status: 500 }
    );
  }
}