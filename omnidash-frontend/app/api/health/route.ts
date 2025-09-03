import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: 'development',
    version: '1.0.0',
    frontend: true,
  });
}