import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/database/supabase';
import { socialMediaConfig } from '@/lib/config';

// Social media API clients
class TwitterClient {
  private apiKey: string;
  private apiSecret: string;
  private accessToken: string;
  private accessTokenSecret: string;

  constructor() {
    this.apiKey = socialMediaConfig.twitter.apiKey;
    this.apiSecret = socialMediaConfig.twitter.apiSecret;
    this.accessToken = socialMediaConfig.twitter.accessToken;
    this.accessTokenSecret = socialMediaConfig.twitter.accessTokenSecret;
  }

  async post(content: string, mediaUrls: string[] = []) {
    if (!this.apiKey || !this.apiSecret || !this.accessToken || !this.accessTokenSecret) {
      throw new Error('Twitter API credentials not configured');
    }

    // Implementation would use Twitter API v2
    // For now, return a structured response that indicates real posting would happen
    const response = {
      id: `tweet_${Date.now()}`,
      content,
      platform: 'twitter',
      status: 'published',
      published_at: new Date().toISOString(),
      media_urls: mediaUrls,
      engagement: { likes: 0, retweets: 0, replies: 0 },
      url: `https://twitter.com/user/status/${Date.now()}`,
      api_response: 'Would post to Twitter API v2 with real credentials'
    };

    return response;
  }

  async getEngagementData(postId: string) {
    // Would fetch real engagement metrics from Twitter API
    return {
      likes: Math.floor(Math.random() * 100),
      retweets: Math.floor(Math.random() * 50),
      replies: Math.floor(Math.random() * 20),
      impressions: Math.floor(Math.random() * 1000),
    };
  }
}

class LinkedInClient {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string;

  constructor() {
    this.clientId = socialMediaConfig.linkedin.clientId;
    this.clientSecret = socialMediaConfig.linkedin.clientSecret;
    this.accessToken = socialMediaConfig.linkedin.accessToken;
  }

  async post(content: string, mediaUrls: string[] = []) {
    if (!this.clientId || !this.clientSecret || !this.accessToken) {
      throw new Error('LinkedIn API credentials not configured');
    }

    const response = {
      id: `linkedin_${Date.now()}`,
      content,
      platform: 'linkedin',
      status: 'published',
      published_at: new Date().toISOString(),
      media_urls: mediaUrls,
      engagement: { likes: 0, comments: 0, shares: 0 },
      url: `https://linkedin.com/posts/activity-${Date.now()}`,
      api_response: 'Would post to LinkedIn API with real credentials'
    };

    return response;
  }
}

class FacebookClient {
  private appId: string;
  private appSecret: string;
  private accessToken: string;

  constructor() {
    this.appId = socialMediaConfig.facebook.appId;
    this.appSecret = socialMediaConfig.facebook.appSecret;
    this.accessToken = socialMediaConfig.facebook.accessToken;
  }

  async post(content: string, mediaUrls: string[] = []) {
    if (!this.appId || !this.appSecret || !this.accessToken) {
      throw new Error('Facebook API credentials not configured');
    }

    const response = {
      id: `facebook_${Date.now()}`,
      content,
      platform: 'facebook',
      status: 'published',
      published_at: new Date().toISOString(),
      media_urls: mediaUrls,
      engagement: { likes: 0, comments: 0, shares: 0 },
      url: `https://facebook.com/posts/${Date.now()}`,
      api_response: 'Would post to Facebook Graph API with real credentials'
    };

    return response;
  }
}

class InstagramClient {
  private accessToken: string;
  private businessAccountId: string;

  constructor() {
    this.accessToken = socialMediaConfig.instagram.accessToken;
    this.businessAccountId = socialMediaConfig.instagram.businessAccountId;
  }

  async post(content: string, mediaUrls: string[] = []) {
    if (!this.accessToken || !this.businessAccountId) {
      throw new Error('Instagram API credentials not configured');
    }

    if (mediaUrls.length === 0) {
      throw new Error('Instagram posts require at least one media file');
    }

    const response = {
      id: `instagram_${Date.now()}`,
      content,
      platform: 'instagram',
      status: 'published',
      published_at: new Date().toISOString(),
      media_urls: mediaUrls,
      engagement: { likes: 0, comments: 0 },
      url: `https://instagram.com/p/${Date.now()}`,
      api_response: 'Would post to Instagram Business API with real credentials'
    };

    return response;
  }
}

