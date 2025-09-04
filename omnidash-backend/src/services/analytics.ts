import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';
import axios from 'axios';

const prisma = new PrismaClient();

export interface AnalyticsMetric {
  brandId: string;
  platform?: string;
  date: Date;
  metricName: string;
  metricValue: number;
  metadata?: Record<string, any>;
}

export interface DashboardMetrics {
  totalFollowers: number;
  totalPosts: number;
  avgEngagementRate: number;
  totalReach: number;
  growthRate: number;
  topPlatforms: Array<{
    platform: string;
    followers: number;
    engagementRate: number;
  }>;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: Date;
    platform?: string;
  }>;
  performanceTrends: Array<{
    date: string;
    engagement: number;
    reach: number;
    followers: number;
  }>;
}

export interface ContentAnalytics {
  topPerformingPosts: Array<{
    id: string;
    content: string;
    platform: string;
    engagementRate: number;
    publishedAt: Date;
    metrics: {
      likes: number;
      shares: number;
      comments: number;
      reach: number;
    };
  }>;
  contentTypePerformance: Record<string, {
    avgEngagement: number;
    totalPosts: number;
    bestTime: string;
  }>;
  hashtagPerformance: Array<{
    hashtag: string;
    usage: number;
    avgEngagement: number;
  }>;
}

export interface AudienceInsights {
  demographics: {
    ageGroups: Record<string, number>;
    locations: Record<string, number>;
    interests: Record<string, number>;
  };
  behaviorPatterns: {
    peakHours: Record<string, number>;
    peakDays: Record<string, number>;
    deviceUsage: Record<string, number>;
  };
  engagementPatterns: {
    mostEngagedAudience: string;
    avgSessionDuration: number;
    bounceRate: number;
  };
}

export class AnalyticsService {
  private googleAnalytics: any;

  constructor() {
    if (process.env.GOOGLE_ANALYTICS_CREDENTIALS) {
      this.initializeGoogleAnalytics();
    }
  }

