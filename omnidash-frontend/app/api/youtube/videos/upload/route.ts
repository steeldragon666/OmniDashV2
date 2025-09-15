import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { supabaseAdmin } from '@/lib/database/supabase';

// Helper function to get user's YouTube OAuth tokens
async function getUserYouTubeTokens(userId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_oauth_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userId)
      .eq('provider', 'youtube')
      .eq('active', true)
      .single();

    if (error || !data) {
      return null;
    }

    // Check if token is expired and needs refresh
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      // TODO: Implement token refresh logic
      console.warn('YouTube token expired, refresh needed');
      return null;
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    };
  } catch (error) {
    console.error('Error fetching YouTube tokens:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const tags = formData.get('tags') as string;
    const categoryId = formData.get('categoryId') as string || '22';
    const privacy = formData.get('privacy') as string || 'private';

    if (!file || !title) {
      return NextResponse.json(
        { error: 'File and title are required' },
        { status: 400 }
      );
    }

    // Check file size (YouTube max is 128GB, but we'll set a reasonable limit)
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 2GB limit' },
        { status: 413 }
      );
    }

    // Check file type
    const allowedTypes = [
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/webm',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only video files are allowed.' },
        { status: 400 }
      );
    }

    // Convert File to stream
    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);

    // Get user's YouTube OAuth tokens from session/database
    // In a real implementation, these would come from the user's OAuth flow
    const userTokens = await getUserYouTubeTokens(session.user.id);

    if (!userTokens) {
      return NextResponse.json(
        {
          error: 'YouTube authorization required',
          message: 'Please authorize your YouTube account first',
          authUrl: `/api/youtube/auth?redirect=${encodeURIComponent(request.url)}`
        },
        { status: 401 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: userTokens.access_token,
      refresh_token: userTokens.refresh_token,
    });

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client,
    });

    try {
      // Upload video to YouTube
      const uploadResponse = await youtube.videos.insert({
        part: ['snippet', 'status', 'processingDetails'],
        requestBody: {
          snippet: {
            title,
            description: description || '',
            tags: tags ? tags.split(',').map(tag => tag.trim()) : undefined,
            categoryId,
          },
          status: {
            privacyStatus: privacy,
            selfDeclaredMadeForKids: false,
          },
        },
        media: {
          body: stream,
        },
      });

      const videoData = uploadResponse.data;
      const videoId = videoData.id;

      // Save upload record to database
      const uploadRecord = {
        user_id: session.user.id,
        video_id: videoId,
        title,
        description: description || '',
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        category_id: categoryId,
        privacy_status: privacy,
        status: 'uploaded',
        uploaded_at: new Date().toISOString(),
        file_details: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        },
        processing_status: videoData.processingDetails?.processingStatus || 'processing',
        youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
        youtube_response: {
          etag: videoData.etag,
          kind: videoData.kind,
          snippet: videoData.snippet,
          status: videoData.status,
        },
      };

      const { data: dbRecord, error: dbError } = await supabaseAdmin
        .from('youtube_uploads')
        .insert(uploadRecord)
        .select()
        .single();

      if (dbError) {
        console.warn('Failed to save upload record to database:', dbError);
      }

      const uploadResult = {
        id: videoId,
        title,
        description: description || '',
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        categoryId,
        privacy,
        status: 'uploaded',
        uploadedAt: new Date().toISOString(),
        url: `https://www.youtube.com/watch?v=${videoId}`,
        processingStatus: videoData.processingDetails?.processingStatus || 'processing',
        fileDetails: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        },
        thumbnails: videoData.snippet?.thumbnails,
        channelId: videoData.snippet?.channelId,
        channelTitle: videoData.snippet?.channelTitle,
        publishedAt: videoData.snippet?.publishedAt,
        dbRecordId: dbRecord?.id,
      };

      return NextResponse.json(uploadResult, { status: 201 });
    } catch (youtubeError: any) {
      console.error('YouTube API Error:', youtubeError);

      // Handle specific YouTube API errors
      if (youtubeError.code === 401) {
        return NextResponse.json(
          {
            error: 'YouTube authorization expired',
            message: 'Please re-authorize your YouTube account',
            authUrl: `/api/youtube/auth?redirect=${encodeURIComponent(request.url)}`
          },
          { status: 401 }
        );
      }

      if (youtubeError.code === 403) {
        return NextResponse.json(
          {
            error: 'YouTube quota exceeded',
            message: 'YouTube API quota exceeded. Please try again later.',
            retryAfter: 3600
          },
          { status: 429 }
        );
      }

      // Save failed upload to database
      try {
        await supabaseAdmin
          .from('youtube_uploads')
          .insert({
            user_id: session.user.id,
            title,
            description: description || '',
            status: 'failed',
            error_message: youtubeError.message || 'YouTube upload failed',
            file_details: {
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
            },
          });
      } catch (dbError) {
        console.warn('Failed to save error record to database:', dbError);
      }

      throw youtubeError;
    }
  } catch (error) {
    console.error('YouTube Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload video' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');
    const videoId = searchParams.get('videoId');

    if (!uploadId && !videoId) {
      return NextResponse.json({ error: 'Upload ID or Video ID is required' }, { status: 400 });
    }

    if (uploadId) {
      // Get upload status from database
      const { data: upload, error } = await supabaseAdmin
        .from('youtube_uploads')
        .select('*')
        .eq('id', uploadId)
        .eq('user_id', session.user.id)
        .single();

      if (error || !upload) {
        return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
      }

      return NextResponse.json({
        id: upload.id,
        videoId: upload.video_id,
        status: upload.status,
        processingStatus: upload.processing_status,
        title: upload.title,
        url: upload.youtube_url,
        uploadedAt: upload.uploaded_at,
        fileDetails: upload.file_details,
        error: upload.error_message,
        lastUpdated: upload.updated_at || upload.uploaded_at,
      });
    }

    if (videoId) {
      // Get real-time status from YouTube API
      const userTokens = await getUserYouTubeTokens(session.user.id);

      if (!userTokens) {
        return NextResponse.json(
          { error: 'YouTube authorization required' },
          { status: 401 }
        );
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        access_token: userTokens.access_token,
        refresh_token: userTokens.refresh_token,
      });

      const youtube = google.youtube({
        version: 'v3',
        auth: oauth2Client,
      });

      try {
        const response = await youtube.videos.list({
          part: ['processingDetails', 'status', 'snippet'],
          id: [videoId],
        });

        const video = response.data.items?.[0];
        if (!video) {
          return NextResponse.json({ error: 'Video not found on YouTube' }, { status: 404 });
        }

        // Update database with latest status
        await supabaseAdmin
          .from('youtube_uploads')
          .update({
            processing_status: video.processingDetails?.processingStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('video_id', videoId)
          .eq('user_id', session.user.id);

        return NextResponse.json({
          id: videoId,
          status: video.status?.uploadStatus,
          processingStatus: video.processingDetails?.processingStatus,
          processingProgress: video.processingDetails?.processingProgress,
          title: video.snippet?.title,
          publishedAt: video.snippet?.publishedAt,
          privacyStatus: video.status?.privacyStatus,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          lastUpdated: new Date().toISOString(),
        });
      } catch (youtubeError) {
        console.error('YouTube API Error:', youtubeError);
        return NextResponse.json(
          { error: 'Failed to fetch video status from YouTube' },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('YouTube Upload status error:', error);
    return NextResponse.json(
      { error: 'Failed to get upload status' },
      { status: 500 }
    );
  }
}