import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'messages';
    const q = searchParams.get('q') || '';
    const maxResults = searchParams.get('maxResults') || '10';
    const labelIds = searchParams.get('labelIds');

    // Check if user has Google access token with Gmail scope
    if (!session.accessToken) {
      return NextResponse.json({ 
        error: 'Gmail not connected',
        message: 'Please connect your Google account to access Gmail'
      }, { status: 403 });
    }

    let apiUrl = `${GMAIL_API_BASE}/users/me/${endpoint}`;
    const params = new URLSearchParams({
      maxResults: maxResults
    });

    if (q) {
      params.append('q', q);
    }

    if (labelIds) {
      params.append('labelIds', labelIds);
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
          error: 'Gmail access expired',
          message: 'Please reconnect your Google account'
        }, { status: 401 });
      }
      throw new Error(`Gmail API error: ${response.status}`);
    }

    const data = await response.json();

    // For messages endpoint, fetch additional details
    if (endpoint === 'messages' && data.messages) {
      const detailedMessages = await Promise.all(
        data.messages.slice(0, 5).map(async (message: any) => {
          try {
            const messageResponse = await fetch(
              `${GMAIL_API_BASE}/users/me/messages/${message.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
              {
                headers: {
                  'Authorization': `Bearer ${session.accessToken}`,
                  'Accept': 'application/json',
                },
              }
            );

            if (messageResponse.ok) {
              const messageData = await messageResponse.json();
              const headers = messageData.payload?.headers || [];
              
              return {
                id: messageData.id,
                threadId: messageData.threadId,
                snippet: messageData.snippet,
                internalDate: messageData.internalDate,
                subject: headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject',
                from: headers.find((h: any) => h.name === 'From')?.value || 'Unknown Sender',
                date: headers.find((h: any) => h.name === 'Date')?.value || messageData.internalDate,
                labelIds: messageData.labelIds || [],
                isUnread: messageData.labelIds?.includes('UNREAD') || false,
                isImportant: messageData.labelIds?.includes('IMPORTANT') || false
              };
            }
            return null;
          } catch {
            return null;
          }
        })
      );

      return NextResponse.json({
        success: true,
        messages: detailedMessages.filter(Boolean),
        totalMessages: data.resultSizeEstimate,
        nextPageToken: data.nextPageToken
      });
    }

    // For labels or other endpoints
    return NextResponse.json({
      success: true,
      data,
      count: data.messages?.length || data.labels?.length || 0
    });

  } catch (error) {
    console.error('Gmail API Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch Gmail data',
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

    const { action, messageId, labelIds, body } = await request.json();

    let apiUrl: string;
    let method = 'POST';
    let requestBody: any = {};

    switch (action) {
      case 'mark_as_read':
        if (!messageId) {
          return NextResponse.json({ error: 'Message ID required' }, { status: 400 });
        }
        apiUrl = `${GMAIL_API_BASE}/users/me/messages/${messageId}/modify`;
        requestBody = { removeLabelIds: ['UNREAD'] };
        break;
      
      case 'mark_as_unread':
        if (!messageId) {
          return NextResponse.json({ error: 'Message ID required' }, { status: 400 });
        }
        apiUrl = `${GMAIL_API_BASE}/users/me/messages/${messageId}/modify`;
        requestBody = { addLabelIds: ['UNREAD'] };
        break;
      
      case 'add_labels':
        if (!messageId || !labelIds) {
          return NextResponse.json({ error: 'Message ID and label IDs required' }, { status: 400 });
        }
        apiUrl = `${GMAIL_API_BASE}/users/me/messages/${messageId}/modify`;
        requestBody = { addLabelIds: labelIds };
        break;
      
      case 'remove_labels':
        if (!messageId || !labelIds) {
          return NextResponse.json({ error: 'Message ID and label IDs required' }, { status: 400 });
        }
        apiUrl = `${GMAIL_API_BASE}/users/me/messages/${messageId}/modify`;
        requestBody = { removeLabelIds: labelIds };
        break;
      
      case 'send_email':
        apiUrl = `${GMAIL_API_BASE}/users/me/messages/send`;
        requestBody = { raw: body };
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
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Gmail API Error:', error);
    return NextResponse.json({
      error: 'Failed to perform Gmail operation',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}