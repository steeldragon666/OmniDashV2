import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as slugify from 'slugify';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class BrandController {
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, description, website, industry, themeConfig } = req.body;
      const userId = req.user!.id;

      // Generate unique slug
      let baseSlug = slugify(name, { lower: true, strict: true });
      let slug = baseSlug;
      let counter = 1;

      while (await prisma.brand.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const brand = await prisma.brand.create({
        data: {
          name,
          slug,
          description,
          website,
          industry,
          themeConfig,
          members: {
            create: {
              userId,
              role: 'owner',
              permissions: {
                canManageMembers: true,
                canManageSocialAccounts: true,
                canCreateContent: true,
                canPublishContent: true,
                canManageWorkflows: true,
                canViewAnalytics: true,
                canManageBrand: true
              }
            }
          }
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true
                }
              }
            }
          },
          socialAccounts: true,
          _count: {
            select: {
              posts: true,
              workflows: true
            }
          }
        }
      });

      res.status(201).json({ brand });
    } catch (error) {
      console.error('Create brand error:', error);
      res.status(500).json({
        error: 'Failed to create brand'
      });
    }
  }

  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const brands = await prisma.brand.findMany({
        where: {
          members: {
            some: {
              userId
            }
          },
          isActive: true
        },
        include: {
          members: {
            where: { userId },
            select: {
              role: true,
              permissions: true
            }
          },
          socialAccounts: {
            where: { isActive: true },
            select: {
              id: true,
              platform: true,
              username: true,
              followers: true
            }
          },
          _count: {
            select: {
              posts: true,
              workflows: {
                where: { isActive: true }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({ brands });
    } catch (error) {
      console.error('List brands error:', error);
      res.status(500).json({
        error: 'Failed to fetch brands'
      });
    }
  }

  async get(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const userId = req.user!.id;

      const brand = await prisma.brand.findFirst({
        where: {
          id: brandId,
          members: {
            some: { userId }
          },
          isActive: true
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true
                }
              }
            }
          },
          socialAccounts: {
            where: { isActive: true },
            select: {
              id: true,
              platform: true,
              username: true,
              displayName: true,
              followers: true,
              following: true,
              createdAt: true,
              updatedAt: true
            }
          },
          workflows: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              description: true,
              status: true,
              createdAt: true
            }
          },
          _count: {
            select: {
              posts: true,
              analytics: true
            }
          }
        }
      });

      if (!brand) {
        res.status(404).json({
          error: 'Brand not found'
        });
        return;
      }

      res.json({ brand });
    } catch (error) {
      console.error('Get brand error:', error);
      res.status(500).json({
        error: 'Failed to fetch brand'
      });
    }
  }

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { name, description, website, industry, themeConfig } = req.body;
      const userId = req.user!.id;

      // Check if user has admin/owner permissions
      const brandMember = await prisma.brandMember.findFirst({
        where: {
          brandId,
          userId,
          role: { in: ['owner', 'admin'] }
        }
      });

      if (!brandMember) {
        res.status(403).json({
          error: 'Insufficient permissions to update brand'
        });
        return;
      }

      const updateData: any = {};
      
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (website !== undefined) updateData.website = website;
      if (industry !== undefined) updateData.industry = industry;
      if (themeConfig !== undefined) updateData.themeConfig = themeConfig;

      // Generate new slug if name changed
      if (name) {
        let baseSlug = slugify(name, { lower: true, strict: true });
        let slug = baseSlug;
        let counter = 1;

        while (await prisma.brand.findFirst({ 
          where: { 
            slug,
            id: { not: brandId }
          } 
        })) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }

        updateData.slug = slug;
      }

      const brand = await prisma.brand.update({
        where: { id: brandId },
        data: updateData,
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true
                }
              }
            }
          },
          socialAccounts: {
            where: { isActive: true }
          },
          _count: {
            select: {
              posts: true,
              workflows: true
            }
          }
        }
      });

      res.json({ brand });
    } catch (error) {
      console.error('Update brand error:', error);
      res.status(500).json({
        error: 'Failed to update brand'
      });
    }
  }

  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const userId = req.user!.id;

      // Check if user is owner
      const brandMember = await prisma.brandMember.findFirst({
        where: {
          brandId,
          userId,
          role: 'owner'
        }
      });

      if (!brandMember) {
        res.status(403).json({
          error: 'Only brand owners can delete brands'
        });
        return;
      }

      // Soft delete - set isActive to false
      await prisma.brand.update({
        where: { id: brandId },
        data: { isActive: false }
      });

      res.json({ message: 'Brand deleted successfully' });
    } catch (error) {
      console.error('Delete brand error:', error);
      res.status(500).json({
        error: 'Failed to delete brand'
      });
    }
  }

  async addMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { email, role, permissions } = req.body;
      const userId = req.user!.id;

      // Check if current user has permission to add members
      const currentMember = await prisma.brandMember.findFirst({
        where: {
          brandId,
          userId,
          role: { in: ['owner', 'admin'] }
        }
      });

      if (!currentMember) {
        res.status(403).json({
          error: 'Insufficient permissions to add members'
        });
        return;
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true, avatar: true }
      });

      if (!user) {
        res.status(404).json({
          error: 'User not found with this email'
        });
        return;
      }

      // Check if user is already a member
      const existingMember = await prisma.brandMember.findUnique({
        where: {
          brandId_userId: {
            brandId,
            userId: user.id
          }
        }
      });

      if (existingMember) {
        res.status(409).json({
          error: 'User is already a member of this brand'
        });
        return;
      }

      // Default permissions based on role
      const defaultPermissions = {
        viewer: {
          canViewAnalytics: true,
          canCreateContent: false,
          canPublishContent: false,
          canManageSocialAccounts: false,
          canManageMembers: false,
          canManageWorkflows: false,
          canManageBrand: false
        },
        editor: {
          canViewAnalytics: true,
          canCreateContent: true,
          canPublishContent: true,
          canManageSocialAccounts: false,
          canManageMembers: false,
          canManageWorkflows: false,
          canManageBrand: false
        },
        admin: {
          canViewAnalytics: true,
          canCreateContent: true,
          canPublishContent: true,
          canManageSocialAccounts: true,
          canManageMembers: true,
          canManageWorkflows: true,
          canManageBrand: false
        }
      };

      const member = await prisma.brandMember.create({
        data: {
          brandId,
          userId: user.id,
          role,
          permissions: permissions || defaultPermissions[role as keyof typeof defaultPermissions]
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          }
        }
      });

      res.status(201).json({ member });
    } catch (error) {
      console.error('Add member error:', error);
      res.status(500).json({
        error: 'Failed to add member'
      });
    }
  }

  async removeMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { brandId, memberId } = req.params;
      const userId = req.user!.id;

      // Check if current user has permission
      const currentMember = await prisma.brandMember.findFirst({
        where: {
          brandId,
          userId,
          role: { in: ['owner', 'admin'] }
        }
      });

      if (!currentMember) {
        res.status(403).json({
          error: 'Insufficient permissions to remove members'
        });
        return;
      }

      // Get member to remove
      const memberToRemove = await prisma.brandMember.findUnique({
        where: { id: memberId },
        include: { user: { select: { id: true } } }
      });

      if (!memberToRemove || memberToRemove.brandId !== brandId) {
        res.status(404).json({
          error: 'Member not found'
        });
        return;
      }

      // Prevent removing the last owner
      if (memberToRemove.role === 'owner') {
        const ownerCount = await prisma.brandMember.count({
          where: {
            brandId,
            role: 'owner'
          }
        });

        if (ownerCount <= 1) {
          res.status(400).json({
            error: 'Cannot remove the last owner of the brand'
          });
          return;
        }
      }

      // Prevent non-owners from removing owners
      if (currentMember.role !== 'owner' && memberToRemove.role === 'owner') {
        res.status(403).json({
          error: 'Only owners can remove other owners'
        });
        return;
      }

      await prisma.brandMember.delete({
        where: { id: memberId }
      });

      res.json({ message: 'Member removed successfully' });
    } catch (error) {
      console.error('Remove member error:', error);
      res.status(500).json({
        error: 'Failed to remove member'
      });
    }
  }

  async updateMemberRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { brandId, memberId } = req.params;
      const { role, permissions } = req.body;
      const userId = req.user!.id;

      // Check if current user has permission
      const currentMember = await prisma.brandMember.findFirst({
        where: {
          brandId,
          userId,
          role: 'owner'
        }
      });

      if (!currentMember) {
        res.status(403).json({
          error: 'Only owners can update member roles'
        });
        return;
      }

      const member = await prisma.brandMember.update({
        where: { id: memberId },
        data: {
          role,
          permissions: permissions || undefined
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          }
        }
      });

      res.json({ member });
    } catch (error) {
      console.error('Update member role error:', error);
      res.status(500).json({
        error: 'Failed to update member role'
      });
    }
  }
}