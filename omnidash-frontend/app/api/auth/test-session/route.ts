import { NextRequest, NextResponse } from 'next/server';

// Test session endpoint disabled for production security
export async function POST() {
  // Only allow in development mode with explicit flag
  if (process.env.NODE_ENV === 'production' || !process.env.ENABLE_TEST_SESSION) {
    return NextResponse.json(
      { error: 'Test session endpoint is disabled for security' },
      { status: 403 }
    );
  }

  return NextResponse.json(
    { error: 'Test session disabled. Use real OAuth authentication.' },
    { status: 503 }
  );
}

export async function GET() {
  return NextResponse.json({
    message: 'Authentication requires real OAuth providers',
    supportedProviders: ['Google', 'GitHub', 'LinkedIn'],
    documentation: '/docs/authentication'
  });
}