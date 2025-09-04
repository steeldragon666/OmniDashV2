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

    // Fetch social accounts from database
    const { data: socialAccounts, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', session.userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching social accounts:', error);
      return NextResponse.json({ error: 'Failed to fetch social accounts' }, { status: 500 });
    }

    // Transform to frontend format
    const accounts = socialAccounts.map(account => ({
      id: account.id,
      platform: account.platform,
      username: account.account_name,
      displayName: account.account_name,
      isConnected: account.status === 'active',
      lastSync: account.updated_at,
      followers: account.metadata?.followers_count || 0,
      posts: account.metadata?.posts_count || 0,
      engagement: account.metadata?.engagement_rate || 0,
      profileImage: account.metadata?.profile_image_url
    }));

    // Also return all available platforms (even if not connected)
    const allPlatforms = ['instagram', 'twitter', 'linkedin', 'facebook', 'tiktok', 'youtube'];
    const connectedPlatforms = accounts.map(acc => acc.platform);
    
    // Add disconnected platforms
    const disconnectedPlatforms = allPlatforms
      .filter(platform => !connectedPlatforms.includes(platform))
      .map(platform => ({
        id: `${platform}_${Date.now()}`,
        platform,
        username: '',
        displayName: '',
        isConnected: false,
        lastSync: '',
        followers: 0,
        posts: 0,
        engagement: 0
      }));

    const allAccounts = [...accounts, ...disconnectedPlatforms];

    return NextResponse.json({
      success: true,
      accounts: allAccounts,
      connectedCount: accounts.length,
      totalFollowers: accounts.reduce((sum, acc) => sum + acc.followers, 0),
      totalPosts: accounts.reduce((sum, acc) => sum + acc.posts, 0),
      avgEngagement: accounts.length > 0 
        ? accounts.reduce((sum, acc) => sum + acc.engagement, 0) / accounts.length 
        : 0
    });

  } catch (error) {
    console.error('Social accounts API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch social accounts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Update social account
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, action, data } = body;

    if (!accountId || !action) {
      return NextResponse.json({ error: 'Account ID and action are required' }, { status: 400 });
    }

    let updateData: any = {};

    switch (action) {
      case 'sync':
        updateData = {
          updated_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString()
        };
        break;
        
      case 'disconnect':
        updateData = {
          status: 'inactive',
          updated_at: new Date().toISOString()
        };
        break;
        
      case 'update_metadata':
        updateData = {
          metadata: data,
          updated_at: new Date().toISOString()
        };
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { data: updatedAccount, error } = await supabase
      .from('social_accounts')
      .update(updateData)
      .eq('id', accountId)
      .eq('user_id', session.userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating social account:', error);
      return NextResponse.json({ error: 'Failed to update social account' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      account: updatedAccount
    });

  } catch (error) {
    console.error('Social account update error:', error);
    return NextResponse.json({ 
      error: 'Failed to update social account',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Delete social account
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('social_accounts')
      .update({ status: 'inactive' })
      .eq('id', accountId)
      .eq('user_id', session.userId);

    if (error) {
      console.error('Error deleting social account:', error);
      return NextResponse.json({ error: 'Failed to delete social account' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Social account disconnected successfully'
    });

  } catch (error) {
    console.error('Social account delete error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete social account',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}