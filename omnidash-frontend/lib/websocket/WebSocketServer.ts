/**
 * Secure WebSocket Server with JWT Verification
 * Implements authentication, rate limiting, and secure message handling
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { logger } from '../logging/logger';
import { env } from '../env';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  sessionId?: string;
  authenticated?: boolean;
  rateLimiter?: RateLimiterMemory;
}

interface JWTPayload {
  userId: string;
  sessionId: string;
  iat: number;
  exp: number;
}

export class SecureWebSocketServer {
  private io: SocketIOServer;
  private connectedClients: Map<string, AuthenticatedSocket> = new Map();
  private rateLimiter: RateLimiterMemory;
  private jwtSecret: string;
  
  constructor(httpServer: HTTPServer) {
    // Validate JWT secret
    this.jwtSecret = env.get('NEXTAUTH_SECRET') || '';
    if (!this.jwtSecret) {
      throw new Error('NEXTAUTH_SECRET is required for WebSocket JWT verification');
    }
    
    // Initialize rate limiter
    this.rateLimiter = new RateLimiterMemory({
      points: 100, // Number of points
      duration: 60, // Per minute
      blockDuration: 60 * 5, // Block for 5 minutes
    });
    
    // Initialize Socket.IO with security options
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: this.getAllowedOrigins(),
        credentials: true,
        methods: ['GET', 'POST']
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling'],
      allowEIO3: true
    });
    
    this.setupMiddleware();
    this.setupEventHandlers();
    
    logger.info('Secure WebSocket server initialized');
  }
  
  /**
   * Get allowed origins from environment
   */
  private getAllowedOrigins(): string[] {
    const origins = [
      env.get('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000',
      env.get('NEXT_PUBLIC_APP_URL')?.replace('http:', 'https:') || 'https://localhost:3000'
    ];
    
    // Add production domain if configured
    const productionUrl = env.get('NEXT_PUBLIC_APP_URL');
    if (productionUrl && !productionUrl.includes('localhost')) {
      origins.push(productionUrl);
    }
    
    return origins.filter(Boolean);
  }
  
  /**
   * Setup middleware for authentication and rate limiting
   */
  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        // Extract token from handshake
        const token = this.extractToken(socket);
        
        if (!token) {
          logger.warn('WebSocket connection attempt without token', {
            ip: socket.handshake.address
          });
          return next(new Error('Authentication required'));
        }
        
        // Verify JWT token
        const payload = await this.verifyToken(token);
        
        if (!payload) {
          logger.warn('WebSocket connection with invalid token', {
            ip: socket.handshake.address,
            token: token.substring(0, 10) + '...'
          });
          return next(new Error('Invalid authentication token'));
        }
        
        // Check token expiration
        if (this.isTokenExpired(payload)) {
          logger.warn('WebSocket connection with expired token', {
            userId: payload.userId,
            expired: new Date(payload.exp * 1000)
          });
          return next(new Error('Token expired'));
        }
        
        // Attach user info to socket
        socket.userId = payload.userId;
        socket.sessionId = payload.sessionId;
        socket.authenticated = true;
        
        // Create per-user rate limiter
        socket.rateLimiter = new RateLimiterMemory({
          points: 50,
          duration: 60,
          keyPrefix: `ws_${socket.userId}`
        });
        
        logger.info('WebSocket client authenticated', {
          userId: socket.userId,
          sessionId: socket.sessionId,
          ip: socket.handshake.address
        });
        
        next();
      } catch (error) {
        logger.error('WebSocket authentication error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          ip: socket.handshake.address
        });
        next(new Error('Authentication failed'));
      }
    });
    
    // Rate limiting middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const key = socket.handshake.address;
        
        await this.rateLimiter.consume(key, 1);
        next();
      } catch (rejRes) {
        logger.warn('WebSocket rate limit exceeded', {
          ip: socket.handshake.address,
          userId: socket.userId
        });
        next(new Error('Too many connection attempts'));
      }
    });
  }
  
  /**
   * Extract token from socket handshake
   */
  private extractToken(socket: AuthenticatedSocket): string | null {
    // Try to get token from query params
    let token = socket.handshake.query.token as string;
    
    // Try to get token from auth header
    if (!token && socket.handshake.headers.authorization) {
      const parts = socket.handshake.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }
    
    // Try to get token from cookie
    if (!token && socket.handshake.headers.cookie) {
      const cookies = this.parseCookies(socket.handshake.headers.cookie);
      token = cookies['next-auth.session-token'] || cookies['__Secure-next-auth.session-token'];
    }
    
    return token || null;
  }
  
  /**
   * Parse cookie string
   */
  private parseCookies(cookieString: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    
    cookieString.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
    
    return cookies;
  }
  
  /**
   * Verify JWT token
   */
  private async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.debug('JWT token expired', { error: error.message });
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.debug('Invalid JWT token', { error: error.message });
      }
      return null;
    }
  }
  
  /**
   * Check if token is expired
   */
  private isTokenExpired(payload: JWTPayload): boolean {
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  }
  
  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      if (!socket.authenticated || !socket.userId) {
        logger.error('Unauthenticated socket passed middleware');
        socket.disconnect(true);
        return;
      }
      
      // Store connected client
      this.connectedClients.set(socket.userId, socket);
      
      logger.info('WebSocket client connected', {
        userId: socket.userId,
        socketId: socket.id,
        totalClients: this.connectedClients.size
      });
      
      // Join user-specific room
      socket.join(`user:${socket.userId}`);
      
      // Handle incoming messages with rate limiting
      socket.on('message', async (data, callback) => {
        try {
          // Rate limit check
          if (socket.rateLimiter) {
            await socket.rateLimiter.consume(socket.userId!, 1);
          }
          
          await this.handleMessage(socket, data);
          
          if (callback) {
            callback({ success: true });
          }
        } catch (error) {
          logger.warn('Message handling failed', {
            userId: socket.userId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          if (callback) {
            callback({ 
              success: false, 
              error: 'Message processing failed' 
            });
          }
        }
      });
      
      // Handle subscription requests
      socket.on('subscribe', async (channel: string, callback) => {
        try {
          const allowed = await this.canSubscribe(socket, channel);
          
          if (allowed) {
            socket.join(channel);
            logger.debug('Client subscribed to channel', {
              userId: socket.userId,
              channel
            });
            
            if (callback) {
              callback({ success: true });
            }
          } else {
            logger.warn('Subscription denied', {
              userId: socket.userId,
              channel
            });
            
            if (callback) {
              callback({ 
                success: false, 
                error: 'Subscription not allowed' 
              });
            }
          }
        } catch (error) {
          logger.error('Subscription error', {
            userId: socket.userId,
            channel,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          if (callback) {
            callback({ 
              success: false, 
              error: 'Subscription failed' 
            });
          }
        }
      });
      
      // Handle unsubscribe
      socket.on('unsubscribe', (channel: string) => {
        socket.leave(channel);
        logger.debug('Client unsubscribed from channel', {
          userId: socket.userId,
          channel
        });
      });
      
      // Handle disconnect
      socket.on('disconnect', (reason) => {
        this.connectedClients.delete(socket.userId!);
        
        logger.info('WebSocket client disconnected', {
          userId: socket.userId,
          reason,
          totalClients: this.connectedClients.size
        });
      });
      
      // Handle errors
      socket.on('error', (error) => {
        logger.error('WebSocket error', {
          userId: socket.userId,
          error: error.message
        });
      });
      
      // Send welcome message
      socket.emit('connected', {
        userId: socket.userId,
        sessionId: socket.sessionId,
        timestamp: new Date().toISOString()
      });
    });
  }
  
  /**
   * Handle incoming messages
   */
  private async handleMessage(socket: AuthenticatedSocket, data: any): Promise<void> {
    // Validate message structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid message format');
    }
    
    // Log message for audit
    logger.debug('WebSocket message received', {
      userId: socket.userId,
      type: data.type,
      timestamp: new Date().toISOString()
    });
    
    // Process based on message type
    switch (data.type) {
      case 'ping':
        socket.emit('pong', { timestamp: Date.now() });
        break;
        
      case 'broadcast':
        // Check permission to broadcast
        if (await this.canBroadcast(socket)) {
          this.broadcast(data.channel || 'general', data.payload, socket.userId!);
        } else {
          socket.emit('error', { 
            message: 'Broadcast not allowed' 
          });
        }
        break;
        
      case 'private':
        // Send private message to specific user
        if (data.targetUserId) {
          this.sendToUser(data.targetUserId, data.payload);
        }
        break;
        
      default:
        logger.warn('Unknown message type', {
          userId: socket.userId,
          type: data.type
        });
    }
  }
  
  /**
   * Check if user can subscribe to channel
   */
  private async canSubscribe(socket: AuthenticatedSocket, channel: string): Promise<boolean> {
    // Implement your authorization logic here
    // For now, users can only subscribe to their own channels or public channels
    
    if (channel.startsWith('user:')) {
      const targetUserId = channel.replace('user:', '');
      return targetUserId === socket.userId;
    }
    
    if (channel.startsWith('public:')) {
      return true;
    }
    
    // Check other permissions based on your requirements
    return false;
  }
  
  /**
   * Check if user can broadcast
   */
  private async canBroadcast(socket: AuthenticatedSocket): Promise<boolean> {
    // Implement your authorization logic
    // For example, check if user has admin role or broadcast permission
    return false; // Default to false for security
  }
  
  /**
   * Broadcast message to channel
   */
  public broadcast(channel: string, data: any, excludeUserId?: string): void {
    logger.debug('Broadcasting message', {
      channel,
      excludeUserId
    });
    
    if (excludeUserId) {
      this.io.to(channel).except(`user:${excludeUserId}`).emit('message', {
        channel,
        data,
        timestamp: new Date().toISOString()
      });
    } else {
      this.io.to(channel).emit('message', {
        channel,
        data,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * Send message to specific user
   */
  public sendToUser(userId: string, data: any): void {
    const socket = this.connectedClients.get(userId);
    
    if (socket) {
      socket.emit('message', {
        data,
        timestamp: new Date().toISOString()
      });
      
      logger.debug('Message sent to user', {
        userId,
        connected: true
      });
    } else {
      logger.debug('User not connected', {
        userId,
        connected: false
      });
    }
  }
  
  /**
   * Get connected users count
   */
  public getConnectedUsersCount(): number {
    return this.connectedClients.size;
  }
  
  /**
   * Check if user is connected
   */
  public isUserConnected(userId: string): boolean {
    return this.connectedClients.has(userId);
  }
  
  /**
   * Disconnect user
   */
  public disconnectUser(userId: string, reason = 'Server initiated'): void {
    const socket = this.connectedClients.get(userId);
    
    if (socket) {
      socket.emit('disconnect_reason', { reason });
      socket.disconnect(true);
      
      logger.info('User disconnected by server', {
        userId,
        reason
      });
    }
  }
  
  /**
   * Shutdown WebSocket server
   */
  public shutdown(): void {
    logger.info('Shutting down WebSocket server');
    
    // Disconnect all clients
    this.connectedClients.forEach((socket, userId) => {
      socket.emit('server_shutdown', {
        message: 'Server is shutting down'
      });
      socket.disconnect(true);
    });
    
    // Close server
    this.io.close();
    
    logger.info('WebSocket server shutdown complete');
  }
}

export default SecureWebSocketServer;