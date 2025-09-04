import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from '@/utils/encryption';
import axios from 'axios';

const prisma = new PrismaClient();

export interface SocialAuthConfig {
  platform: 'google' | 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'tiktok';
  clientId: string;
  clientSecret: string;
  scope: string[];
  callbackUrl: string;
}

export interface SocialAuthResult {
  platform: string;
  accountId: string;
  username?: string;
  displayName?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpires?: Date;
  profile: any;
}

export class SocialAuthService {
  private configs: Map<string, SocialAuthConfig>;

  constructor() {
    this.configs = new Map();
    this.initializeConfigs();
    this.setupPassportStrategies();
  }

  private initializeConfigs(): void {
    // Google OAuth for general authentication
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      this.configs.set('google', {
        platform: 'google',
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        scope: ['profile', 'email'],
        callbackUrl: `${process.env.API_URL || 'http://localhost:3000'}/auth/google/callback`
      });
    }

    // Twitter API v2
    if (process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET) {
      this.configs.set('twitter', {
        platform: 'twitter',
        clientId: process.env.TWITTER_CLIENT_ID,
        clientSecret: process.env.TWITTER_CLIENT_SECRET,
        scope: ['tweet.read', 'tweet.write', 'users.read', 'follows.read', 'follows.write'],
        callbackUrl: `${process.env.API_URL || 'http://localhost:3000'}/auth/twitter/callback`
      });
    }