  private async initializeGoogleAnalytics(): Promise<void> {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_ANALYTICS_CREDENTIALS || '{}');
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/analytics.readonly']
      });

      this.googleAnalytics = google.analyticsdata({ version: 'v1beta', auth });
    } catch (error) {
      console.error('Failed to initialize Google Analytics:', error);
    }
  }

  async collectSocialMediaMetrics(brandId: string): Promise<void> {
    const socialAccounts = await prisma.socialAccount.findMany({
      where: { brandId, isActive: true }
    });

    for (const account of socialAccounts) {
      try {
        await this.collectPlatformMetrics(brandId, account);
      } catch (error) {
        console.error(`Failed to collect metrics for ${account.platform}:`, error);
      }
    }
  }

  private async collectPlatformMetrics(brandId: string, account: any): Promise<void> {
    switch (account.platform) {
      case 'twitter':
        await this.collectTwitterMetrics(brandId, account);
        break;
      case 'instagram':
        await this.collectInstagramMetrics(brandId, account);
        break;
      case 'linkedin':
        await this.collectLinkedInMetrics(brandId, account);
        break;
      case 'tiktok':
        await this.collectTikTokMetrics(brandId, account);
        break;
      case 'facebook':
        await this.collectFacebookMetrics(brandId, account);
        break;
    }
  }

  private async collectTwitterMetrics(brandId: string, account: any): Promise<void> {
    try {
      // Twitter API v2 calls would go here
      const metrics: AnalyticsMetric[] = [
        {
          brandId,
          platform: 'twitter',
          date: new Date(),
          metricName: 'followers_count',
          metricValue: account.followers || 0
        },
        {
          brandId,
          platform: 'twitter',
          date: new Date(),
          metricName: 'following_count',
          metricValue: account.following || 0
        }
      ];

      await this.storeMetrics(metrics);
    } catch (error) {
      console.error('Twitter metrics collection error:', error);
    }
  }

  private async collectInstagramMetrics(brandId: string, account: any): Promise<void> {
    try {
      // Instagram Basic Display API calls would go here
      const metrics: AnalyticsMetric[] = [
        {
          brandId,
          platform: 'instagram',
          date: new Date(),
          metricName: 'followers_count',
          metricValue: account.followers || 0
        }
      ];

      await this.storeMetrics(metrics);
    } catch (error) {
      console.error('Instagram metrics collection error:', error);
    }
  }

  private async collectLinkedInMetrics(brandId: string, account: any): Promise<void> {
    try {
      // LinkedIn API calls would go here
      const metrics: AnalyticsMetric[] = [
        {
          brandId,
          platform: 'linkedin',
          date: new Date(),
          metricName: 'followers_count',
          metricValue: account.followers || 0
        }
      ];

      await this.storeMetrics(metrics);
    } catch (error) {
      console.error('LinkedIn metrics collection error:', error);
    }
  }

  private async collectTikTokMetrics(brandId: string, account: any): Promise<void> {
    try {
      // TikTok API calls would go here
      const metrics: AnalyticsMetric[] = [
        {
          brandId,
          platform: 'tiktok',
          date: new Date(),
          metricName: 'followers_count',
          metricValue: account.followers || 0
        }
      ];

      await this.storeMetrics(metrics);
    } catch (error) {
      console.error('TikTok metrics collection error:', error);
    }
  }

  private async collectFacebookMetrics(brandId: string, account: any): Promise<void> {
    try {
      // Facebook Graph API calls would go here
      const metrics: AnalyticsMetric[] = [
        {
          brandId,
          platform: 'facebook',
          date: new Date(),
          metricName: 'followers_count',
          metricValue: account.followers || 0
        }
      ];

      await this.storeMetrics(metrics);
    } catch (error) {
      console.error('Facebook metrics collection error:', error);
    }
  }

  async collectPostMetrics(postId: string): Promise<void> {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { socialAccount: true }
    });

    if (!post || !post.socialAccount) return;

    try {
      // Platform-specific API calls to get post metrics
      let metrics = {};
      
      switch (post.platform) {
        case 'twitter':
          metrics = await this.getTwitterPostMetrics(post.platformId!);
          break;
        case 'instagram':
          metrics = await this.getInstagramPostMetrics(post.platformId!);
          break;
        // Add other platforms...
      }

      await prisma.postAnalytics.upsert({
        where: {
          postId_date: {
            postId,
            date: new Date()
          }
        },
        update: metrics,
        create: {
          postId,
          date: new Date(),
          ...metrics
        }
      });
    } catch (error) {
      console.error('Post metrics collection error:', error);
    }
  }

  private async getTwitterPostMetrics(tweetId: string): Promise<any> {
    // Twitter API v2 implementation
    return {
      likes: 0,
      shares: 0,
      comments: 0,
      reach: 0,
      impressions: 0,
      engagementRate: 0
    };
  }

  private async getInstagramPostMetrics(postId: string): Promise<any> {
    // Instagram API implementation
    return {
      likes: 0,
      shares: 0,
      comments: 0,
      reach: 0,
      impressions: 0,
      engagementRate: 0
    };
  }

  async getDashboardMetrics(brandId: string, days: number = 30): Promise<DashboardMetrics> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get current followers across all platforms
    const socialAccounts = await prisma.socialAccount.findMany({
      where: { brandId, isActive: true },
      select: {
        platform: true,
        followers: true,
        following: true
      }
    });

    const totalFollowers = socialAccounts.reduce((sum, account) => sum + account.followers, 0);

    // Get posts and their analytics
    const posts = await prisma.post.findMany({
      where: {
        brandId,
        publishedAt: {
          gte: startDate,
          lte: endDate
        },
        status: 'published'
      },
      include: {
        analytics: {
          orderBy: { date: 'desc' },
          take: 1
        }
      }
    });

    const totalPosts = posts.length;
    const totalEngagement = posts.reduce((sum, post) => 
      sum + (post.analytics[0]?.engagementRate || 0), 0
    );
    const avgEngagementRate = totalPosts > 0 ? totalEngagement / totalPosts : 0;
    const totalReach = posts.reduce((sum, post) => 
      sum + (post.analytics[0]?.reach || 0), 0
    );

    // Calculate growth rate (compare to previous period)
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - days);

    const previousMetrics = await prisma.analyticsData.findMany({
      where: {
        brandId,
        metricName: 'followers_count',
        date: {
          gte: previousPeriodStart,
          lt: startDate
        }
      }
    });

    const previousFollowers = previousMetrics.reduce((sum, metric) => sum + metric.metricValue, 0);
    const growthRate = previousFollowers > 0 
      ? ((totalFollowers - previousFollowers) / previousFollowers) * 100 
      : 0;

    // Top platforms by engagement
    const platformEngagement = new Map();
    posts.forEach(post => {
      const platform = post.platform;
      const engagement = post.analytics[0]?.engagementRate || 0;
      
      if (!platformEngagement.has(platform)) {
        platformEngagement.set(platform, { total: 0, count: 0 });
      }
      
      const data = platformEngagement.get(platform);
      data.total += engagement;
      data.count += 1;
    });

    const topPlatforms = Array.from(platformEngagement.entries())
      .map(([platform, data]) => ({
        platform,
        followers: socialAccounts.find(acc => acc.platform === platform)?.followers || 0,
        engagementRate: data.count > 0 ? data.total / data.count : 0
      }))
      .sort((a, b) => b.engagementRate - a.engagementRate);

    // Recent activity
    const recentActivity = await this.getRecentActivity(brandId, 10);

    // Performance trends (last 7 days)
    const performanceTrends = await this.getPerformanceTrends(brandId, 7);

    return {
      totalFollowers,
      totalPosts,
      avgEngagementRate: parseFloat(avgEngagementRate.toFixed(2)),
      totalReach,
      growthRate: parseFloat(growthRate.toFixed(2)),
      topPlatforms,
      recentActivity,
      performanceTrends
    };
  }

  async getContentAnalytics(brandId: string, days: number = 30): Promise<ContentAnalytics> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Top performing posts
    const topPosts = await prisma.post.findMany({
      where: {
        brandId,
        publishedAt: {
          gte: startDate,
          lte: endDate
        },
        status: 'published'
      },
      include: {
        analytics: {
          orderBy: { date: 'desc' },
          take: 1
        }
      },
      orderBy: {
        analytics: {
          _count: 'desc'
        }
      },
      take: 10
    });

    const topPerformingPosts = topPosts
      .filter(post => post.analytics.length > 0)
      .sort((a, b) => (b.analytics[0]?.engagementRate || 0) - (a.analytics[0]?.engagementRate || 0))
      .slice(0, 5)
      .map(post => ({
        id: post.id,
        content: post.content?.substring(0, 100) + '...' || '',
        platform: post.platform,
        engagementRate: post.analytics[0]?.engagementRate || 0,
        publishedAt: post.publishedAt!,
        metrics: {
          likes: post.analytics[0]?.likes || 0,
          shares: post.analytics[0]?.shares || 0,
          comments: post.analytics[0]?.comments || 0,
          reach: post.analytics[0]?.reach || 0
        }
      }));

    // Content type performance
    const contentTypePerformance: Record<string, any> = {};
    const platformData = new Map();

    topPosts.forEach(post => {
      const platform = post.platform;
      const engagement = post.analytics[0]?.engagementRate || 0;
      const hour = post.publishedAt?.getHours() || 12;

      if (!platformData.has(platform)) {
        platformData.set(platform, {
          totalEngagement: 0,
          postCount: 0,
          hours: new Map()
        });
      }

      const data = platformData.get(platform);
      data.totalEngagement += engagement;
      data.postCount += 1;

      const hourCount = data.hours.get(hour) || 0;
      data.hours.set(hour, hourCount + 1);
    });

    platformData.forEach((data, platform) => {
      const bestHour = Array.from(data.hours.entries())
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 12;

      contentTypePerformance[platform] = {
        avgEngagement: data.postCount > 0 ? data.totalEngagement / data.postCount : 0,
        totalPosts: data.postCount,
        bestTime: `${bestHour}:00`
      };
    });

    // Hashtag performance
    const hashtagMap = new Map();
    topPosts.forEach(post => {
      if (post.hashtags) {
        post.hashtags.forEach(hashtag => {
          if (!hashtagMap.has(hashtag)) {
            hashtagMap.set(hashtag, {
              usage: 0,
              totalEngagement: 0
            });
          }
          
          const data = hashtagMap.get(hashtag);
          data.usage += 1;
          data.totalEngagement += post.analytics[0]?.engagementRate || 0;
        });
      }
    });

    const hashtagPerformance = Array.from(hashtagMap.entries())
      .map(([hashtag, data]) => ({
        hashtag,
        usage: data.usage,
        avgEngagement: data.usage > 0 ? data.totalEngagement / data.usage : 0
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 10);

    return {
      topPerformingPosts,
      contentTypePerformance,
      hashtagPerformance
    };
  }

  async getAudienceInsights(brandId: string): Promise<AudienceInsights> {
    // This would typically integrate with Google Analytics and social platform APIs
    // For now, returning mock data structure
    
    return {
      demographics: {
        ageGroups: {
          '18-24': 25,
          '25-34': 35,
          '35-44': 20,
          '45-54': 15,
          '55+': 5
        },
        locations: {
          'United States': 40,
          'United Kingdom': 15,
          'Canada': 12,
          'Australia': 8,
          'Other': 25
        },
        interests: {
          'Technology': 30,
          'Business': 25,
          'Marketing': 20,
          'Design': 15,
          'Other': 10
        }
      },
      behaviorPatterns: {
        peakHours: {
          '9': 15,
          '12': 20,
          '15': 18,
          '18': 25,
          '21': 22
        },
        peakDays: {
          'Monday': 18,
          'Tuesday': 20,
          'Wednesday': 22,
          'Thursday': 20,
          'Friday': 15,
          'Saturday': 3,
          'Sunday': 2
        },
        deviceUsage: {
          'Mobile': 65,
          'Desktop': 30,
          'Tablet': 5
        }
      },
      engagementPatterns: {
        mostEngagedAudience: '25-34 age group',
        avgSessionDuration: 3.5,
        bounceRate: 35
      }
    };
  }

  async generateReport(
    brandId: string,
    reportType: 'daily' | 'weekly' | 'monthly',
    format: 'json' | 'pdf' = 'json'
  ): Promise<any> {
    const days = reportType === 'daily' ? 1 : reportType === 'weekly' ? 7 : 30;
    
    const [dashboardMetrics, contentAnalytics, audienceInsights] = await Promise.all([
      this.getDashboardMetrics(brandId, days),
      this.getContentAnalytics(brandId, days),
      this.getAudienceInsights(brandId)
    ]);

    const report = {
      brandId,
      reportType,
      generatedAt: new Date().toISOString(),
      period: {
        days,
        endDate: new Date().toISOString(),
        startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      },
      summary: {
        totalFollowers: dashboardMetrics.totalFollowers,
        totalPosts: dashboardMetrics.totalPosts,
        avgEngagementRate: dashboardMetrics.avgEngagementRate,
        growthRate: dashboardMetrics.growthRate
      },
      dashboard: dashboardMetrics,
      content: contentAnalytics,
      audience: audienceInsights
    };

    if (format === 'pdf') {
      // PDF generation would go here
      return { reportId: 'pdf-report-id', downloadUrl: '/api/reports/download/pdf-report-id' };
    }

    return report;
  }

  private async storeMetrics(metrics: AnalyticsMetric[]): Promise<void> {
    for (const metric of metrics) {
      await prisma.analyticsData.upsert({
        where: {
          brandId_platform_date_metricName: {
            brandId: metric.brandId,
            platform: metric.platform || '',
            date: metric.date,
            metricName: metric.metricName
          }
        },
        update: {
          metricValue: metric.metricValue,
          metadata: metric.metadata
        },
        create: metric
      });
    }
  }

  private async getRecentActivity(brandId: string, limit: number): Promise<any[]> {
    const [recentPosts, recentWorkflows] = await Promise.all([
      prisma.post.findMany({
        where: { brandId },
        orderBy: { createdAt: 'desc' },
        take: limit / 2,
        select: {
          id: true,
          platform: true,
          status: true,
          createdAt: true,
          publishedAt: true
        }
      }),
      prisma.automationLog.findMany({
        where: {
          workflow: { brandId }
        },
        orderBy: { executedAt: 'desc' },
        take: limit / 2,
        include: {
          workflow: { select: { name: true } }
        }
      })
    ]);

    const activities = [];

    recentPosts.forEach(post => {
      activities.push({
        type: 'post',
        description: `${post.status} post on ${post.platform}`,
        timestamp: post.publishedAt || post.createdAt,
        platform: post.platform
      });
    });

    recentWorkflows.forEach(log => {
      activities.push({
        type: 'workflow',
        description: `Executed workflow: ${log.workflow.name}`,
        timestamp: log.executedAt,
        platform: undefined
      });
    });

    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  private async getPerformanceTrends(brandId: string, days: number): Promise<any[]> {
    const trends = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const dayMetrics = await prisma.analyticsData.findMany({
        where: {
          brandId,
          date: {
            gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
          }
        }
      });

      const engagement = dayMetrics
        .filter(m => m.metricName === 'engagement_rate')
        .reduce((sum, m) => sum + m.metricValue, 0);
      
      const reach = dayMetrics
        .filter(m => m.metricName === 'reach')
        .reduce((sum, m) => sum + m.metricValue, 0);
      
      const followers = dayMetrics
        .filter(m => m.metricName === 'followers_count')
        .reduce((sum, m) => sum + m.metricValue, 0);

      trends.push({
        date: date.toISOString().split('T')[0],
        engagement: parseFloat(engagement.toFixed(2)),
        reach,
        followers
      });
    }

    return trends;
  }
}