import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/AuthManager';
import { supabase } from '@/lib/database/supabase';

interface CampaignData {
  name: string;
  description: string;
  platforms: string[];
  budget?: number;
  start_date: string;
  end_date: string;
  status?: 'draft' | 'active' | 'paused' | 'completed';
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');

    let query = supabase
      .from('social_campaigns')
      .select(`
        *,
        social_posts (
          id,
          status,
          published_at,
          metrics
        )
      `)
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: campaigns, error } = await query;

    if (error) {
      console.error('Error fetching campaigns:', error);
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }

    // Transform to frontend format with post statistics
    const transformedCampaigns = campaigns?.map(campaign => {
      const posts = campaign.social_posts || [];
      const totalEngagement = posts.reduce((sum: number, post: any) => {
        const metrics = post.metrics || {};
        return sum + (metrics.likes || 0) + (metrics.shares || 0) + (metrics.comments || 0);
      }, 0);

      return {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        platforms: campaign.platforms || [],
        status: campaign.status,
        budget: campaign.budget,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        posts: posts.map((post: any) => ({
          id: post.id,
          status: post.status,
          published_at: post.published_at,
          engagement: {
            likes: post.metrics?.likes || 0,
            shares: post.metrics?.shares || 0,
            comments: post.metrics?.comments || 0,
            reach: post.metrics?.reach || 0
          }
        })),
        stats: {
          totalPosts: posts.length,
          publishedPosts: posts.filter((p: any) => p.status === 'published').length,
          scheduledPosts: posts.filter((p: any) => p.status === 'scheduled').length,
          totalEngagement,
          averageEngagement: posts.length > 0 ? totalEngagement / posts.length : 0
        },
        created_at: campaign.created_at,
        updated_at: campaign.updated_at
      };
    }) || [];

    return NextResponse.json({
      success: true,
      campaigns: transformedCampaigns,
      total: transformedCampaigns.length,
      stats: {
        total: transformedCampaigns.length,
        active: transformedCampaigns.filter(c => c.status === 'active').length,
        draft: transformedCampaigns.filter(c => c.status === 'draft').length,
        completed: transformedCampaigns.filter(c => c.status === 'completed').length,
        paused: transformedCampaigns.filter(c => c.status === 'paused').length
      }
    });

  } catch (error) {
    console.error('Campaigns API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch campaigns',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CampaignData = await request.json();
    const { name, description, platforms, budget, start_date, end_date, status = 'draft' } = body;

    if (!name || !description || !platforms || platforms.length === 0) {
      return NextResponse.json({ 
        error: 'Name, description, and at least one platform are required' 
      }, { status: 400 });
    }

    if (!start_date || !end_date) {
      return NextResponse.json({ 
        error: 'Start date and end date are required' 
      }, { status: 400 });
    }

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (endDate <= startDate) {
      return NextResponse.json({ 
        error: 'End date must be after start date' 
      }, { status: 400 });
    }

    // Verify user has connected accounts for selected platforms
    const { data: socialAccounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('platform')
      .eq('user_id', session.userId)
      .eq('status', 'active')
      .in('platform', platforms);

    if (accountsError) {
      console.error('Error checking social accounts:', accountsError);
      return NextResponse.json({ error: 'Failed to verify social accounts' }, { status: 500 });
    }

    const connectedPlatforms = socialAccounts?.map(acc => acc.platform) || [];
    const missingPlatforms = platforms.filter(platform => !connectedPlatforms.includes(platform));
    
    if (missingPlatforms.length > 0) {
      return NextResponse.json({ 
        error: `Please connect accounts for: ${missingPlatforms.join(', ')}` 
      }, { status: 400 });
    }

    const campaignData = {
      user_id: session.userId,
      name,
      description,
      platforms,
      budget: budget || null,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      status,
      metadata: {
        created_from: 'web_interface',
        target_platforms: platforms,
        budget_currency: 'USD'
      }
    };

    const { data: campaign, error } = await supabase
      .from('social_campaigns')
      .insert(campaignData)
      .select()
      .single();

    if (error) {
      console.error('Error creating campaign:', error);
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        platforms: campaign.platforms,
        status: campaign.status,
        budget: campaign.budget,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        posts: [],
        stats: {
          totalPosts: 0,
          publishedPosts: 0,
          scheduledPosts: 0,
          totalEngagement: 0,
          averageEngagement: 0
        },
        created_at: campaign.created_at
      }
    });

  } catch (error) {
    console.error('Create campaign error:', error);
    return NextResponse.json({ 
      error: 'Failed to create campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Update campaign
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { campaignId, ...updateData } = body;

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 });
    }

    // Validate dates if provided
    if (updateData.start_date && updateData.end_date) {
      const startDate = new Date(updateData.start_date);
      const endDate = new Date(updateData.end_date);
      
      if (endDate <= startDate) {
        return NextResponse.json({ 
          error: 'End date must be after start date' 
        }, { status: 400 });
      }
    }

    const { data: campaign, error } = await supabase
      .from('social_campaigns')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .eq('user_id', session.userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating campaign:', error);
      return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      campaign
    });

  } catch (error) {
    console.error('Update campaign error:', error);
    return NextResponse.json({ 
      error: 'Failed to update campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Delete campaign
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 });
    }

    // First check if campaign has any posts
    const { data: posts, error: postsError } = await supabase
      .from('social_posts')
      .select('id')
      .eq('campaign_id', campaignId);

    if (postsError) {
      console.error('Error checking campaign posts:', postsError);
      return NextResponse.json({ error: 'Failed to check campaign posts' }, { status: 500 });
    }

    if (posts && posts.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete campaign with existing posts. Please delete posts first or archive the campaign.' 
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('social_campaigns')
      .delete()
      .eq('id', campaignId)
      .eq('user_id', session.userId);

    if (error) {
      console.error('Error deleting campaign:', error);
      return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Campaign deleted successfully'
    });

  } catch (error) {
    console.error('Delete campaign error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}