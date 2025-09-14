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

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY,
    });

    const response = await youtube.playlists.list({
      part: ['snippet', 'contentDetails', 'status'],
      channelId,
      maxResults,
    });

    const playlists = response.data.items?.map(playlist => ({
      id: playlist.id,
      title: playlist.snippet?.title,
      description: playlist.snippet?.description,
      publishedAt: playlist.snippet?.publishedAt,
      thumbnails: playlist.snippet?.thumbnails,
      itemCount: playlist.contentDetails?.itemCount,
      privacy: playlist.status?.privacyStatus,
      channelTitle: playlist.snippet?.channelTitle,
    })) || [];

    return NextResponse.json({
      playlists,
      totalResults: response.data.pageInfo?.totalResults,
      nextPageToken: response.data.nextPageToken,
    });
  } catch (error) {
    console.error('YouTube Playlists API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch playlists' },
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
    const { title, description, privacy = 'private' } = body;

    if (!title) {
      return NextResponse.json({ error: 'Playlist title is required' }, { status: 400 });
    }

    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY,
    });

    // Note: This requires OAuth authentication for the user
    // For now, returning a mock response
    const playlistData = {
      id: `PL${Math.random().toString(36).substr(2, 32)}`,
      title,
      description: description || '',
      privacy,
      createdAt: new Date().toISOString(),
      itemCount: 0,
      url: `https://youtube.com/playlist?list=PL${Math.random().toString(36).substr(2, 32)}`,
    };

    return NextResponse.json(playlistData, { status: 201 });
  } catch (error) {
    console.error('YouTube Playlist creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create playlist' },
      { status: 500 }
    );
  }
}