import { NextRequest, NextResponse } from 'next/server';
import { runCompleteTest, setupTestEnvironment, runTestScenarios, displayTestResults } from '../../../automation-engine/examples/test-workflows';

// GET /api/automation/test - Get test status
export async function GET() {
  try {
    // Just return basic info about available tests
    return NextResponse.json({
      message: 'Automation engine test endpoint',
      availableTests: [
        'setup - Set up test environment with demo data',
        'scenarios - Run test scenarios',
        'status - Display current status',
        'complete - Run complete test suite'
      ],
      usage: 'POST to this endpoint with { "action": "complete" } to run tests'
    });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json(
      { error: 'Test endpoint error' },
      { status: 500 }
    );
  }
}

// POST /api/automation/test - Run tests
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    switch (action) {
      case 'setup':
        const testSetup = await setupTestEnvironment();
        return NextResponse.json({
          message: 'Test environment setup completed',
          setup: testSetup
        });
        
      case 'scenarios':
        // This would need the setup data, so we'll run setup first
        const setup = await setupTestEnvironment();
        const results = await runTestScenarios(setup);
        return NextResponse.json({
          message: 'Test scenarios completed',
          results
        });
        
      case 'status':
        // This will log to console but we'll also return the data
        await displayTestResults();
        return NextResponse.json({
          message: 'Status displayed in server logs'
        });
        
      case 'complete':
      default:
        const success = await runCompleteTest();
        return NextResponse.json({
          message: success ? 'Complete test suite passed' : 'Test suite failed',
          success,
          details: 'Check server logs for detailed output'
        });
    }
  } catch (error) {
    console.error('Error running automation tests:', error);
    return NextResponse.json(
      { 
        error: 'Test execution failed', 
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}