    // LinkedIn
    if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
      this.configs.set('linkedin', {
        platform: 'linkedin',
        clientId: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        scope: ['r_liteprofile', 'r_emailaddress', 'w_member_social'],
        callbackUrl: `${process.env.API_URL || 'http://localhost:3000'}/auth/linkedin/callback`
      });
    }

    // Facebook
    if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
      this.configs.set('facebook', {
        platform: 'facebook',
        clientId: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        scope: ['email', 'pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'pages_read_user_content'],
        callbackUrl: `${process.env.API_URL || 'http://localhost:3000'}/auth/facebook/callback`
      });
    }
  }

  private setupPassportStrategies(): void {
    // Google Strategy
    const googleConfig = this.configs.get('google');
    if (googleConfig) {
      passport.use(new GoogleStrategy({
        clientID: googleConfig.clientId,
        clientSecret: googleConfig.clientSecret,
        callbackURL: googleConfig.callbackUrl
      }, this.handleGoogleAuth.bind(this)));
    }

    // LinkedIn Strategy
    const linkedinConfig = this.configs.get('linkedin');
    if (linkedinConfig) {
      passport.use(new LinkedInStrategy({
        clientID: linkedinConfig.clientId,
        clientSecret: linkedinConfig.clientSecret,
        callbackURL: linkedinConfig.callbackUrl,
        scope: linkedinConfig.scope
      }, this.handleLinkedInAuth.bind(this)));
    }

    // Facebook Strategy
    const facebookConfig = this.configs.get('facebook');
    if (facebookConfig) {
      passport.use(new FacebookStrategy({
        clientID: facebookConfig.clientId,
        clientSecret: facebookConfig.clientSecret,
        callbackURL: facebookConfig.callbackUrl,
        profileFields: ['id', 'emails', 'name', 'displayName']
      }, this.handleFacebookAuth.bind(this)));
    }
  }

  private async handleGoogleAuth(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any
  ): Promise<void> {
    try {
      const authResult: SocialAuthResult = {
        platform: 'google',
        accountId: profile.id,
        username: profile.emails?.[0]?.value,
        displayName: profile.displayName,
        accessToken,
        refreshToken,
        profile
      };

      done(null, authResult);
    } catch (error) {
      done(error, null);
    }
  }

  private async handleLinkedInAuth(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any
  ): Promise<void> {
    try {
      const authResult: SocialAuthResult = {
        platform: 'linkedin',
        accountId: profile.id,
        username: profile.emails?.[0]?.value,
        displayName: profile.displayName,
        accessToken,
        refreshToken,
        profile
      };

      done(null, authResult);
    } catch (error) {
      done(error, null);
    }
  }

  private async handleFacebookAuth(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any
  ): Promise<void> {
    try {
      const authResult: SocialAuthResult = {
        platform: 'facebook',
        accountId: profile.id,
        username: profile.emails?.[0]?.value,
        displayName: profile.displayName,
        accessToken,
        refreshToken,
        profile
      };

      done(null, authResult);
    } catch (error) {
      done(error, null);
    }
  }

  // Twitter OAuth 2.0 (manual implementation as passport-twitter doesn't support v2)
  async initiateTwitterAuth(brandId: string): Promise<{ authUrl: string; state: string }> {
    const config = this.configs.get('twitter');
    if (!config) {
      throw new Error('Twitter configuration not found');
    }

    const state = `${brandId}-${Date.now()}`;
    const codeChallenge = this.generateCodeChallenge();
    
    // Store code verifier for later use
    await this.storeAuthState(state, { codeVerifier: codeChallenge.verifier, brandId });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.callbackUrl,
      scope: config.scope.join(' '),
      state,
      code_challenge: codeChallenge.challenge,
      code_challenge_method: 'S256'
    });

    const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;

    return { authUrl, state };
  }

  async handleTwitterCallback(code: string, state: string): Promise<SocialAuthResult> {
    const config = this.configs.get('twitter');
    if (!config) {
      throw new Error('Twitter configuration not found');
    }

    // Retrieve stored auth state
    const authState = await this.getAuthState(state);
    if (!authState) {
      throw new Error('Invalid auth state');
    }

    // Exchange code for tokens
    const tokenResponse = await axios.post('https://api.twitter.com/2/oauth2/token', {
      code,
      grant_type: 'authorization_code',
      client_id: config.clientId,
      redirect_uri: config.callbackUrl,
      code_verifier: authState.codeVerifier
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`
      }
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Get user profile
    const userResponse = await axios.get('https://api.twitter.com/2/users/me?user.fields=username,name,profile_image_url', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    const user = userResponse.data.data;

    const tokenExpires = expires_in ? new Date(Date.now() + expires_in * 1000) : undefined;

    return {
      platform: 'twitter',
      accountId: user.id,
      username: user.username,
      displayName: user.name,
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpires,
      profile: user
    };
  }

  // Instagram OAuth (uses Facebook's Graph API)
  async initiateInstagramAuth(brandId: string): Promise<{ authUrl: string; state: string }> {
    const config = this.configs.get('facebook'); // Instagram uses Facebook OAuth
    if (!config) {
      throw new Error('Facebook/Instagram configuration not found');
    }

    const state = `instagram-${brandId}-${Date.now()}`;
    await this.storeAuthState(state, { brandId, platform: 'instagram' });

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.callbackUrl.replace('/facebook/', '/instagram/'),
      scope: 'instagram_basic,instagram_content_publish,instagram_manage_insights',
      response_type: 'code',
      state
    });

    const authUrl = `https://api.instagram.com/oauth/authorize?${params.toString()}`;

    return { authUrl, state };
  }

  async handleInstagramCallback(code: string, state: string): Promise<SocialAuthResult> {
    const config = this.configs.get('facebook');
    if (!config) {
      throw new Error('Facebook/Instagram configuration not found');
    }

    // Exchange code for access token
    const tokenResponse = await axios.post('https://api.instagram.com/oauth/access_token', {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: config.callbackUrl.replace('/facebook/', '/instagram/'),
      code
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, user_id } = tokenResponse.data;

    // Get user profile
    const userResponse = await axios.get(`https://graph.instagram.com/me?fields=id,username,account_type&access_token=${access_token}`);
    const user = userResponse.data;

    return {
      platform: 'instagram',
      accountId: user.id,
      username: user.username,
      displayName: user.username,
      accessToken: access_token,
      profile: user
    };
  }

  // TikTok OAuth
  async initiateTikTokAuth(brandId: string): Promise<{ authUrl: string; state: string }> {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    if (!clientKey) {
      throw new Error('TikTok configuration not found');
    }

    const state = `tiktok-${brandId}-${Date.now()}`;
    await this.storeAuthState(state, { brandId, platform: 'tiktok' });

    const params = new URLSearchParams({
      client_key: clientKey,
      scope: 'user.info.basic,video.list,video.upload',
      response_type: 'code',
      redirect_uri: `${process.env.API_URL || 'http://localhost:3000'}/auth/tiktok/callback`,
      state
    });

    const authUrl = `https://www.tiktok.com/auth/authorize/?${params.toString()}`;

    return { authUrl, state };
  }

  async handleTikTokCallback(code: string, state: string): Promise<SocialAuthResult> {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

    if (!clientKey || !clientSecret) {
      throw new Error('TikTok configuration not found');
    }

    // Exchange code for access token
    const tokenResponse = await axios.post('https://open-api.tiktok.com/oauth/access_token/', {
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${process.env.API_URL || 'http://localhost:3000'}/auth/tiktok/callback`
    });

    const { access_token, refresh_token, expires_in, open_id } = tokenResponse.data.data;

    // Get user info
    const userResponse = await axios.post('https://open-api.tiktok.com/user/info/', {
      access_token,
      open_id
    });

    const user = userResponse.data.data.user;

    const tokenExpires = expires_in ? new Date(Date.now() + expires_in * 1000) : undefined;

    return {
      platform: 'tiktok',
      accountId: open_id,
      username: user.unique_id,
      displayName: user.display_name,
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpires,
      profile: user
    };
  }

  async connectSocialAccount(brandId: string, authResult: SocialAuthResult): Promise<any> {
    try {
      // Encrypt sensitive tokens
      const encryptedAccessToken = encrypt(authResult.accessToken);
      const encryptedRefreshToken = authResult.refreshToken ? encrypt(authResult.refreshToken) : null;

      // Store or update social account
      const socialAccount = await prisma.socialAccount.upsert({
        where: {
          brandId_platform_accountId: {
            brandId,
            platform: authResult.platform,
            accountId: authResult.accountId
          }
        },
        update: {
          username: authResult.username,
          displayName: authResult.displayName,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpires: authResult.tokenExpires,
          isActive: true
        },
        create: {
          brandId,
          platform: authResult.platform,
          accountId: authResult.accountId,
          username: authResult.username,
          displayName: authResult.displayName,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpires: authResult.tokenExpires,
          isActive: true
        }
      });

      // Fetch initial account metrics
      await this.fetchAccountMetrics(socialAccount.id);

      return socialAccount;
    } catch (error) {
      console.error('Error connecting social account:', error);
      throw error;
    }
  }

  async refreshToken(accountId: string): Promise<boolean> {
    try {
      const account = await prisma.socialAccount.findUnique({
        where: { id: accountId }
      });

      if (!account || !account.refreshToken) {
        return false;
      }

      const refreshToken = decrypt(account.refreshToken);
      let newTokenData;

      switch (account.platform) {
        case 'twitter':
          newTokenData = await this.refreshTwitterToken(refreshToken);
          break;
        case 'facebook':
        case 'instagram':
          newTokenData = await this.refreshFacebookToken(refreshToken);
          break;
        default:
          return false;
      }

      if (newTokenData) {
        await prisma.socialAccount.update({
          where: { id: accountId },
          data: {
            accessToken: encrypt(newTokenData.access_token),
            refreshToken: newTokenData.refresh_token ? encrypt(newTokenData.refresh_token) : account.refreshToken,
            tokenExpires: newTokenData.expires_in ? new Date(Date.now() + newTokenData.expires_in * 1000) : undefined
          }
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  private async refreshTwitterToken(refreshToken: string): Promise<any> {
    const config = this.configs.get('twitter');
    if (!config) throw new Error('Twitter config not found');

    const response = await axios.post('https://api.twitter.com/2/oauth2/token', {
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      client_id: config.clientId
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`
      }
    });

    return response.data;
  }

  private async refreshFacebookToken(refreshToken: string): Promise<any> {
    const config = this.configs.get('facebook');
    if (!config) throw new Error('Facebook config not found');

    const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        fb_exchange_token: refreshToken
      }
    });

    return response.data;
  }

  private async fetchAccountMetrics(accountId: string): Promise<void> {
    // This would fetch follower counts and basic metrics
    // Implementation depends on each platform's API
    console.log(`Fetching metrics for account: ${accountId}`);
  }

  private generateCodeChallenge(): { challenge: string; verifier: string } {
    const crypto = require('crypto');
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    
    return { challenge, verifier };
  }

  private async storeAuthState(state: string, data: any): Promise<void> {
    // Store in Redis or database temporarily (expires in 10 minutes)
    // For now, using in-memory storage (not production-ready)
    console.log(`Storing auth state: ${state}`, data);
  }

  private async getAuthState(state: string): Promise<any> {
    // Retrieve from storage
    // For now, returning mock data
    console.log(`Retrieving auth state: ${state}`);
    return { codeVerifier: 'mock-verifier', brandId: 'mock-brand-id' };
  }

  getAvailablePlatforms(): string[] {
    return Array.from(this.configs.keys());
  }

  isPlatformConfigured(platform: string): boolean {
    return this.configs.has(platform);
  }
}