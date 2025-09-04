import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateToken, verifyToken } from '@/utils/jwt';
import { hashPassword, comparePassword, generateSecureToken } from '@/utils/encryption';
import { LoginRequest, RegisterRequest, AuthResponse } from '@/types/auth';

const prisma = new PrismaClient();

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name }: RegisterRequest = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        res.status(409).json({
          error: 'User already exists with this email'
        });
        return;
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true
        }
      });

      // Generate JWT
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      // Create session
      await prisma.userSession.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      const response: AuthResponse = {
        user,
        token,
        expiresIn: '7d'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Internal server error during registration'
      });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password }: LoginRequest = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          password: true,
          isActive: true
        }
      });

      if (!user || !user.isActive) {
        res.status(401).json({
          error: 'Invalid email or password'
        });
        return;
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password!);
      if (!isPasswordValid) {
        res.status(401).json({
          error: 'Invalid email or password'
        });
        return;
      }

      // Generate JWT
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      // Clean up expired sessions and create new one
      await prisma.userSession.deleteMany({
        where: {
          userId: user.id,
          expiresAt: { lt: new Date() }
        }
      });

      await prisma.userSession.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      const response: AuthResponse = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name!,
          avatar: user.avatar,
          role: user.role
        },
        token,
        expiresIn: '7d'
      };

      res.json(response);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Internal server error during login'
      });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        await prisma.userSession.deleteMany({
          where: { token }
        });
      }

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        error: 'Internal server error during logout'
      });
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        res.status(401).json({ error: 'No token provided' });
        return;
      }

      const decoded = verifyToken(token);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          timezone: true,
          preferences: true,
          lastLogin: true,
          createdAt: true
        }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({ user });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(401).json({ error: 'Invalid token' });
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        // Don't reveal if user exists
        res.json({ 
          message: 'If a user with this email exists, a password reset link has been sent.' 
        });
        return;
      }

      // Generate reset token
      const resetToken = generateSecureToken();
      
      // TODO: Store reset token in database with expiration
      // TODO: Send email with reset link
      
      res.json({ 
        message: 'If a user with this email exists, a password reset link has been sent.' 
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, password } = req.body;

      // TODO: Verify reset token and expiration
      // TODO: Update user password
      
      res.json({ 
        message: 'Password reset successfully' 
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        res.status(401).json({ error: 'No token provided' });
        return;
      }

      const decoded = verifyToken(token);
      
      // Verify session exists and is valid
      const session = await prisma.userSession.findFirst({
        where: {
          token,
          userId: decoded.userId,
          expiresAt: { gt: new Date() }
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatar: true,
              role: true,
              isActive: true
            }
          }
        }
      });

      if (!session || !session.user.isActive) {
        res.status(401).json({ error: 'Invalid or expired session' });
        return;
      }

      // Generate new token
      const newToken = generateToken({
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role
      });

      // Update session
      await prisma.userSession.update({
        where: { id: session.id },
        data: {
          token: newToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      const response: AuthResponse = {
        user: session.user,
        token: newToken,
        expiresIn: '7d'
      };

      res.json(response);
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(401).json({ error: 'Invalid token' });
    }
  }
}