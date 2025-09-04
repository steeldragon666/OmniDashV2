import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from '@/utils/encryption';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class SocialController {
  async connectAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        brandId,
        platform,
        accountId,
        username,
        displayName,
        accessToken,
        refreshToken,
        tokenExpires
      } = req.body;

      // Encrypt sensitive tokens
      const encryptedAccessToken = accessToken ? encrypt(accessToken) : null;
      const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : null;

      // Check if account already exists
      const existingAccount = await prisma.socialAccount.findUnique({
        where: {
          brandId_platform_accountId: {
            brandId,
            platform,
            accountId
          }
        }
      });

      if (existingAccount) {
        // Update existing account
        const updatedAccount = await prisma.socialAccount.update({
          where: { id: existingAccount.id },
          data: {
            username,
            displayName,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            tokenExpires: tokenExpires ? new Date(tokenExpires) : null,
            isActive: true
          },
          select: {
            id: true,
            platform: true,
            username: true,
            displayName: true,
            followers: true,
            following: true,
            isActive: true,
            createdAt: true,
            updatedAt: true
          }
        });

        res.json({ account: updatedAccount });
        return;
      }

      // Create new account
      const account = await prisma.socialAccount.create({
        data: {
          brandId,
          platform,
          accountId,
          username,
          displayName,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpires: tokenExpires ? new Date(tokenExpires) : null
        },
        select: {
          id: true,
          platform: true,
          username: true,
          displayName: true,
          followers: true,
          following: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });

      res.status(201).json({ account });
    } catch (error) {
      console.error('Connect social account error:', error);
      res.status(500).json({
        error: 'Failed to connect social account'
      });
    }
  }

  async listAccounts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { platform } = req.query;

      const where: any = {
        brandId,
        isActive: true
      };

      if (platform) {
        where.platform = platform;
      }

      const accounts = await prisma.socialAccount.findMany({
        where,
        select: {
          id: true,
          platform: true,
          username: true,
          displayName: true,
          followers: true,
          following: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              posts: true
            }
          }
        },
        orderBy: [
          { platform: 'asc' },
          { createdAt: 'desc' }
        ]
      });

      res.json({ accounts });
    } catch (error) {
      console.error('List social accounts error:', error);
      res.status(500).json({
        error: 'Failed to fetch social accounts'
      });
    }
  }

  async getAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { accountId } = req.params;

      const account = await prisma.socialAccount.findUnique({
        where: { id: accountId },
        select: {
          id: true,
          brandId: true,
          platform: true,
          username: true,
          displayName: true,
          followers: true,
          following: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          brand: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          _count: {
            select: {
              posts: {
                where: {
                  status: 'published'
                }
              }
            }
          }
        }
      });

      if (!account) {
        res.status(404).json({
          error: 'Social account not found'
        });
        return;
      }

      res.json({ account });
    } catch (error) {
      console.error('Get social account error:', error);
      res.status(500).json({
        error: 'Failed to fetch social account'
      });
    }
  }

  async updateAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { accountId } = req.params;
      const {
        username,
        displayName,
        accessToken,
        refreshToken,
        tokenExpires,
        isActive
      } = req.body;

      const updateData: any = {};

      if (username !== undefined) updateData.username = username;
      if (displayName !== undefined) updateData.displayName = displayName;
      if (isActive !== undefined) updateData.isActive = isActive;

      if (accessToken !== undefined) {
        updateData.accessToken = accessToken ? encrypt(accessToken) : null;
      }

      if (refreshToken !== undefined) {
        updateData.refreshToken = refreshToken ? encrypt(refreshToken) : null;
      }

      if (tokenExpires !== undefined) {
        updateData.tokenExpires = tokenExpires ? new Date(tokenExpires) : null;
      }

      const account = await prisma.socialAccount.update({
        where: { id: accountId },
        data: updateData,
        select: {
          id: true,
          platform: true,
          username: true,
          displayName: true,
          followers: true,
          following: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });

      res.json({ account });
    } catch (error) {
      console.error('Update social account error:', error);
      res.status(500).json({
        error: 'Failed to update social account'
      });
    }
  }

  async disconnectAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { accountId } = req.params;

      // Soft delete - set isActive to false
      await prisma.socialAccount.update({
        where: { id: accountId },
        data: {
          isActive: false,
          accessToken: null,
          refreshToken: null
        }
      });

      res.json({ message: 'Social account disconnected successfully' });
    } catch (error) {
      console.error('Disconnect social account error:', error);
      res.status(500).json({
        error: 'Failed to disconnect social account'
      });
    }
  }

  async refreshAccountStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { accountId } = req.params;

      const account = await prisma.socialAccount.findUnique({
        where: { id: accountId },
        select: {
          id: true,
          platform: true,
          accessToken: true,
          refreshToken: true
        }
      });

      if (!account || !account.accessToken) {
        res.status(404).json({
          error: 'Social account not found or not connected'
        });
        return;
      }

      // Decrypt tokens for API calls
      const accessToken = decrypt(account.accessToken);
      const refreshToken = account.refreshToken ? decrypt(account.refreshToken) : null;

      // TODO: Implement platform-specific API calls to get follower counts
      // This would call Twitter API, Instagram API, etc. based on platform
      let followers = 0;
      let following = 0;

      switch (account.platform) {
        case 'twitter':
          // TODO: Call Twitter API to get user stats
          break;
        case 'instagram':
          // TODO: Call Instagram API to get user stats
          break;
        case 'linkedin':
          // TODO: Call LinkedIn API to get user stats
          break;
        // Add other platforms...
      }

      // Update the account with fresh stats
      const updatedAccount = await prisma.socialAccount.update({
        where: { id: accountId },
        data: {
          followers,
          following
        },
        select: {
          id: true,
          platform: true,
          username: true,
          displayName: true,
          followers: true,
          following: true,
          updatedAt: true
        }
      });

      res.json({ account: updatedAccount });
    } catch (error) {
      console.error('Refresh account stats error:', error);
      res.status(500).json({
        error: 'Failed to refresh account statistics'
      });
    }
  }

  async getAccountInsights(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { accountId } = req.params;
      const { days = 30 } = req.query;

      const account = await prisma.socialAccount.findUnique({
        where: { id: accountId },
        select: {
          id: true,
          platform: true,
          username: true
        }
      });

      if (!account) {
        res.status(404).json({
          error: 'Social account not found'
        });
        return;
      }

      const daysBack = parseInt(days as string);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Get post analytics for the account
      const posts = await prisma.post.findMany({
        where: {
          socialAccountId: accountId,
          publishedAt: {
            gte: startDate
          },
          status: 'published'
        },
        include: {
          analytics: {
            orderBy: { date: 'desc' },
            take: 1
          }
        }
      });

      // Calculate insights
      const totalPosts = posts.length;
      const totalLikes = posts.reduce((sum, post) => 
        sum + (post.analytics[0]?.likes || 0), 0
      );
      const totalShares = posts.reduce((sum, post) => 
        sum + (post.analytics[0]?.shares || 0), 0
      );
      const totalComments = posts.reduce((sum, post) => 
        sum + (post.analytics[0]?.comments || 0), 0
      );
      const totalReach = posts.reduce((sum, post) => 
        sum + (post.analytics[0]?.reach || 0), 0
      );

      const avgEngagementRate = posts.length > 0 
        ? posts.reduce((sum, post) => 
            sum + (post.analytics[0]?.engagementRate || 0), 0
          ) / posts.length
        : 0;

      const insights = {
        account: {
          id: account.id,
          platform: account.platform,
          username: account.username
        },
        period: {
          days: daysBack,
          startDate,
          endDate: new Date()
        },
        metrics: {
          totalPosts,
          totalLikes,
          totalShares,
          totalComments,
          totalReach,
          avgEngagementRate: parseFloat(avgEngagementRate.toFixed(2))
        },
        topPosts: posts
          .sort((a, b) => (b.analytics[0]?.engagementRate || 0) - (a.analytics[0]?.engagementRate || 0))
          .slice(0, 5)
          .map(post => ({
            id: post.id,
            content: post.content?.substring(0, 100) + '...',
            publishedAt: post.publishedAt,
            engagementRate: post.analytics[0]?.engagementRate || 0,
            likes: post.analytics[0]?.likes || 0,
            shares: post.analytics[0]?.shares || 0,
            comments: post.analytics[0]?.comments || 0
          }))
      };

      res.json({ insights });
    } catch (error) {
      console.error('Get account insights error:', error);
      res.status(500).json({
        error: 'Failed to fetch account insights'
      });
    }
  }
}