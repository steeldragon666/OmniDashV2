import { NextRequest, NextResponse } from 'next/server';
import { automationEngine } from '../../../automation-engine';

// GET /api/automation/status - Get automation engine status
export async function GET() {
  try {
    const status = automationEngine.getStatus();
    const metrics = automationEngine.getMetrics();
    const health = await automationEngine.healthCheck();
    
    return NextResponse.json({ 
      status,
      metrics,
      health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting automation status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get status',
        status: 'error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}