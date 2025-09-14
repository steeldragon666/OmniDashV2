import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mock GCP health check data
    const healthStatus = {
      overall: 'healthy',
      timestamp: new Date().toISOString(),
      region: 'australia-southeast2',
      services: {
        compute: {
          status: 'healthy',
          instances: {
            total: 15,
            running: 12,
            stopped: 2,
            error: 1,
          },
          responseTime: 245,
          uptime: 99.9,
        },
        storage: {
          status: 'healthy',
          buckets: {
            total: 8,
            accessible: 8,
          },
          totalSize: '2.4TB',
          usage: 67.3,
          responseTime: 89,
          uptime: 99.99,
        },
        database: {
          status: 'warning',
          instances: {
            total: 4,
            available: 3,
            maintenance: 1,
          },
          connections: {
            active: 234,
            max: 500,
          },
          responseTime: 156,
          uptime: 99.8,
          issues: ['Instance db-prod-2 scheduled for maintenance'],
        },
        networking: {
          status: 'healthy',
          vpcs: 3,
          subnets: 12,
          firewallRules: 28,
          loadBalancers: {
            total: 6,
            healthy: 6,
          },
          responseTime: 34,
          uptime: 99.95,
        },
        kubernetes: {
          status: 'healthy',
          clusters: {
            total: 3,
            running: 3,
          },
          nodes: {
            total: 18,
            ready: 18,
          },
          pods: {
            total: 145,
            running: 142,
            pending: 2,
            failed: 1,
          },
          responseTime: 178,
          uptime: 99.7,
        },
        cloudRun: {
          status: 'healthy',
          services: {
            total: 12,
            active: 11,
            inactive: 1,
          },
          requests: {
            total: 156420,
            errors: 234,
            errorRate: 0.15,
          },
          responseTime: 234,
          uptime: 99.85,
        },
      },
      quotas: {
        compute: {
          used: 12,
          limit: 50,
          percentage: 24,
        },
        storage: {
          used: 2400,
          limit: 5000,
          unit: 'GB',
          percentage: 48,
        },
        api_requests: {
          used: 156420,
          limit: 1000000,
          percentage: 15.6,
          resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      },
      billing: {
        currentMonth: {
          cost: 1245.67,
          currency: 'USD',
          trend: 'increasing',
          forecastedTotal: 1890.45,
        },
        budget: {
          limit: 2000,
          alertThreshold: 80,
          currentPercentage: 62.3,
        },
      },
      alerts: [
        {
          id: 'alert-1',
          severity: 'warning',
          service: 'database',
          message: 'Database instance scheduled for maintenance',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          status: 'acknowledged',
        },
        {
          id: 'alert-2',
          severity: 'info',
          service: 'billing',
          message: 'Monthly spend approaching 65% of budget',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'new',
        },
      ],
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(healthStatus);
  } catch (error) {
    console.error('GCP Health Check error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GCP health status' },
      { status: 500 }
    );
  }
}