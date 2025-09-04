import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/AuthManager';
import { supabase } from '@/lib/database/supabase';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const platform = searchParams.get('platform'); // optional filter
    const campaignId = searchParams.get('campaignId'); // optional filter

    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Base query for posts with metrics
    let postsQuery = supabase
      .from('social_posts')
      .select(`
        *,
        social_accounts!inner (
          platform,
          account_name,
          user_id
        ),
        social_campaigns (
          id,
          name
        )
      `)
      .eq('social_accounts.user_id', session.userId)
      .eq('status', 'published')
      .gte('published_at', startDate.toISOString());

    if (platform) {
      postsQuery = postsQuery.eq('social_accounts.platform', platform);
    }

    if (campaignId) {
      postsQuery = postsQuery.eq('campaign_id', campaignId);
    }

    const { data: posts, error: postsError } = await postsQuery;

    if (postsError) {
      console.error('Error fetching posts for analytics:', postsError);
      return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
    }

    // Get social accounts stats
    const { data: accounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', session.userId)
      .eq('status', 'active');

    if (accountsError) {
      console.error('Error fetching accounts for analytics:', accountsError);
    }

    // Process analytics data
    const analytics = processAnalyticsData(posts || [], accounts || [], periodDays);

    return NextResponse.json({
      success: true,
      analytics,
      period: `${periodDays} days`,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function processAnalyticsData(posts: any[], accounts: any[], periodDays: number) {
  // Calculate total metrics
  const totalMetrics = posts.reduce((acc, post) => {
    const metrics = post.metrics || {};
    return {
      likes: acc.likes + (metrics.likes || 0),
      shares: acc.shares + (metrics.shares || 0),
      comments: acc.comments + (metrics.comments || 0),
      reach: acc.reach + (metrics.reach || 0),
      impressions: acc.impressions + (metrics.impressions || 0),
      clicks: acc.clicks + (metrics.clicks || 0)
    };
  }, { likes: 0, shares: 0, comments: 0, reach: 0, impressions: 0, clicks: 0 });

  // Calculate engagement rate
  const totalEngagements = totalMetrics.likes + totalMetrics.shares + totalMetrics.comments;
  const engagementRate = totalMetrics.reach > 0 ? (totalEngagements / totalMetrics.reach) * 100 : 0;

  // Platform breakdown
  const platformStats = accounts.map(account => {
    const platformPosts = posts.filter(post => post.social_accounts.platform === account.platform);
    const platformMetrics = platformPosts.reduce((acc, post) => {
      const metrics = post.metrics || {};
      return {
        likes: acc.likes + (metrics.likes || 0),
        shares: acc.shares + (metrics.shares || 0),
        comments: acc.comments + (metrics.comments || 0),
        reach: acc.reach + (metrics.reach || 0),
        impressions: acc.impressions + (metrics.impressions || 0)
      };
    }, { likes: 0, shares: 0, comments: 0, reach: 0, impressions: 0 });

    const platformEngagements = platformMetrics.likes + platformMetrics.shares + platformMetrics.comments;
    const platformEngagementRate = platformMetrics.reach > 0 ? (platformEngagements / platformMetrics.reach) * 100 : 0;

    return {
      platform: account.platform,
      account_name: account.account_name,
      posts_count: platformPosts.length,
      followers: account.metadata?.followers_count || 0,
      metrics: platformMetrics,
      engagement_rate: platformEngagementRate,
      avg_engagement_per_post: platformPosts.length > 0 ? platformEngagements / platformPosts.length : 0,
      best_performing_post: platformPosts.length > 0 
        ? platformPosts.reduce((best, post) => {
            const postEngagement = (post.metrics?.likes || 0) + (post.metrics?.shares || 0) + (post.metrics?.comments || 0);
            const bestEngagement = (best.metrics?.likes || 0) + (best.metrics?.shares || 0) + (best.metrics?.comments || 0);
            return postEngagement > bestEngagement ? post : best;
          })
        : null
    };
  });

  // Time series data (daily breakdown)
  const timeSeriesData = generateTimeSeriesData(posts, periodDays);

  // Top performing posts
  const topPosts = posts
    .map(post => ({
      id: post.id,
      platform: post.social_accounts.platform,
      content: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
      published_at: post.published_at,
      engagement_score: (post.metrics?.likes || 0) + (post.metrics?.shares || 0) + (post.metrics?.comments || 0),
      metrics: post.metrics || {},
      campaign: post.social_campaigns?.name || null
    }))
    .sort((a, b) => b.engagement_score - a.engagement_score)
    .slice(0, 10);

  // Content analysis
  const contentInsights = analyzeContent(posts);

  // Growth metrics (comparing with previous period)
  const growthMetrics = calculateGrowthMetrics(posts, accounts, periodDays);

  return {
    overview: {
      total_posts: posts.length,
      total_accounts: accounts.length,
      period_days: periodDays,
      metrics: totalMetrics,
      engagement_rate: engagementRate,
      avg_engagement_per_post: posts.length > 0 ? totalEngagements / posts.length : 0,
      reach_per_follower: getTotalFollowers(accounts) > 0 ? totalMetrics.reach / getTotalFollowers(accounts) : 0
    },
    platform_breakdown: platformStats,
    time_series: timeSeriesData,
    top_posts: topPosts,
    content_insights: contentInsights,
    growth_metrics: growthMetrics,
    recommendations: generateRecommendations(platformStats, posts, contentInsights)
  };
}

function generateTimeSeriesData(posts: any[], periodDays: number) {
  const timeSeriesData = [];
  const now = new Date();

  for (let i = periodDays - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];

    const dayPosts = posts.filter(post => 
      post.published_at && post.published_at.split('T')[0] === dateString
    );

    const dayMetrics = dayPosts.reduce((acc, post) => {
      const metrics = post.metrics || {};
      return {
        posts: acc.posts + 1,
        likes: acc.likes + (metrics.likes || 0),
        shares: acc.shares + (metrics.shares || 0),
        comments: acc.comments + (metrics.comments || 0),
        reach: acc.reach + (metrics.reach || 0),
        impressions: acc.impressions + (metrics.impressions || 0)
      };
    }, { posts: 0, likes: 0, shares: 0, comments: 0, reach: 0, impressions: 0 });

    timeSeriesData.push({
      date: dateString,
      ...dayMetrics,
      engagement: dayMetrics.likes + dayMetrics.shares + dayMetrics.comments
    });
  }

  return timeSeriesData;
}

function analyzeContent(posts: any[]) {
  // Hashtag analysis
  const hashtagCounts: Record<string, number> = {};
  const contentLengths: number[] = [];
  const postTimes: Record<string, number> = {};
  
  posts.forEach(post => {
    // Content length
    contentLengths.push(post.content.length);
    
    // Post timing
    if (post.published_at) {
      const hour = new Date(post.published_at).getHours();
      postTimes[hour] = (postTimes[hour] || 0) + 1;
    }
    
    // Hashtag extraction
    const hashtags = post.content.match(/#\w+/g) || [];
    hashtags.forEach(hashtag => {
      const normalized = hashtag.toLowerCase();
      hashtagCounts[normalized] = (hashtagCounts[normalized] || 0) + 1;
    });
  });

  const avgContentLength = contentLengths.length > 0 
    ? contentLengths.reduce((sum, length) => sum + length, 0) / contentLengths.length 
    : 0;

  const topHashtags = Object.entries(hashtagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([hashtag, count]) => ({ hashtag, count }));

  const bestPostingHours = Object.entries(postTimes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([hour, count]) => ({ hour: parseInt(hour), posts: count }));

  return {
    avg_content_length: Math.round(avgContentLength),
    top_hashtags: topHashtags,
    best_posting_hours: bestPostingHours,
    total_hashtags_used: Object.keys(hashtagCounts).length
  };
}

function calculateGrowthMetrics(posts: any[], accounts: any[], periodDays: number) {
  // This is a simplified version - in a real app, you'd compare with previous period data
  const currentPeriodPosts = posts.length;
  const currentPeriodEngagement = posts.reduce((sum, post) => {
    const metrics = post.metrics || {};
    return sum + (metrics.likes || 0) + (metrics.shares || 0) + (metrics.comments || 0);
  }, 0);

  // Mock previous period data (in real app, fetch from database)
  const mockPreviousPosts = Math.floor(currentPeriodPosts * 0.85); // 15% growth assumed
  const mockPreviousEngagement = Math.floor(currentPeriodEngagement * 0.80); // 20% growth assumed

  return {
    posts_growth: currentPeriodPosts > 0 
      ? ((currentPeriodPosts - mockPreviousPosts) / mockPreviousPosts) * 100 
      : 0,
    engagement_growth: currentPeriodEngagement > 0 
      ? ((currentPeriodEngagement - mockPreviousEngagement) / mockPreviousEngagement) * 100 
      : 0,
    followers_growth: 5.2, // Mock data - in real app, track follower changes
    reach_growth: 8.7 // Mock data
  };
}

function getTotalFollowers(accounts: any[]): number {
  return accounts.reduce((sum, account) => sum + (account.metadata?.followers_count || 0), 0);
}

function generateRecommendations(platformStats: any[], posts: any[], contentInsights: any) {
  const recommendations = [];

  // Posting frequency recommendation
  if (posts.length < 10) {
    recommendations.push({
      type: 'posting_frequency',
      priority: 'high',
      title: 'Increase posting frequency',
      description: 'You posted less than 10 times in the selected period. Consistent posting helps maintain audience engagement.',
      action: 'Aim for at least 3-5 posts per week'
    });
  }

  // Platform performance recommendation
  const bestPlatform = platformStats.reduce((best, platform) => 
    platform.engagement_rate > (best?.engagement_rate || 0) ? platform : best
  , null);

  if (bestPlatform) {
    recommendations.push({
      type: 'platform_focus',
      priority: 'medium',
      title: `Focus more on ${bestPlatform.platform}`,
      description: `${bestPlatform.platform} has your highest engagement rate at ${bestPlatform.engagement_rate.toFixed(1)}%`,
      action: `Consider posting more frequently on ${bestPlatform.platform}`
    });
  }

  // Content length recommendation
  if (contentInsights.avg_content_length > 200) {
    recommendations.push({
      type: 'content_length',
      priority: 'low',
      title: 'Consider shorter posts',
      description: `Your average post length is ${contentInsights.avg_content_length} characters. Shorter posts often perform better.`,
      action: 'Try keeping posts under 150 characters'
    });
  }

  // Hashtag recommendation
  if (contentInsights.top_hashtags.length < 5) {
    recommendations.push({
      type: 'hashtags',
      priority: 'medium',
      title: 'Use more hashtags',
      description: 'You\'re using few hashtags. Hashtags help increase discoverability.',
      action: 'Include 3-5 relevant hashtags per post'
    });
  }

  return recommendations;
}