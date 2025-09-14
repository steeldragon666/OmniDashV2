import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In a real implementation, this would fetch data from CRM integrations
    // and calculate actual metrics based on user's data
    
    const stats = {
      totalLeads: 1247,
      qualifiedLeads: 356,
      totalPipelineValue: 2450000,
      weightedPipelineValue: 980000,
      avgDealSize: 15750,
      winRate: 24.5,
      salesCycleLength: 42,
      monthlyTarget: 500000,
      monthlyProgress: 67.8,
      
      // Additional metrics
      leadsThisMonth: 89,
      leadsLastMonth: 76,
      dealsClosedThisMonth: 12,
      dealsClosedLastMonth: 8,
      conversionRate: 28.6,
      topPerformingSource: 'Website',
      avgResponseTime: 4.2, // hours
      
      // Trend data (last 12 months)
      monthlyTrends: [
        { month: 'Jan', leads: 95, deals: 8, revenue: 120000 },
        { month: 'Feb', leads: 108, deals: 12, revenue: 180000 },
        { month: 'Mar', leads: 87, deals: 10, revenue: 150000 },
        { month: 'Apr', leads: 134, deals: 15, revenue: 225000 },
        { month: 'May', leads: 112, deals: 11, revenue: 165000 },
        { month: 'Jun', leads: 98, deals: 9, revenue: 135000 },
        { month: 'Jul', leads: 156, deals: 18, revenue: 270000 },
        { month: 'Aug', leads: 145, deals: 16, revenue: 240000 },
        { month: 'Sep', leads: 123, deals: 14, revenue: 210000 },
        { month: 'Oct', leads: 167, deals: 19, revenue: 285000 },
        { month: 'Nov', leads: 189, deals: 22, revenue: 330000 },
        { month: 'Dec', leads: 201, deals: 24, revenue: 360000 },
      ],
      
      // Performance by team/individual
      teamPerformance: [
        { name: 'John Smith', leads: 45, deals: 8, revenue: 120000, conversion: 17.8 },
        { name: 'Sarah Johnson', leads: 52, deals: 12, revenue: 180000, conversion: 23.1 },
        { name: 'Mike Chen', leads: 38, deals: 6, revenue: 90000, conversion: 15.8 },
        { name: 'Emily Davis', leads: 61, deals: 15, revenue: 225000, conversion: 24.6 },
      ],
      
      // Lead sources performance
      sourcePerformance: [
        { source: 'Website', leads: 456, conversion: 31.2, avgValue: 18500 },
        { source: 'LinkedIn', leads: 289, conversion: 28.7, avgValue: 22000 },
        { source: 'Referrals', leads: 198, conversion: 42.9, avgValue: 31000 },
        { source: 'Email Campaign', leads: 167, conversion: 18.6, avgValue: 12500 },
        { source: 'Trade Shows', leads: 137, conversion: 25.5, avgValue: 28000 },
      ],
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Sales stats API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch sales statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}