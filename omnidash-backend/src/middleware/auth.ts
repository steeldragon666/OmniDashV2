import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@/utils/jwt';
import { JWTPayload } from '@/types/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
      return;
    }

    const decoded = verifyToken(token);
    
    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isActive: true }
    });

    if (!user || !user.isActive) {
      res.status(401).json({ 
        error: 'Access denied. Invalid user.' 
      });
      return;
    }

    // Check if session is valid
    const session = await prisma.userSession.findFirst({
      where: {
        token,
        userId: user.id,
        expiresAt: { gt: new Date() }
      }
    });

    if (!session) {
      res.status(401).json({ 
        error: 'Access denied. Session expired.' 
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(403).json({ 
      error: 'Invalid token.' 
    });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Access denied. Authentication required.' 
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.' 
      });
      return;
    }

    next();
  };
};

export const requireBrandAccess = (minimumRole: string = 'viewer') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ 
          error: 'Access denied. Authentication required.' 
        });
        return;
      }

      const brandId = req.params.brandId || req.body.brandId;
      if (!brandId) {
        res.status(400).json({ 
          error: 'Brand ID is required.' 
        });
        return;
      }

      const brandMember = await prisma.brandMember.findUnique({
        where: {
          brandId_userId: {
            brandId,
            userId: req.user.id
          }
        },
        include: {
          brand: { select: { isActive: true } }
        }
      });

      if (!brandMember || !brandMember.brand.isActive) {
        res.status(403).json({ 
          error: 'Access denied. Brand not found or access denied.' 
        });
        return;
      }

      // Check role hierarchy: owner > admin > editor > viewer
      const roleHierarchy = ['viewer', 'editor', 'admin', 'owner'];
      const userRoleIndex = roleHierarchy.indexOf(brandMember.role);
      const requiredRoleIndex = roleHierarchy.indexOf(minimumRole);

      if (userRoleIndex < requiredRoleIndex) {
        res.status(403).json({ 
          error: 'Access denied. Insufficient brand permissions.' 
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal server error.' 
      });
    }
  };
};