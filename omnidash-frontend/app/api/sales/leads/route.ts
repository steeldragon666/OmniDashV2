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
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const scoreMin = parseInt(searchParams.get('score_min') || '0');
    const stage = searchParams.get('stage');
    const source = searchParams.get('source');

    // Mock lead data - in production, this would query CRM APIs
    const allLeads = [
      {
        id: '1',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@techcorp.com',
        company: 'TechCorp Solutions',
        jobTitle: 'VP of Engineering',
        phone: '+1-555-0123',
        score: 92,
        grade: 'A',
        stage: 'Qualified',
        value: 45000,
        probability: 85,
        lastActivity: '2 hours ago',
        source: 'Website',
        location: 'San Francisco, CA',
        industry: 'Technology',
        companySize: 250,
        leadSource: 'Organic Search',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-20T15:45:00Z',
        engagementScore: 88,
        behaviorMetrics: {
          emailOpens: 12,
          emailClicks: 8,
          websiteVisits: 15,
          pagesViewed: 45,
          formSubmissions: 3,
          contentDownloads: 2,
        },
        insights: [
          'High engagement across multiple touchpoints',
          'Senior decision maker profile',
          'Company shows strong intent signals',
        ],
        recommendedActions: [
          'Schedule executive demo',
          'Send case study for similar company size',
          'Follow up within 24 hours',
        ],
      },
      {
        id: '2',
        name: 'Michael Chen',
        email: 'mchen@innovate.co',
        company: 'Innovate Co',
        jobTitle: 'CTO',
        phone: '+1-555-0124',
        score: 78,
        grade: 'B',
        stage: 'Demo Scheduled',
        value: 28000,
        probability: 65,
        lastActivity: '1 day ago',
        source: 'Referral',
        location: 'Austin, TX',
        industry: 'Software',
        companySize: 85,
        leadSource: 'Partner Referral',
        createdAt: '2024-01-12T14:20:00Z',
        updatedAt: '2024-01-19T09:15:00Z',
        engagementScore: 72,
        behaviorMetrics: {
          emailOpens: 8,
          emailClicks: 5,
          websiteVisits: 8,
          pagesViewed: 22,
          formSubmissions: 2,
          contentDownloads: 4,
        },
        insights: [
          'Technical decision maker',
          'Strong referral signal',
          'Above-average content consumption',
        ],
        recommendedActions: [
          'Prepare technical demo',
          'Share technical documentation',
          'Connect with referring partner',
        ],
      },
      {
        id: '3',
        name: 'Emily Rodriguez',
        email: 'emily.r@startup.io',
        company: 'Startup Inc',
        jobTitle: 'Head of Operations',
        phone: '+1-555-0125',
        score: 85,
        grade: 'A',
        stage: 'Proposal Sent',
        value: 35000,
        probability: 75,
        lastActivity: '3 hours ago',
        source: 'LinkedIn',
        location: 'New York, NY',
        industry: 'Technology',
        companySize: 45,
        leadSource: 'LinkedIn Ads',
        createdAt: '2024-01-10T11:45:00Z',
        updatedAt: '2024-01-20T12:30:00Z',
        engagementScore: 91,
        behaviorMetrics: {
          emailOpens: 15,
          emailClicks: 12,
          websiteVisits: 20,
          pagesViewed: 62,
          formSubmissions: 4,
          contentDownloads: 6,
        },
        insights: [
          'Extremely high engagement levels',
          'Fast-growing startup profile',
          'Active in evaluation phase',
        ],
        recommendedActions: [
          'Follow up on proposal immediately',
          'Offer startup-friendly pricing',
          'Schedule decision maker call',
        ],
      },
      {
        id: '4',
        name: 'David Kumar',
        email: 'dkumar@enterprise.com',
        company: 'Enterprise Solutions',
        jobTitle: 'Director of IT',
        phone: '+1-555-0126',
        score: 67,
        grade: 'B',
        stage: 'Needs Analysis',
        value: 75000,
        probability: 45,
        lastActivity: '2 days ago',
        source: 'Trade Show',
        location: 'Chicago, IL',
        industry: 'Manufacturing',
        companySize: 1200,
        leadSource: 'Trade Show',
        createdAt: '2024-01-08T16:10:00Z',
        updatedAt: '2024-01-18T14:22:00Z',
        engagementScore: 58,
        behaviorMetrics: {
          emailOpens: 5,
          emailClicks: 2,
          websiteVisits: 4,
          pagesViewed: 12,
          formSubmissions: 1,
          contentDownloads: 1,
        },
        insights: [
          'Large enterprise opportunity',
          'Lower engagement needs attention',
          'Long sales cycle expected',
        ],
        recommendedActions: [
          'Increase touchpoint frequency',
          'Send enterprise-focused content',
          'Schedule needs assessment call',
        ],
      },
      {
        id: '5',
        name: 'Lisa Thompson',
        email: 'lthompson@consulting.biz',
        company: 'Strategic Consulting',
        jobTitle: 'Partner',
        phone: '+1-555-0127',
        score: 94,
        grade: 'A',
        stage: 'Negotiation',
        value: 85000,
        probability: 90,
        lastActivity: '30 minutes ago',
        source: 'Website',
        location: 'Boston, MA',
        industry: 'Consulting',
        companySize: 320,
        leadSource: 'Organic Search',
        createdAt: '2024-01-05T13:25:00Z',
        updatedAt: '2024-01-20T16:30:00Z',
        engagementScore: 96,
        behaviorMetrics: {
          emailOpens: 18,
          emailClicks: 15,
          websiteVisits: 25,
          pagesViewed: 78,
          formSubmissions: 5,
          contentDownloads: 8,
        },
        insights: [
          'Highest scoring lead',
          'Senior partner level',
          'Ready to close',
        ],
        recommendedActions: [
          'Finalize contract terms',
          'Prepare implementation timeline',
          'Introduce customer success team',
        ],
      },
    ];

    // Filter leads based on query parameters
    const filteredLeads = allLeads.filter(lead => {
      if (scoreMin && lead.score < scoreMin) return false;
      if (stage && lead.stage !== stage) return false;
      if (source && lead.source !== source) return false;
      return true;
    });

    // Sort by score descending
    filteredLeads.sort((a, b) => b.score - a.score);

    // Apply pagination
    const paginatedLeads = filteredLeads.slice(offset, offset + limit);
    
    return NextResponse.json({
      success: true,
      leads: paginatedLeads,
      pagination: {
        total: filteredLeads.length,
        limit,
        offset,
        hasMore: offset + limit < filteredLeads.length,
      },
      summary: {
        totalLeads: allLeads.length,
        aScore: allLeads.filter(l => l.grade === 'A').length,
        bScore: allLeads.filter(l => l.grade === 'B').length,
        cScore: allLeads.filter(l => l.grade === 'C').length,
        averageScore: Math.round(allLeads.reduce((sum, l) => sum + l.score, 0) / allLeads.length),
        highPriorityLeads: allLeads.filter(l => l.score >= 80).length,
      },
    });
  } catch (error) {
    console.error('Sales leads API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch leads data',
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
    const { action, leadId, leadData } = body;

    switch (action) {
      case 'score_lead':
        // Trigger lead scoring for specific lead
        const scoringResult = {
          leadId,
          previousScore: 65,
          newScore: 82,
          grade: 'B',
          insights: [
            'Recent high engagement detected',
            'Company profile matches ICP',
            'Ready for sales outreach',
          ],
          recommendedActions: [
            'Schedule discovery call',
            'Send personalized demo invitation',
            'Connect on LinkedIn',
          ],
        };
        
        return NextResponse.json({
          success: true,
          result: scoringResult,
        });

      case 'bulk_score':
        // Trigger bulk scoring for all leads
        return NextResponse.json({
          success: true,
          jobId: 'bulk_score_' + Date.now(),
          message: 'Bulk scoring started. You will be notified when complete.',
        });

      case 'create_lead':
        // Create new lead
        const newLead = {
          id: 'lead_' + Date.now(),
          ...leadData,
          score: 0,
          grade: 'F',
          stage: 'New',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        return NextResponse.json({
          success: true,
          lead: newLead,
        });

      default:
        return NextResponse.json({
          error: 'Invalid action',
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Sales leads POST API error:', error);
    return NextResponse.json({
      error: 'Failed to process lead action',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}