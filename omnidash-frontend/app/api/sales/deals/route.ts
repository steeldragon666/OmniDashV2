import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stage = searchParams.get('stage');
    const ownerId = searchParams.get('owner_id');
    const forecastPeriod = searchParams.get('forecast_period') || 'month';

    // Mock deal data - in production, this would query CRM APIs
    const allDeals = [
      {
        id: '1',
        name: 'Enterprise Software License',
        value: 125000,
        stage: 'Negotiation',
        probability: 80,
        closeDate: '2024-02-15',
        createdDate: '2023-11-20',
        lastModifiedDate: '2024-01-19',
        account: 'Global Corp',
        accountId: 'acc_1',
        contact: 'John Davis',
        contactId: 'contact_1',
        owner: 'John Smith',
        ownerId: 'user_1',
        leadSource: 'Website',
        competitorPresence: true,
        
        // Stage history for velocity analysis
        stageHistory: [
          { fromStage: 'Lead', toStage: 'Qualification', timestamp: '2023-11-25T10:00:00Z', daysInPreviousStage: 5 },
          { fromStage: 'Qualification', toStage: 'Needs Analysis', timestamp: '2023-12-10T14:30:00Z', daysInPreviousStage: 15 },
          { fromStage: 'Needs Analysis', toStage: 'Proposal', timestamp: '2024-01-05T11:15:00Z', daysInPreviousStage: 26 },
          { fromStage: 'Proposal', toStage: 'Negotiation', timestamp: '2024-01-15T16:45:00Z', daysInPreviousStage: 10 },
        ],
        
        // Engagement metrics
        emailsSent: 15,
        emailsOpened: 12,
        callsMade: 8,
        meetingsHeld: 4,
        proposalsSent: 2,
        
        // AI predictions
        aiProbability: 85,
        riskFactors: ['Competitor presence', 'Budget approval pending'],
        predictedCloseDate: '2024-02-18',
        confidenceLevel: 0.78,
        
        // Financial details
        products: [
          { name: 'Premium License', quantity: 100, unitPrice: 800, totalValue: 80000 },
          { name: 'Professional Services', quantity: 1, unitPrice: 45000, totalValue: 45000 },
        ],
        
        // Next steps
        nextSteps: [
          'Review legal terms',
          'Finalize pricing',
          'Executive approval',
        ],
        
        tags: ['Enterprise', 'High Value', 'Competitive'],
      },
      {
        id: '2',
        name: 'Cloud Migration Project',
        value: 85000,
        stage: 'Proposal',
        probability: 60,
        closeDate: '2024-02-28',
        createdDate: '2023-12-01',
        lastModifiedDate: '2024-01-18',
        account: 'Mid Corp',
        accountId: 'acc_2',
        contact: 'Sarah Wilson',
        contactId: 'contact_2',
        owner: 'Jane Doe',
        ownerId: 'user_2',
        leadSource: 'Referral',
        competitorPresence: false,
        
        stageHistory: [
          { fromStage: 'Lead', toStage: 'Qualification', timestamp: '2023-12-05T09:30:00Z', daysInPreviousStage: 4 },
          { fromStage: 'Qualification', toStage: 'Needs Analysis', timestamp: '2023-12-18T13:20:00Z', daysInPreviousStage: 13 },
          { fromStage: 'Needs Analysis', toStage: 'Proposal', timestamp: '2024-01-08T15:10:00Z', daysInPreviousStage: 21 },
        ],
        
        emailsSent: 10,
        emailsOpened: 9,
        callsMade: 5,
        meetingsHeld: 3,
        proposalsSent: 1,
        
        aiProbability: 68,
        riskFactors: ['Technical complexity'],
        predictedCloseDate: '2024-03-05',
        confidenceLevel: 0.65,
        
        products: [
          { name: 'Cloud Platform', quantity: 1, unitPrice: 60000, totalValue: 60000 },
          { name: 'Migration Services', quantity: 1, unitPrice: 25000, totalValue: 25000 },
        ],
        
        nextSteps: [
          'Technical architecture review',
          'Timeline confirmation',
          'Resource allocation',
        ],
        
        tags: ['Cloud', 'Migration', 'Technical'],
      },
      {
        id: '3',
        name: 'Marketing Automation Suite',
        value: 55000,
        stage: 'Qualification',
        probability: 40,
        closeDate: '2024-03-15',
        createdDate: '2024-01-10',
        lastModifiedDate: '2024-01-19',
        account: 'Growth Inc',
        accountId: 'acc_3',
        contact: 'Mike Johnson',
        contactId: 'contact_3',
        owner: 'John Smith',
        ownerId: 'user_1',
        leadSource: 'Trade Show',
        competitorPresence: true,
        
        stageHistory: [
          { fromStage: 'Lead', toStage: 'Qualification', timestamp: '2024-01-15T11:45:00Z', daysInPreviousStage: 5 },
        ],
        
        emailsSent: 6,
        emailsOpened: 4,
        callsMade: 2,
        meetingsHeld: 1,
        proposalsSent: 0,
        
        aiProbability: 45,
        riskFactors: ['Early stage', 'Competitor evaluation'],
        predictedCloseDate: '2024-03-20',
        confidenceLevel: 0.52,
        
        products: [
          { name: 'Marketing Platform', quantity: 1, unitPrice: 40000, totalValue: 40000 },
          { name: 'Setup & Training', quantity: 1, unitPrice: 15000, totalValue: 15000 },
        ],
        
        nextSteps: [
          'Discovery call',
          'Needs assessment',
          'Competitive positioning',
        ],
        
        tags: ['Marketing', 'SaaS', 'Competitive'],
      },
      {
        id: '4',
        name: 'Data Analytics Platform',
        value: 95000,
        stage: 'Closed Won',
        probability: 100,
        closeDate: '2024-01-18',
        createdDate: '2023-10-15',
        lastModifiedDate: '2024-01-18',
        account: 'Analytics Corp',
        accountId: 'acc_4',
        contact: 'Lisa Chen',
        contactId: 'contact_4',
        owner: 'Jane Doe',
        ownerId: 'user_2',
        leadSource: 'LinkedIn',
        competitorPresence: false,
        
        stageHistory: [
          { fromStage: 'Lead', toStage: 'Qualification', timestamp: '2023-10-20T10:15:00Z', daysInPreviousStage: 5 },
          { fromStage: 'Qualification', toStage: 'Needs Analysis', timestamp: '2023-11-05T14:30:00Z', daysInPreviousStage: 16 },
          { fromStage: 'Needs Analysis', toStage: 'Proposal', timestamp: '2023-12-01T09:45:00Z', daysInPreviousStage: 26 },
          { fromStage: 'Proposal', toStage: 'Negotiation', timestamp: '2023-12-20T16:20:00Z', daysInPreviousStage: 19 },
          { fromStage: 'Negotiation', toStage: 'Closed Won', timestamp: '2024-01-18T12:00:00Z', daysInPreviousStage: 29 },
        ],
        
        emailsSent: 22,
        emailsOpened: 20,
        callsMade: 12,
        meetingsHeld: 6,
        proposalsSent: 3,
        
        aiProbability: 100,
        riskFactors: [],
        predictedCloseDate: '2024-01-18',
        confidenceLevel: 1.0,
        
        products: [
          { name: 'Analytics Platform', quantity: 1, unitPrice: 75000, totalValue: 75000 },
          { name: 'Implementation', quantity: 1, unitPrice: 20000, totalValue: 20000 },
        ],
        
        nextSteps: [
          'Implementation kickoff',
          'Customer success handoff',
          'Expansion opportunities',
        ],
        
        tags: ['Analytics', 'Closed Won', 'Expansion'],
      },
    ];

    // Filter deals based on query parameters
    let filteredDeals = allDeals;
    
    if (stage) {
      filteredDeals = filteredDeals.filter(deal => deal.stage === stage);
    }
    
    if (ownerId) {
      filteredDeals = filteredDeals.filter(deal => deal.ownerId === ownerId);
    }

    // Generate forecast data
    const forecastData = generateForecastData(filteredDeals, forecastPeriod);
    
    // Calculate pipeline metrics
    const pipelineMetrics = calculatePipelineMetrics(filteredDeals);

    return NextResponse.json({
      success: true,
      deals: filteredDeals,
      forecast: forecastData,
      metrics: pipelineMetrics,
      summary: {
        totalDeals: filteredDeals.length,
        totalValue: filteredDeals.reduce((sum, deal) => sum + deal.value, 0),
        weightedValue: filteredDeals.reduce((sum, deal) => sum + (deal.value * deal.probability / 100), 0),
        averageDealSize: filteredDeals.length > 0 ? filteredDeals.reduce((sum, deal) => sum + deal.value, 0) / filteredDeals.length : 0,
        dealsByStage: filteredDeals.reduce((acc, deal) => {
          acc[deal.stage] = (acc[deal.stage] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    console.error('Sales deals API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch deals data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, dealId, dealData, forecastParams } = body;

    switch (action) {
      case 'generate_forecast':
        const forecast = {
          period: forecastParams?.period || 'quarter',
          totalPipelineValue: 2450000,
          weightedPipelineValue: 980000,
          predictedClosedWon: 750000,
          confidenceInterval: {
            low: 650000,
            high: 850000,
          },
          riskAdjustedForecast: 680000,
          insights: [
            'Q1 forecast looks strong with 78% confidence',
            '12 deals in late-stage negotiations',
            'Enterprise deals showing higher close rates',
          ],
          riskFactors: [
            '3 deals facing competitive pressure',
            '2 deals pending budget approval',
            'Economic uncertainty affecting 15% of pipeline',
          ],
          recommendations: [
            'Focus on closing 5 highest probability deals',
            'Accelerate proposal process for mid-stage deals',
            'Increase competitive differentiation activities',
          ],
        };
        
        return NextResponse.json({
          success: true,
          forecast,
        });

      case 'update_deal':
        // Update deal information
        return NextResponse.json({
          success: true,
          deal: {
            ...dealData,
            id: dealId,
            lastModifiedDate: new Date().toISOString(),
          },
        });

      case 'create_deal':
        // Create new deal
        const newDeal = {
          id: 'deal_' + Date.now(),
          ...dealData,
          createdDate: new Date().toISOString(),
          lastModifiedDate: new Date().toISOString(),
        };
        
        return NextResponse.json({
          success: true,
          deal: newDeal,
        });

      default:
        return NextResponse.json({
          error: 'Invalid action',
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Sales deals POST API error:', error);
    return NextResponse.json({
      error: 'Failed to process deal action',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper functions
function generateForecastData(deals: any[], period: string) {
  const now = new Date();
  let endDate: Date;
  
  switch (period) {
    case 'month':
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'quarter':
      const quarterEnd = Math.floor(now.getMonth() / 3) * 3 + 3;
      endDate = new Date(now.getFullYear(), quarterEnd, 0);
      break;
    case 'year':
      endDate = new Date(now.getFullYear(), 11, 31);
      break;
    default:
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  const relevantDeals = deals.filter(deal => {
    const closeDate = new Date(deal.closeDate);
    return closeDate <= endDate && !['Closed Won', 'Closed Lost'].includes(deal.stage);
  });

  return {
    period,
    totalPipelineValue: relevantDeals.reduce((sum, deal) => sum + deal.value, 0),
    weightedPipelineValue: relevantDeals.reduce((sum, deal) => sum + (deal.value * deal.probability / 100), 0),
    dealCount: relevantDeals.length,
    averageDealSize: relevantDeals.length > 0 ? relevantDeals.reduce((sum, deal) => sum + deal.value, 0) / relevantDeals.length : 0,
  };
}

function calculatePipelineMetrics(deals: any[]) {
  const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
  const weightedValue = deals.reduce((sum, deal) => sum + (deal.value * deal.probability / 100), 0);
  
  const stageMetrics = deals.reduce((acc, deal) => {
    if (!acc[deal.stage]) {
      acc[deal.stage] = { count: 0, value: 0, avgProbability: 0 };
    }
    acc[deal.stage].count++;
    acc[deal.stage].value += deal.value;
    acc[deal.stage].avgProbability += deal.probability;
    return acc;
  }, {} as Record<string, any>);

  // Calculate average probability for each stage
  Object.keys(stageMetrics).forEach(stage => {
    stageMetrics[stage].avgProbability = stageMetrics[stage].avgProbability / stageMetrics[stage].count;
  });

  const velocityMetrics = deals
    .filter(deal => deal.stageHistory.length > 0)
    .map(deal => {
      const totalDays = deal.stageHistory.reduce((sum, change) => sum + change.daysInPreviousStage, 0);
      return totalDays;
    });
  
  const avgSalesCycle = velocityMetrics.length > 0 ? 
    velocityMetrics.reduce((sum, days) => sum + days, 0) / velocityMetrics.length : 0;

  return {
    totalValue,
    weightedValue,
    averageDealSize: deals.length > 0 ? totalValue / deals.length : 0,
    averageSalesCycle: avgSalesCycle,
    stageMetrics,
    winRate: deals.length > 0 ? (deals.filter(d => d.stage === 'Closed Won').length / deals.length) * 100 : 0,
  };
}