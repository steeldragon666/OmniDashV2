import { NextRequest, NextResponse } from 'next/server';
import { automationEngine } from '../../../automation-engine';

// GET /api/automation/social/accounts - List social media accounts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const activeOnly = searchParams.get('active') === 'true';

    let accounts = automationEngine.socialPublisher.getAccounts();

    // Filter by platform if specified
    if (platform) {
      accounts = accounts.filter(account => account.platform === platform);
    }

    // Filter by active status if specified
    if (activeOnly) {
      accounts = accounts.filter(account => account.isActive);
    }

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Error fetching social accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch social accounts' },
      { status: 500 }
    );
  }
}

// POST /api/automation/social/accounts - Add social media account
export async function POST(request: NextRequest) {
  try {
    const accountData = await request.json();
    
    // Validate required fields
    if (!accountData.platform || !accountData.username || !accountData.accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields: platform, username, accessToken' },
        { status: 400 }
      );
    }

    const accountId = automationEngine.socialPublisher.addAccount({
      platform: accountData.platform,
      accountId: accountData.accountId || accountData.username,
      username: accountData.username,
      displayName: accountData.displayName || accountData.username,
      accessToken: accountData.accessToken,
      refreshToken: accountData.refreshToken,
      tokenExpires: accountData.tokenExpires ? new Date(accountData.tokenExpires) : undefined,
      permissions: accountData.permissions || [],
      metadata: accountData.metadata || {}
    });
    
    return NextResponse.json({ 
      accountId,
      message: 'Social media account added successfully' 
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding social account:', error);
    return NextResponse.json(
      { error: 'Failed to add social account', details: (error as Error).message },
      { status: 500 }
    );
  }
}