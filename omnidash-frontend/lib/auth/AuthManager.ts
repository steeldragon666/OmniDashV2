import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import TwitterProvider from 'next-auth/providers/twitter';
import FacebookProvider from 'next-auth/providers/facebook';
import LinkedInProvider from 'next-auth/providers/linkedin';
import { supabase, supabaseAdmin } from '../database/supabase';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/drive.readonly'
        }
      }
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: '2.0'
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'email,public_profile,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish'
        }
      }
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'r_liteprofile r_emailaddress w_member_social'
        }
      }
    })
  ],
  
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account) return false;

      try {
        // Check if user exists in Supabase
        const { data: existingUser, error: userError } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .eq('email', user.email)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          console.error('Error checking user:', userError);
          return false;
        }

        // Create or update user profile
        if (!existingUser) {
          const { error: createError } = await supabaseAdmin
            .from('user_profiles')
            .insert({
              id: user.id,
              email: user.email!,
              full_name: user.name || '',
              avatar_url: user.image || '',
              workspace_name: `${user.name?.split(' ')[0] || 'My'} Workspace`
            });

          if (createError) {
            console.error('Error creating user profile:', createError);
            return false;
          }
        } else {
          // Update existing user
          const { error: updateError } = await supabaseAdmin
            .from('user_profiles')
            .update({
              full_name: user.name || existingUser.full_name,
              avatar_url: user.image || existingUser.avatar_url
            })
            .eq('id', existingUser.id);

          if (updateError) {
            console.error('Error updating user profile:', updateError);
          }
        }

        // Store social account if it's a social login
        if (account.provider !== 'credentials' && account.access_token) {
          await storeSocialAccount(user.id, account, profile);
        }

        return true;
      } catch (error) {
        console.error('Sign in error:', error);
        return false;
      }
    },

    async jwt({ token, account, user }) {
      // Store access token and refresh token in JWT
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.provider = account.provider;
        token.expiresAt = account.expires_at;
      }

      if (user) {
        token.userId = user.id;
      }

      return token;
    },

    async session({ session, token }) {
      // Send properties to the client
      if (session.user) {
        (session as any).accessToken = token.accessToken;
        (session as any).refreshToken = token.refreshToken;
        (session as any).provider = token.provider;
        (session as any).userId = token.userId;
      }

      return session;
    }
  },

  pages: {
    signIn: '/auth/login',
    error: '/auth/error'
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET
};

