import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const config = await request.json();
    
    // Generate a mock job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate training job creation
    const trainingJob = {
      jobId,
      status: 'PENDING',
      config,
      createdAt: new Date().toISOString(),
      estimatedCompletion: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
    };

    return NextResponse.json({ success: true, ...trainingJob });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to start training' }, { status: 500 });
  }
}
