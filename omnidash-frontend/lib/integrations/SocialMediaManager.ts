import { TwitterApi } from 'twitter-api-v2';

export interface SocialAccount {
  id: string;
  platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'youtube';
  accountName: string;
  accountId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  status: 'active' | 'inactive' | 'error' | 'expired';
}

export interface PostContent {
  text?: string;
  imageUrls?: string[];
  videoUrl?: string;
  link?: string;
  hashtags?: string[];
  mentions?: string[];
}

export interface PostOptions {
  scheduledAt?: Date;
  threadMode?: boolean;
  replyToId?: string;
  location?: {
    lat: number;
    lng: number;
    name: string;
  };
}

export interface PostResult {
  success: boolean;
  postId?: string;
  url?: string;
  error?: string;
  platform: string;
}

export class SocialMediaManager {
  private accounts: Map<string, SocialAccount> = new Map();

  constructor() {
    this.loadAccounts();
  }

  private async loadAccounts(): Promise<void> {
    // In a real implementation, load from database
    // For now, we'll simulate some accounts
    console.log('Loading social media accounts...');
  }

  public async addAccount(account: SocialAccount): Promise<void> {
    this.accounts.set(account.id, account);
    // In real implementation, save to database
  }

  public async removeAccount(accountId: string): Promise<void> {
    this.accounts.delete(accountId);
    // In real implementation, remove from database
  }

  public getAccounts(): SocialAccount[] {
    return Array.from(this.accounts.values());
  }

  public getAccount(accountId: string): SocialAccount | undefined {
    return this.accounts.get(accountId);
  }

  public async postToTwitter(
    account: SocialAccount,
    content: PostContent,
    options?: PostOptions
  ): Promise<PostResult> {
    try {
      const client = new TwitterApi(account.accessToken);
      
      let tweetText = content.text || '';
      
      // Add hashtags
      if (content.hashtags && content.hashtags.length > 0) {
        tweetText += ' ' + content.hashtags.map(tag => `#${tag}`).join(' ');
      }

      // Add mentions
      if (content.mentions && content.mentions.length > 0) {
        tweetText += ' ' + content.mentions.map(mention => `@${mention}`).join(' ');
      }

      const mediaIds: string[] = [];

      // Upload images if provided
      if (content.imageUrls && content.imageUrls.length > 0) {
        for (const imageUrl of content.imageUrls) {
          try {
            // Download and upload image
            const response = await fetch(imageUrl);
            const buffer = await response.arrayBuffer();
            const mediaId = await client.v1.uploadMedia(Buffer.from(buffer), {
              mimeType: response.headers.get('content-type') || 'image/jpeg'
            });
            mediaIds.push(mediaId);
          } catch (error) {
            console.error('Failed to upload image:', error);
          }
        }
      }

      const tweetOptions: any = {
        text: tweetText.trim()
      };

      if (mediaIds.length > 0) {
        tweetOptions.media = { media_ids: mediaIds };
      }

      if (options?.replyToId) {
        tweetOptions.reply = { in_reply_to_tweet_id: options.replyToId };
      }

      const tweet = await client.v2.tweet(tweetOptions);

      return {
        success: true,
        postId: tweet.data.id,
        url: `https://twitter.com/${account.accountName}/status/${tweet.data.id}`,
        platform: 'twitter'
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        platform: 'twitter'
      };
    }
  }