async function storeSocialAccount(userId: string, account: any, profile: any) {
  try {
    const accountData: any = {
      platform: account.provider,
      account_id: account.providerAccountId,
      account_name: '',
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      token_expires_at: account.expires_at ? new Date(account.expires_at * 1000).toISOString() : null,
      credentials: {
        scope: account.scope,
        token_type: account.token_type
      }
    };

    // Set account name based on provider
    switch (account.provider) {
      case 'twitter':
        accountData.account_name = profile?.username || profile?.screen_name || 'Unknown';
        break;
      case 'facebook':
        accountData.account_name = profile?.name || 'Unknown';
        break;
      case 'instagram':
        accountData.account_name = profile?.username || 'Unknown';
        break;
      case 'linkedin':
        accountData.account_name = profile?.localizedFirstName && profile?.localizedLastName 
          ? `${profile.localizedFirstName} ${profile.localizedLastName}`
          : 'Unknown';
        break;
      case 'google':
        accountData.account_name = profile?.name || 'Unknown';
        accountData.platform = 'google'; // For Gmail/Drive integration
        break;
      default:
        accountData.account_name = profile?.name || profile?.login || 'Unknown';
    }

    // Check if account already exists
    const { data: existingAccount } = await supabaseAdmin
      .from('social_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('platform', accountData.platform)
      .eq('account_id', accountData.account_id)
      .single();

    if (existingAccount) {
      // Update existing account
      await supabaseAdmin
        .from('social_accounts')
        .update({
          access_token: accountData.access_token,
          refresh_token: accountData.refresh_token,
          token_expires_at: accountData.token_expires_at,
          credentials: accountData.credentials,
          status: 'active'
        })
        .eq('id', existingAccount.id);
    } else {
      // Create new account
      await supabaseAdmin
        .from('social_accounts')
        .insert({
          user_id: userId,
          ...accountData
        });
    }
  } catch (error) {
    console.error('Error storing social account:', error);
  }
}

export class AuthManager {
  private static instance: AuthManager;

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  async getUserProfile(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      throw new Error(`Failed to get user profile: ${error.message}`);
    }

    return data;
  }

  async updateUserProfile(userId: string, updates: {
    full_name?: string;
    avatar_url?: string;
    workspace_name?: string;
  }) {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user profile: ${error.message}`);
    }

    return data;
  }

  async getUserSocialAccounts(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get social accounts: ${error.message}`);
    }

    return data;
  }

  async refreshTokenIfNeeded(accountId: string, userId: string): Promise<boolean> {
    const { data: account } = await supabaseAdmin
      .from('social_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single();

    if (!account || !account.token_expires_at) {
      return true; // No expiry or account not found
    }

    const expiryDate = new Date(account.token_expires_at);
    const now = new Date();
    
    // Check if token expires within next 5 minutes
    if (expiryDate.getTime() - now.getTime() < 5 * 60 * 1000) {
      return await this.refreshSocialToken(account);
    }

    return true;
  }

  private async refreshSocialToken(account: any): Promise<boolean> {
    try {
      let refreshUrl: string;
      let body: any;

      switch (account.platform) {
        case 'google':
          refreshUrl = 'https://oauth2.googleapis.com/token';
          body = {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: account.refresh_token,
            grant_type: 'refresh_token'
          };
          break;

        case 'facebook':
        case 'instagram':
          refreshUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
          body = {
            grant_type: 'fb_exchange_token',
            client_id: process.env.FACEBOOK_CLIENT_ID,
            client_secret: process.env.FACEBOOK_CLIENT_SECRET,
            fb_exchange_token: account.access_token
          };
          break;

        default:
          return false;
      }

      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(body)
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update token in database
        await supabaseAdmin
          .from('social_accounts')
          .update({
            access_token: data.access_token,
            token_expires_at: data.expires_in 
              ? new Date(Date.now() + data.expires_in * 1000).toISOString()
              : null,
            refresh_token: data.refresh_token || account.refresh_token
          })
          .eq('id', account.id);

        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  async validateUserPermissions(userId: string, resource: string, action: string): Promise<boolean> {
    // Basic permission validation
    // In a real app, you'd have more complex role-based permissions
    
    const userProfile = await this.getUserProfile(userId);
    
    // Admin users can do everything
    if (userProfile.subscription_tier === 'admin') {
      return true;
    }

    // Basic permission checks
    const permissions = {
      workflows: ['create', 'read', 'update', 'delete'],
      social_accounts: ['create', 'read', 'update', 'delete'],
      executions: ['read', 'create'],
      webhooks: ['create', 'read', 'update', 'delete']
    };

    if (resource in permissions) {
      return permissions[resource as keyof typeof permissions].includes(action);
    }

    return false;
  }

  async createAPIKey(userId: string, name: string, permissions: any = {}): Promise<{
    key: string;
    keyHash: string;
    keyPreview: string;
  }> {
    // Generate random API key
    const key = `omnidash_${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex')}`;
    const keyHash = await this.hashAPIKey(key);
    const keyPreview = key.substring(0, 8) + '...';

    const { error } = await supabaseAdmin
      .from('api_keys')
      .insert({
        user_id: userId,
        name,
        key_hash: keyHash,
        key_preview: keyPreview,
        permissions,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
      });

    if (error) {
      throw new Error(`Failed to create API key: ${error.message}`);
    }

    return { key, keyHash, keyPreview };
  }

  async validateAPIKey(key: string): Promise<{ userId: string; permissions: any } | null> {
    const keyHash = await this.hashAPIKey(key);

    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('user_id, permissions, expires_at, is_active')
      .eq('key_hash', keyHash)
      .single();

    if (error || !data || !data.is_active) {
      return null;
    }

    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null;
    }

    return {
      userId: data.user_id,
      permissions: data.permissions
    };
  }

  private async hashAPIKey(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}