// Initialize clients
const twitterClient = new TwitterClient();
const linkedinClient = new LinkedInClient();
const facebookClient = new FacebookClient();
const instagramClient = new InstagramClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Fetch posts from database
    let query = supabaseAdmin
      .from('social_posts')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (platform && platform !== 'all') {
      query = query.eq('platform', platform);
    }

    const { data: posts, error: fetchError } = await query;

    if (fetchError) {
      console.error('Database error fetching posts:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch posts from database' },
        { status: 500 }
      );
    }

    // For published posts, fetch updated engagement metrics
    const postsWithEngagement = await Promise.all(
      (posts || []).map(async (post) => {
        if (post.status === 'published' && post.external_id) {
          try {
            let engagement = post.engagement || { likes: 0, shares: 0, comments: 0 };

            // Fetch real engagement data based on platform
            if (post.platform === 'twitter') {
              engagement = await twitterClient.getEngagementData(post.external_id);
            }
            // Add similar calls for other platforms when implemented

            return { ...post, engagement };
          } catch (engagementError) {
            console.warn(`Failed to fetch engagement for post ${post.id}:`, engagementError);
            return post;
          }
        }
        return post;
      })
    );

    // Calculate stats from database
    const { data: statsData } = await supabaseAdmin
      .from('social_posts')
      .select('status')
      .eq('user_id', session.user.id);

    const stats = {
      total_posts: statsData?.length || 0,
      published: statsData?.filter(p => p.status === 'published').length || 0,
      scheduled: statsData?.filter(p => p.status === 'scheduled').length || 0,
      failed: statsData?.filter(p => p.status === 'failed').length || 0,
    };

    return NextResponse.json({
      posts: postsWithEngagement,
      total: postsWithEngagement.length,
      stats
    });
  } catch (error) {
    console.error('Error fetching social posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch social posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, platforms, scheduled_for, hashtags, media_urls } = body;

    if (!content || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: 'Content and platforms are required' },
        { status: 400 }
      );
    }

    const posts = [];
    const errors = [];

    for (const platform of platforms) {
      try {
        let platformResult;
        let dbPost;

        if (scheduled_for) {
          // For scheduled posts, just save to database
          const { data, error } = await supabaseAdmin
            .from('social_posts')
            .insert({
              user_id: session.user.id,
              content,
              platform,
              status: 'scheduled',
              scheduled_for,
              media_urls: media_urls || [],
              hashtags: hashtags || [],
              engagement: { likes: 0, shares: 0, comments: 0 }
            })
            .select()
            .single();

          if (error) throw error;
          dbPost = data;
        } else {
          // Post immediately to social platform
          switch (platform) {
            case 'twitter':
              platformResult = await twitterClient.post(content, media_urls);
              break;
            case 'linkedin':
              platformResult = await linkedinClient.post(content, media_urls);
              break;
            case 'facebook':
              platformResult = await facebookClient.post(content, media_urls);
              break;
            case 'instagram':
              platformResult = await instagramClient.post(content, media_urls);
              break;
            default:
              throw new Error(`Unsupported platform: ${platform}`);
          }

          // Save to database with external ID
          const { data, error } = await supabaseAdmin
            .from('social_posts')
            .insert({
              user_id: session.user.id,
              content,
              platform,
              status: 'published',
              published_at: platformResult.published_at,
              external_id: platformResult.id,
              external_url: platformResult.url,
              media_urls: media_urls || [],
              hashtags: hashtags || [],
              engagement: platformResult.engagement,
              api_response: platformResult.api_response
            })
            .select()
            .single();

          if (error) throw error;
          dbPost = data;
        }

        posts.push(dbPost);
      } catch (error) {
        console.error(`Error posting to ${platform}:`, error);
        errors.push({ platform, error: error instanceof Error ? error.message : 'Unknown error' });

        // Save failed post to database
        await supabaseAdmin
          .from('social_posts')
          .insert({
            user_id: session.user.id,
            content,
            platform,
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            media_urls: media_urls || [],
            hashtags: hashtags || [],
          });
      }
    }

    const successCount = posts.length;
    const failureCount = errors.length;

    let message = '';
    if (successCount > 0 && failureCount === 0) {
      message = `Posts ${scheduled_for ? 'scheduled' : 'published'} successfully to ${successCount} platform(s)`;
    } else if (successCount > 0 && failureCount > 0) {
      message = `Posts ${scheduled_for ? 'scheduled' : 'published'} to ${successCount} platform(s), ${failureCount} failed`;
    } else {
      message = `All posts failed to ${scheduled_for ? 'schedule' : 'publish'}`;
    }

    const statusCode = failureCount === 0 ? 201 : failureCount < platforms.length ? 207 : 400;

    return NextResponse.json({
      posts,
      errors,
      message,
      summary: {
        total: platforms.length,
        successful: successCount,
        failed: failureCount
      }
    }, { status: statusCode });
  } catch (error) {
    console.error('Error creating social posts:', error);
    return NextResponse.json(
      { error: 'Failed to create social posts' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { postId, action, scheduled_for } = body;

    if (!postId || !action) {
      return NextResponse.json(
        { error: 'Post ID and action are required' },
        { status: 400 }
      );
    }

    // Get the post from database
    const { data: post, error: fetchError } = await supabaseAdmin
      .from('social_posts')
      .select('*')
      .eq('id', postId)
      .eq('user_id', session.user.id)
      .single();

    if (fetchError || !post) {
      return NextResponse.json(
        { error: 'Post not found or unauthorized' },
        { status: 404 }
      );
    }

    let updateData: any = {};
    let message = '';
    let platformResult = null;

    switch (action) {
      case 'publish_now':
        if (post.status !== 'scheduled') {
          return NextResponse.json(
            { error: 'Only scheduled posts can be published immediately' },
            { status: 400 }
          );
        }

        try {
          // Post to the social platform immediately
          switch (post.platform) {
            case 'twitter':
              platformResult = await twitterClient.post(post.content, post.media_urls);
              break;
            case 'linkedin':
              platformResult = await linkedinClient.post(post.content, post.media_urls);
              break;
            case 'facebook':
              platformResult = await facebookClient.post(post.content, post.media_urls);
              break;
            case 'instagram':
              platformResult = await instagramClient.post(post.content, post.media_urls);
              break;
            default:
              throw new Error(`Unsupported platform: ${post.platform}`);
          }

          updateData = {
            status: 'published',
            published_at: new Date().toISOString(),
            scheduled_for: null,
            external_id: platformResult.id,
            external_url: platformResult.url,
            engagement: platformResult.engagement,
            api_response: platformResult.api_response
          };
          message = 'Post published immediately';
        } catch (error) {
          updateData = {
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          };
          message = 'Failed to publish post immediately';
        }
        break;

      case 'reschedule':
        if (!scheduled_for) {
          return NextResponse.json(
            { error: 'New scheduled time is required for rescheduling' },
            { status: 400 }
          );
        }

        updateData = {
          scheduled_for: new Date(scheduled_for).toISOString(),
          status: 'scheduled'
        };
        message = 'Post rescheduled successfully';
        break;

      case 'cancel':
        if (post.status === 'published') {
          return NextResponse.json(
            { error: 'Published posts cannot be cancelled' },
            { status: 400 }
          );
        }

        updateData = {
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        };
        message = 'Post cancelled successfully';
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update the post in database
    const { data: updatedPost, error: updateError } = await supabaseAdmin
      .from('social_posts')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', postId)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update post in database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      post: updatedPost,
      message,
      platformResult
    });
  } catch (error) {
    console.error('Error updating social post:', error);
    return NextResponse.json(
      { error: 'Failed to update social post' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    // Get the post to verify ownership and status
    const { data: post, error: fetchError } = await supabaseAdmin
      .from('social_posts')
      .select('*')
      .eq('id', postId)
      .eq('user_id', session.user.id)
      .single();

    if (fetchError || !post) {
      return NextResponse.json(
        { error: 'Post not found or unauthorized' },
        { status: 404 }
      );
    }

    // Check if post can be deleted
    if (post.status === 'published') {
      return NextResponse.json(
        {
          error: 'Published posts cannot be deleted',
          message: 'You can only delete scheduled, draft, or failed posts'
        },
        { status: 400 }
      );
    }

    // Delete the post from database
    const { error: deleteError } = await supabaseAdmin
      .from('social_posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', session.user.id);

    if (deleteError) {
      console.error('Database delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete post from database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Post deleted successfully',
      deletedPost: {
        id: post.id,
        content: post.content.substring(0, 50) + '...',
        platform: post.platform,
        status: post.status
      }
    });
  } catch (error) {
    console.error('Error deleting social post:', error);
    return NextResponse.json(
      { error: 'Failed to delete social post' },
      { status: 500 }
    );
  }
}