  public async postToFacebook(
    account: SocialAccount,
    content: PostContent,
    options?: PostOptions
  ): Promise<PostResult> {
    try {
      // Facebook Graph API implementation
      const baseUrl = `https://graph.facebook.com/v18.0/${account.accountId}/feed`;
      
      const params = new URLSearchParams({
        access_token: account.accessToken,
        message: content.text || ''
      });

      if (content.link) {
        params.append('link', content.link);
      }

      if (options?.scheduledAt && options.scheduledAt > new Date()) {
        params.append('published', 'false');
        params.append('scheduled_publish_time', Math.floor(options.scheduledAt.getTime() / 1000).toString());
      }

      const response = await fetch(baseUrl, {
        method: 'POST',
        body: params
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          postId: result.id,
          url: `https://facebook.com/${result.id}`,
          platform: 'facebook'
        };
      } else {
        return {
          success: false,
          error: result.error?.message || 'Unknown error',
          platform: 'facebook'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        platform: 'facebook'
      };
    }
  }

  public async postToInstagram(
    account: SocialAccount,
    content: PostContent,
    options?: PostOptions
  ): Promise<PostResult> {
    try {
      // Instagram Basic Display API implementation
      if (!content.imageUrls || content.imageUrls.length === 0) {
        return {
          success: false,
          error: 'Instagram posts require at least one image',
          platform: 'instagram'
        };
      }

      const baseUrl = `https://graph.facebook.com/v18.0/${account.accountId}/media`;
      
      // Step 1: Create media object
      const mediaParams = new URLSearchParams({
        access_token: account.accessToken,
        image_url: content.imageUrls[0],
        caption: content.text || ''
      });

      if (content.hashtags && content.hashtags.length > 0) {
        mediaParams.set('caption', 
          (content.text || '') + ' ' + content.hashtags.map(tag => `#${tag}`).join(' ')
        );
      }

      const mediaResponse = await fetch(baseUrl, {
        method: 'POST',
        body: mediaParams
      });

      const mediaResult = await mediaResponse.json();

      if (!mediaResponse.ok) {
        return {
          success: false,
          error: mediaResult.error?.message || 'Failed to create media object',
          platform: 'instagram'
        };
      }

      // Step 2: Publish media object
      const publishParams = new URLSearchParams({
        access_token: account.accessToken,
        creation_id: mediaResult.id
      });

      const publishResponse = await fetch(`${baseUrl.replace('/media', '/media_publish')}`, {
        method: 'POST',
        body: publishParams
      });

      const publishResult = await publishResponse.json();

      if (publishResponse.ok) {
        return {
          success: true,
          postId: publishResult.id,
          url: `https://instagram.com/p/${publishResult.id}`,
          platform: 'instagram'
        };
      } else {
        return {
          success: false,
          error: publishResult.error?.message || 'Failed to publish post',
          platform: 'instagram'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        platform: 'instagram'
      };
    }
  }

  public async postToLinkedIn(
    account: SocialAccount,
    content: PostContent,
    options?: PostOptions
  ): Promise<PostResult> {
    try {
      // LinkedIn API implementation
      const baseUrl = 'https://api.linkedin.com/v2/ugcPosts';

      const postData = {
        author: `urn:li:person:${account.accountId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content.text || ''
            },
            shareMediaCategory: content.imageUrls?.length ? 'IMAGE' : 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      if (content.imageUrls && content.imageUrls.length > 0) {
        // For simplicity, we'll just reference the first image
        // In a real implementation, you'd need to upload images to LinkedIn first
        (postData.specificContent['com.linkedin.ugc.ShareContent'] as any).media = [
          {
            status: 'READY',
            description: {
              text: content.text || ''
            },
            media: content.imageUrls[0],
            title: {
              text: 'Shared via OmniDash'
            }
          }
        ];
      }

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify(postData)
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          postId: result.id,
          url: `https://linkedin.com/feed/update/${result.id}`,
          platform: 'linkedin'
        };
      } else {
        return {
          success: false,
          error: result.message || 'Unknown error',
          platform: 'linkedin'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        platform: 'linkedin'
      };
    }
  }

  public async postToMultiplePlatforms(
    accountIds: string[],
    content: PostContent,
    options?: PostOptions
  ): Promise<PostResult[]> {
    const results: PostResult[] = [];
    
    const postPromises = accountIds.map(async (accountId) => {
      const account = this.getAccount(accountId);
      if (!account) {
        return {
          success: false,
          error: 'Account not found',
          platform: 'unknown'
        };
      }

      return this.postToAccount(account, content, options);
    });

    const settled = await Promise.allSettled(postPromises);
    
    settled.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          error: result.reason.message,
          platform: 'unknown'
        });
      }
    });

    return results;
  }

  public async postToAccount(
    account: SocialAccount,
    content: PostContent,
    options?: PostOptions
  ): Promise<PostResult> {
    switch (account.platform) {
      case 'twitter':
        return this.postToTwitter(account, content, options);
      case 'facebook':
        return this.postToFacebook(account, content, options);
      case 'instagram':
        return this.postToInstagram(account, content, options);
      case 'linkedin':
        return this.postToLinkedIn(account, content, options);
      default:
        return {
          success: false,
          error: `Platform ${account.platform} not supported`,
          platform: account.platform
        };
    }
  }

  public async validateAccount(account: SocialAccount): Promise<boolean> {
    try {
      switch (account.platform) {
        case 'twitter':
          const client = new TwitterApi(account.accessToken);
          await client.v2.me();
          return true;
        
        case 'facebook':
        case 'instagram':
          const response = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${account.accessToken}`);
          return response.ok;
        
        case 'linkedin':
          const linkedInResponse = await fetch('https://api.linkedin.com/v2/me', {
            headers: {
              'Authorization': `Bearer ${account.accessToken}`
            }
          });
          return linkedInResponse.ok;
        
        default:
          return false;
      }
    } catch (error) {
      console.error('Account validation failed:', error);
      return false;
    }
  }

  public async refreshTokenIfNeeded(account: SocialAccount): Promise<boolean> {
    if (!account.expiresAt || account.expiresAt > new Date()) {
      return true; // Token is still valid
    }

    if (!account.refreshToken) {
      return false; // Cannot refresh without refresh token
    }

    try {
      // Implementation depends on the platform
      // This is a simplified version
      switch (account.platform) {
        case 'facebook':
        case 'instagram':
          const response = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              grant_type: 'fb_exchange_token',
              client_id: process.env.FACEBOOK_CLIENT_ID!,
              client_secret: process.env.FACEBOOK_CLIENT_SECRET!,
              fb_exchange_token: account.accessToken
            })
          });

          if (response.ok) {
            const data = await response.json();
            account.accessToken = data.access_token;
            account.expiresAt = new Date(Date.now() + (data.expires_in * 1000));
            return true;
          }
          break;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  public async getPostAnalytics(
    account: SocialAccount,
    postId: string
  ): Promise<{
    likes: number;
    shares: number;
    comments: number;
    views: number;
  } | null> {
    try {
      switch (account.platform) {
        case 'twitter':
          const client = new TwitterApi(account.accessToken);
          const tweet = await client.v2.singleTweet(postId, {
            'tweet.fields': ['public_metrics']
          });
          
          return {
            likes: tweet.data.public_metrics?.like_count || 0,
            shares: tweet.data.public_metrics?.retweet_count || 0,
            comments: tweet.data.public_metrics?.reply_count || 0,
            views: tweet.data.public_metrics?.impression_count || 0
          };

        case 'facebook':
          const response = await fetch(
            `https://graph.facebook.com/v18.0/${postId}?fields=reactions.summary(total_count),comments.summary(total_count),shares&access_token=${account.accessToken}`
          );
          
          if (response.ok) {
            const data = await response.json();
            return {
              likes: data.reactions?.summary?.total_count || 0,
              shares: data.shares?.count || 0,
              comments: data.comments?.summary?.total_count || 0,
              views: 0 // Facebook doesn't provide view count in basic API
            };
          }
          break;

        default:
          return null;
      }
    } catch (error) {
      console.error('Failed to get post analytics:', error);
      return null;
    }

    return null;
  }
}