import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { google } from 'googleapis';
import { Readable } from 'stream';

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

    // Note: This is a simplified implementation
    // In production, you would need OAuth2 credentials from the user
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // This would require user's access token
    // oauth2Client.setCredentials({
    //   access_token: userAccessToken,
    //   refresh_token: userRefreshToken,
    // });

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client,
    });

    // For now, return a mock response since we don't have user OAuth setup
    const uploadResult = {
      id: Math.random().toString(36).substr(2, 11),
      title,
      description: description || '',
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      categoryId,
      privacy,
      status: 'uploaded',
      uploadedAt: new Date().toISOString(),
      url: `https://youtube.com/watch?v=${Math.random().toString(36).substr(2, 11)}`,
      processingStatus: 'processing',
      fileDetails: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      },
    };

    // In a real implementation, you would:
    // const uploadResult = await youtube.videos.insert({
    //   part: ['snippet', 'status'],
    //   requestBody: {
    //     snippet: {
    //       title,
    //       description,
    //       tags: tags ? tags.split(',').map(tag => tag.trim()) : undefined,
    //       categoryId,
    //     },
    //     status: {
    //       privacyStatus: privacy,
    //     },
    //   },
    //   media: {
    //     body: stream,
    //   },
    // });

    return NextResponse.json(uploadResult, { status: 201 });
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

    if (!uploadId) {
      return NextResponse.json({ error: 'Upload ID is required' }, { status: 400 });
    }

    // Mock upload status check
    const statuses = ['processing', 'processed', 'published', 'failed'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    const uploadStatus = {
      id: uploadId,
      status: randomStatus,
      progress: randomStatus === 'processing' ? Math.floor(Math.random() * 100) : 100,
      processingDetails: {
        processingStatus: randomStatus,
        processingProgress: {
          partsTotal: 10,
          partsProcessed: randomStatus === 'processing' ? Math.floor(Math.random() * 10) : 10,
        },
      },
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(uploadStatus);
  } catch (error) {
    console.error('YouTube Upload status error:', error);
    return NextResponse.json(
      { error: 'Failed to get upload status' },
      { status: 500 }
    );
  }
}