import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface SocialAccount {
  id: string;
  user_id: string;
  platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'youtube';
  account_name: string;
  account_id: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  credentials?: any;
  status: 'active' | 'inactive' | 'error' | 'expired';
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSocialAccountData {
  platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'youtube';
  account_name: string;
  account_id: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  credentials?: any;
}

export interface UpdateSocialAccountData {
  account_name?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  credentials?: any;
  status?: 'active' | 'inactive' | 'error' | 'expired';
  last_used_at?: string;
}

export class SocialAccountRepository {
  async create(userId: string, data: CreateSocialAccountData): Promise<SocialAccount> {
    const { data: account, error } = await supabase
      .from('social_accounts')
      .insert({
        user_id: userId,
        platform: data.platform,
        account_name: data.account_name,
        account_id: data.account_id,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_expires_at: data.token_expires_at,
        credentials: data.credentials,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create social account: ${error.message}`);
    }

    return account;
  }

  async findById(id: string, userId: string): Promise<SocialAccount | null> {
    const { data, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to find social account: ${error.message}`);
    }

    return data;
  }

  async findByPlatform(
    userId: string, 
    platform: string, 
    accountId?: string
  ): Promise<SocialAccount[]> {
    let query = supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .order('created_at', { ascending: false });

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to find social accounts: ${error.message}`);
    }

    return data || [];
  }

  async findAll(userId: string, options?: {
    platform?: string;
    status?: 'active' | 'inactive' | 'error' | 'expired';
    limit?: number;
    offset?: number;
  }): Promise<SocialAccount[]> {
    let query = supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.platform) {
      query = query.eq('platform', options.platform);
    }

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to find social accounts: ${error.message}`);
    }

    return data || [];
  }

  async update(id: string, userId: string, data: UpdateSocialAccountData): Promise<SocialAccount> {
    const updateData: any = { ...data };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const { data: account, error } = await supabase
      .from('social_accounts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update social account: ${error.message}`);
    }

    return account;
  }

  async delete(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('social_accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete social account: ${error.message}`);
    }
  }

  async updateLastUsed(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('social_accounts')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update last used: ${error.message}`);
    }
  }

  async updateStatus(id: string, userId: string, status: 'active' | 'inactive' | 'error' | 'expired'): Promise<void> {
    const { error } = await supabase
      .from('social_accounts')
      .update({ status })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update status: ${error.message}`);
    }
  }

  async refreshToken(id: string, userId: string, accessToken: string, refreshToken?: string, expiresAt?: string): Promise<void> {
    const updateData: any = { 
      access_token: accessToken,
      status: 'active'
    };

    if (refreshToken) {
      updateData.refresh_token = refreshToken;
    }

    if (expiresAt) {
      updateData.token_expires_at = expiresAt;
    }

    const { error } = await supabase
      .from('social_accounts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  async getExpiredAccounts(): Promise<SocialAccount[]> {
    const { data, error } = await supabase
      .from('social_accounts')
      .select('*')
      .not('token_expires_at', 'is', null)
      .lt('token_expires_at', new Date().toISOString())
      .eq('status', 'active');

    if (error) {
      throw new Error(`Failed to get expired accounts: ${error.message}`);
    }

    return data || [];
  }

  async getAccountsByPlatform(userId: string): Promise<Record<string, SocialAccount[]>> {
    const accounts = await this.findAll(userId, { status: 'active' });
    
    return accounts.reduce((acc, account) => {
      if (!acc[account.platform]) {
        acc[account.platform] = [];
      }
      acc[account.platform].push(account);
      return acc;
    }, {} as Record<string, SocialAccount[]>);
  }

  async getStats(userId: string): Promise<{
    total: number;
    byPlatform: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const accounts = await this.findAll(userId);

    const stats = {
      total: accounts.length,
      byPlatform: {} as Record<string, number>,
      byStatus: {} as Record<string, number>
    };

    accounts.forEach(account => {
      // Count by platform
      stats.byPlatform[account.platform] = (stats.byPlatform[account.platform] || 0) + 1;
      
      // Count by status
      stats.byStatus[account.status] = (stats.byStatus[account.status] || 0) + 1;
    });

    return stats;
  }

  async findDuplicates(userId: string, platform: string, accountId: string): Promise<SocialAccount[]> {
    const { data, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('account_id', accountId);

    if (error) {
      throw new Error(`Failed to find duplicates: ${error.message}`);
    }

    return data || [];
  }

  async getActiveAccountsForPlatform(userId: string, platform: string): Promise<SocialAccount[]> {
    return this.findByPlatform(userId, platform).then(accounts =>
      accounts.filter(account => account.status === 'active')
    );
  }

  async validateTokenExpiry(id: string, userId: string): Promise<boolean> {
    const account = await this.findById(id, userId);
    if (!account || !account.token_expires_at) {
      return true; // No expiry date means it doesn't expire
    }

    const expiryDate = new Date(account.token_expires_at);
    const now = new Date();
    
    if (expiryDate <= now && account.status === 'active') {
      // Mark as expired
      await this.updateStatus(id, userId, 'expired');
      return false;
    }

    return true;
  }

  async bulkUpdateStatus(userId: string, accountIds: string[], status: 'active' | 'inactive' | 'error' | 'expired'): Promise<void> {
    const { error } = await supabase
      .from('social_accounts')
      .update({ status })
      .eq('user_id', userId)
      .in('id', accountIds);

    if (error) {
      throw new Error(`Failed to bulk update status: ${error.message}`);
    }
  }

  async cleanup(userId: string, inactiveForDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactiveForDays);

    const { count, error } = await supabase
      .from('social_accounts')
      .delete()
      .eq('user_id', userId)
      .eq('status', 'inactive')
      .lt('last_used_at', cutoffDate.toISOString());

    if (error) {
      throw new Error(`Failed to cleanup accounts: ${error.message}`);
    }

    return count || 0;
  }
}