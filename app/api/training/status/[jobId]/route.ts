import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    
    // Simulate training status
    const status = {
      jobId,
      status: 'RUNNING',
      progress: Math.floor(Math.random() * 100),
      currentStep: 'Training in progress...',
      gpusActive: 8,
      totalGpus: 16,
      costSpent: Math.floor(Math.random() * 1000),
      estimatedCompletion: new Date(Date.now() + 1800000).toISOString(), // 30 minutes from now
      currentEpoch: Math.floor(Math.random() * 50),
      totalEpochs: 50,
      bestAccuracy: 0.85 + Math.random() * 0.1,
      trainingLoss: 0.5 + Math.random() * 0.3
    };

    return NextResponse.json({ success: true, ...status });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get training status' }, { status: 500 });
  }
}
