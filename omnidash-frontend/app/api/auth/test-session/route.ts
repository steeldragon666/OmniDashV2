import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(_request: NextRequest) {
  try {
    // Create a test session for development purposes
    const testSession = {
      user: {
        id: 'test-user-123',
        email: 'demo@example.com',
        name: 'Demo User',
        image: 'https://via.placeholder.com/40'
      },
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      provider: 'test',
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    // Set a test session cookie
    const cookieStore = cookies();
    cookieStore.set('next-auth.session-token', 'test-session-token-123', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    return NextResponse.json({ 
      message: 'Test session created',
      session: testSession,
      success: true
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to create test session' },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  return NextResponse.json({ 
    message: 'Test session endpoint',
    instructions: 'POST to this endpoint to create a test session for development'
  });
}