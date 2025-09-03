import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';

const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'files';
    const q = searchParams.get('q');
    const pageSize = searchParams.get('pageSize') || '10';

    // Check if user has Google access token
    if (!session.accessToken) {
      return NextResponse.json({ 
        error: 'Google Drive not connected',
        message: 'Please connect your Google account to access Drive files'
      }, { status: 403 });
    }

    let apiUrl = `${GOOGLE_DRIVE_API_BASE}/${endpoint}`;
    const params = new URLSearchParams({
      pageSize: pageSize,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, thumbnailLink, parents)'
    });

    if (q) {
      params.append('q', q);
    }

    apiUrl += `?${params.toString()}`;

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({ 
          error: 'Google Drive access expired',
          message: 'Please reconnect your Google account'
        }, { status: 401 });
      }
      throw new Error(`Google Drive API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform the response to a more user-friendly format
    const files = data.files?.map((file: any) => ({
      id: file.id,
      name: file.name,
      type: file.mimeType,
      size: file.size ? parseInt(file.size) : 0,
      modifiedTime: file.modifiedTime,
      webViewLink: file.webViewLink,
      thumbnailLink: file.thumbnailLink,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder',
      parents: file.parents || []
    })) || [];

    return NextResponse.json({
      success: true,
      files,
      nextPageToken: data.nextPageToken,
      count: files.length
    });

  } catch (error) {
    console.error('Google Drive API Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch Google Drive data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !session.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, fileId, name, parents } = await request.json();

    let apiUrl: string;
    let method = 'POST';
    let body: any = {};

    switch (action) {
      case 'create_folder':
        apiUrl = `${GOOGLE_DRIVE_API_BASE}/files`;
        body = {
          name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: parents || []
        };
        break;
      
      case 'move_to_trash':
        if (!fileId) {
          return NextResponse.json({ error: 'File ID required' }, { status: 400 });
        }
        apiUrl = `${GOOGLE_DRIVE_API_BASE}/files/${fileId}`;
        method = 'PATCH';
        body = { trashed: true };
        break;
      
      case 'restore_from_trash':
        if (!fileId) {
          return NextResponse.json({ error: 'File ID required' }, { status: 400 });
        }
        apiUrl = `${GOOGLE_DRIVE_API_BASE}/files/${fileId}`;
        method = 'PATCH';
        body = { trashed: false };
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const response = await fetch(apiUrl, {
      method,
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Google Drive API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Google Drive API Error:', error);
    return NextResponse.json({
      error: 'Failed to perform Drive operation',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}