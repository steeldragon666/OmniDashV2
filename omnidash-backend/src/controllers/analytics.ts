import { Request, Response } from 'express';
import { AnalyticsService } from '@/services/analytics';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const analyticsService = new AnalyticsService();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class AnalyticsController {
  async getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { days = 30 } = req.query;

      const metrics = await analyticsService.getDashboardMetrics(
        brandId,
        parseInt(days as string)
      );

      res.json({
        success: true,
        metrics,
        period: {
          days: parseInt(days as string),
          endDate: new Date().toISOString(),
          startDate: new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000).toISOString()
        }
      });
    } catch (error) {
      console.error('Get dashboard analytics error:', error);
      res.status(500).json({
        error: 'Failed to fetch dashboard analytics'
      });
    }
  }

  async getContentAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { days = 30 } = req.query;

      const analytics = await analyticsService.getContentAnalytics(
        brandId,
        parseInt(days as string)
      );

      res.json({
        success: true,
        analytics,
        period: {
          days: parseInt(days as string),
          endDate: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Get content analytics error:', error);
      res.status(500).json({
        error: 'Failed to fetch content analytics'
      });
    }
  }

  async getAudienceInsights(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;

      const insights = await analyticsService.getAudienceInsights(brandId);

      res.json({
        success: true,
        insights,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get audience insights error:', error);
      res.status(500).json({
        error: 'Failed to fetch audience insights'
      });
    }
  }

  async getPlatformMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { platform, days = 30 } = req.query;

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days as string));

      const where: any = {
        brandId,
        date: {
          gte: startDate,
          lte: endDate
        }
      };

      if (platform) {
        where.platform = platform;
      }

      const metrics = await prisma.analyticsData.findMany({
        where,
        orderBy: { date: 'desc' }
      });

      // Group by metric name
      const groupedMetrics = metrics.reduce((acc, metric) => {
        if (!acc[metric.metricName]) {
          acc[metric.metricName] = [];
        }
        acc[metric.metricName].push({
          date: metric.date,
          value: metric.metricValue,
          platform: metric.platform,
          metadata: metric.metadata
        });
        return acc;
      }, {} as Record<string, any[]>);

      res.json({
        success: true,
        platform: platform || 'all',
        metrics: groupedMetrics,
        period: {
          days: parseInt(days as string),
          startDate,
          endDate
        }
      });
    } catch (error) {
      console.error('Get platform metrics error:', error);
      res.status(500).json({
        error: 'Failed to fetch platform metrics'
      });
    }
  }

  async getPostPerformance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { postId } = req.params;

      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
          analytics: {
            orderBy: { date: 'desc' }
          },
          socialAccount: {
            select: {
              platform: true,
              username: true
            }
          },
          brand: {
            select: {
              name: true,
              slug: true
            }
          }
        }
      });

      if (!post) {
        res.status(404).json({
          error: 'Post not found'
        });
        return;
      }

      // Calculate performance metrics
      const latestAnalytics = post.analytics[0];
      const performance = {
        post: {
          id: post.id,
          content: post.content,
          platform: post.platform,
          publishedAt: post.publishedAt,
          status: post.status
        },
        account: post.socialAccount,
        brand: post.brand,
        currentMetrics: latestAnalytics ? {
          likes: latestAnalytics.likes,
          shares: latestAnalytics.shares,
          comments: latestAnalytics.comments,
          clicks: latestAnalytics.clicks,
          reach: latestAnalytics.reach,
          impressions: latestAnalytics.impressions,
          engagementRate: latestAnalytics.engagementRate
        } : null,
        historicalData: post.analytics.map(analytics => ({
          date: analytics.date,
          likes: analytics.likes,
          shares: analytics.shares,
          comments: analytics.comments,
          reach: analytics.reach,
          engagementRate: analytics.engagementRate
        })),
        hashtags: post.hashtags,
        mentions: post.mentions
      };

      res.json({
        success: true,
        performance
      });
    } catch (error) {
      console.error('Get post performance error:', error);
      res.status(500).json({
        error: 'Failed to fetch post performance'
      });
    }
  }

  async getCompetitorAnalysis(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { competitors } = req.query;

      // This would require competitor data collection
      // For now, return a placeholder response
      const analysis = {
        brand: await prisma.brand.findUnique({
          where: { id: brandId },
          select: { name: true, industry: true }
        }),
        competitors: [],
        comparison: {
          engagement: {
            brand: 3.5,
            industry: 2.8,
            difference: 0.7
          },
          followers: {
            brand: 10000,
            industry: 8500,
            difference: 1500
          },
          postFrequency: {
            brand: 5,
            industry: 7,
            difference: -2
          }
        },
        opportunities: [
          'Increase posting frequency to match industry average',
          'Engagement rate is above industry average - leverage this strength',
          'Consider video content based on competitor success'
        ]
      };

      res.json({
        success: true,
        analysis,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get competitor analysis error:', error);
      res.status(500).json({
        error: 'Failed to fetch competitor analysis'
      });
    }
  }

  async generateReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { 
        type = 'weekly',
        format = 'json',
        email,
        includeComparison = false
      } = req.body;

      const report = await analyticsService.generateReport(
        brandId,
        type as 'daily' | 'weekly' | 'monthly',
        format as 'json' | 'pdf'
      );

      if (format === 'pdf') {
        res.json({
          success: true,
          message: 'Report generated successfully',
          reportId: report.reportId,
          downloadUrl: report.downloadUrl
        });
      } else {
        res.json({
          success: true,
          report
        });
      }

      // Send email if requested
      if (email && format === 'pdf') {
        // Email service integration would go here
        console.log(`Report would be emailed to: ${email}`);
      }
    } catch (error) {
      console.error('Generate report error:', error);
      res.status(500).json({
        error: 'Failed to generate report'
      });
    }
  }

  async refreshMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { platforms } = req.body;

      // Trigger metrics collection
      if (platforms && Array.isArray(platforms)) {
        // Collect for specific platforms
        for (const platform of platforms) {
          await this.collectPlatformSpecificMetrics(brandId, platform);
        }
      } else {
        // Collect all metrics
        await analyticsService.collectSocialMediaMetrics(brandId);
      }

      res.json({
        success: true,
        message: 'Metrics refresh initiated',
        refreshedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Refresh metrics error:', error);
      res.status(500).json({
        error: 'Failed to refresh metrics'
      });
    }
  }

  async getEngagementTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { days = 30, platform } = req.query;

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days as string));

      const where: any = {
        brandId,
        publishedAt: {
          gte: startDate,
          lte: endDate
        },
        status: 'published'
      };

      if (platform) {
        where.platform = platform;
      }

      const posts = await prisma.post.findMany({
        where,
        include: {
          analytics: {
            orderBy: { date: 'desc' },
            take: 1
          }
        },
        orderBy: { publishedAt: 'asc' }
      });

      // Group by day
      const dailyTrends = new Map();
      
      posts.forEach(post => {
        if (!post.publishedAt || !post.analytics[0]) return;
        
        const date = post.publishedAt.toISOString().split('T')[0];
        
        if (!dailyTrends.has(date)) {
          dailyTrends.set(date, {
            date,
            posts: 0,
            totalEngagement: 0,
            totalReach: 0,
            totalLikes: 0,
            totalShares: 0,
            totalComments: 0
          });
        }
        
        const dayData = dailyTrends.get(date);
        const analytics = post.analytics[0];
        
        dayData.posts += 1;
        dayData.totalEngagement += analytics.engagementRate || 0;
        dayData.totalReach += analytics.reach || 0;
        dayData.totalLikes += analytics.likes || 0;
        dayData.totalShares += analytics.shares || 0;
        dayData.totalComments += analytics.comments || 0;
      });

      const trends = Array.from(dailyTrends.values()).map(day => ({
        ...day,
        avgEngagement: day.posts > 0 ? day.totalEngagement / day.posts : 0
      }));

      res.json({
        success: true,
        trends,
        summary: {
          totalPosts: posts.length,
          avgDailyPosts: trends.length > 0 ? posts.length / trends.length : 0,
          bestDay: trends.sort((a, b) => b.avgEngagement - a.avgEngagement)[0]?.date
        }
      });
    } catch (error) {
      console.error('Get engagement trends error:', error);
      res.status(500).json({
        error: 'Failed to fetch engagement trends'
      });
    }
  }

  async getHashtagAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { days = 30, limit = 20 } = req.query;

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days as string));

      const posts = await prisma.post.findMany({
        where: {
          brandId,
          publishedAt: {
            gte: startDate,
            lte: endDate
          },
          status: 'published',
          hashtags: {
            not: {
              equals: []
            }
          }
        },
        include: {
          analytics: {
            orderBy: { date: 'desc' },
            take: 1
          }
        }
      });

      // Analyze hashtag performance
      const hashtagStats = new Map();
      
      posts.forEach(post => {
        if (!post.hashtags || !post.analytics[0]) return;
        
        const engagement = post.analytics[0].engagementRate || 0;
        const reach = post.analytics[0].reach || 0;
        
        post.hashtags.forEach(hashtag => {
          if (!hashtagStats.has(hashtag)) {
            hashtagStats.set(hashtag, {
              hashtag,
              usage: 0,
              totalEngagement: 0,
              totalReach: 0,
              posts: []
            });
          }
          
          const stats = hashtagStats.get(hashtag);
          stats.usage += 1;
          stats.totalEngagement += engagement;
          stats.totalReach += reach;
          stats.posts.push({
            id: post.id,
            engagement,
            reach,
            publishedAt: post.publishedAt
          });
        });
      });

      const hashtagAnalytics = Array.from(hashtagStats.values())
        .map(stats => ({
          hashtag: stats.hashtag,
          usage: stats.usage,
          avgEngagement: stats.usage > 0 ? stats.totalEngagement / stats.usage : 0,
          totalReach: stats.totalReach,
          avgReach: stats.usage > 0 ? stats.totalReach / stats.usage : 0,
          bestPost: stats.posts.sort((a: any, b: any) => b.engagement - a.engagement)[0]
        }))
        .sort((a, b) => b.avgEngagement - a.avgEngagement)
        .slice(0, parseInt(limit as string));

      res.json({
        success: true,
        hashtags: hashtagAnalytics,
        summary: {
          totalUniqueHashtags: hashtagStats.size,
          totalHashtagUsage: Array.from(hashtagStats.values()).reduce((sum, stats) => sum + stats.usage, 0),
          avgHashtagsPerPost: posts.length > 0 ? 
            posts.reduce((sum, post) => sum + (post.hashtags?.length || 0), 0) / posts.length : 0
        }
      });
    } catch (error) {
      console.error('Get hashtag analytics error:', error);
      res.status(500).json({
        error: 'Failed to fetch hashtag analytics'
      });
    }
  }

  private async collectPlatformSpecificMetrics(brandId: string, platform: string): Promise<void> {
    const socialAccount = await prisma.socialAccount.findFirst({
      where: { brandId, platform, isActive: true }
    });

    if (socialAccount) {
      // Trigger metrics collection for specific platform
      console.log(`Collecting metrics for ${platform} account`);
    }
  }
}