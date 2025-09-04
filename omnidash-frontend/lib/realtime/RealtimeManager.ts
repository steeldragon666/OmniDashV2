import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { createClient } from '@supabase/supabase-js';
import { AuthManager } from '../auth/AuthManager';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface RealtimeEvent {
  type: string;
  data: any;
  userId?: string;
  workflowId?: string;
  executionId?: string;
  timestamp: string;
}

export interface UserConnection {
  socketId: string;
  userId: string;
  rooms: Set<string>;
  lastActivity: Date;
}

export class RealtimeManager {
  private io: SocketIOServer | null = null;
  private connections: Map<string, UserConnection> = new Map();
  private userSockets: Map<string, Set<string>> = new Map();
  private authManager: AuthManager;

  constructor() {
    this.authManager = AuthManager.getInstance();
  }

  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.startCleanupTask();

    console.log('🔄 Realtime Manager initialized');
  }

  private setupMiddleware() {
    if (!this.io) return;

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Validate token (implement your token validation logic)
        const userId = await this.validateToken(token);
        if (!userId) {
          return next(new Error('Invalid authentication token'));
        }

        (socket as any).userId = userId;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  private async validateToken(token: string): Promise<string | null> {
    try {
      // If it's an API key
      if (token.startsWith('omnidash_')) {
        const result = await this.authManager.validateAPIKey(token);
        return result?.userId || null;
      }

      // If it's a JWT token (implement JWT validation)
      // For now, we'll assume it's a simple userId for demo purposes
      return token; // This should be replaced with proper JWT validation
    } catch (error) {
      console.error('Token validation failed:', error);
      return null;
    }
  }

  private setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      const userId = (socket as any).userId;
      console.log(`🔌 User ${userId} connected (${socket.id})`);

      // Track connection
      this.connections.set(socket.id, {
        socketId: socket.id,
        userId,
        rooms: new Set(),
        lastActivity: new Date()
      });

      // Track user sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      // Join user room
      socket.join(`user:${userId}`);

      // Handle room joining
      socket.on('join-room', (room: string) => {
        socket.join(room);
        const connection = this.connections.get(socket.id);
        if (connection) {
          connection.rooms.add(room);
          connection.lastActivity = new Date();
        }
        console.log(`👥 User ${userId} joined room: ${room}`);
      });

      // Handle room leaving
      socket.on('leave-room', (room: string) => {
        socket.leave(room);
        const connection = this.connections.get(socket.id);
        if (connection) {
          connection.rooms.delete(room);
          connection.lastActivity = new Date();
        }
        console.log(`👋 User ${userId} left room: ${room}`);
      });

      // Handle workflow subscription
      socket.on('subscribe-workflow', (workflowId: string) => {
        socket.join(`workflow:${workflowId}`);
        console.log(`📝 User ${userId} subscribed to workflow: ${workflowId}`);
      });

      // Handle execution subscription
      socket.on('subscribe-execution', (executionId: string) => {
        socket.join(`execution:${executionId}`);
        console.log(`⚙️ User ${userId} subscribed to execution: ${executionId}`);
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        const connection = this.connections.get(socket.id);
        if (connection) {
          connection.lastActivity = new Date();
        }
        socket.emit('pong');
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`🔌 User ${userId} disconnected (${socket.id}): ${reason}`);
        
        // Clean up connection tracking
        this.connections.delete(socket.id);
        
        const userSocketSet = this.userSockets.get(userId);
        if (userSocketSet) {
          userSocketSet.delete(socket.id);
          if (userSocketSet.size === 0) {
            this.userSockets.delete(userId);
          }
        }
      });

      // Send connection success
      socket.emit('connected', { 
        userId, 
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
    });
  }

  // Public API for sending events

  // Send event to specific user
  sendToUser(userId: string, event: RealtimeEvent) {
    if (!this.io) return false;

    this.io.to(`user:${userId}`).emit(event.type, {
      ...event,
      timestamp: new Date().toISOString()
    });

    return true;
  }

  // Send event to all users in a room
  sendToRoom(room: string, event: RealtimeEvent) {
    if (!this.io) return false;

    this.io.to(room).emit(event.type, {
      ...event,
      timestamp: new Date().toISOString()
    });

    return true;
  }

  // Send workflow events
  sendWorkflowEvent(workflowId: string, event: RealtimeEvent) {
    return this.sendToRoom(`workflow:${workflowId}`, {
      ...event,
      workflowId,
      type: `workflow:${event.type}`
    });
  }

  // Send execution events
  sendExecutionEvent(executionId: string, event: RealtimeEvent) {
    return this.sendToRoom(`execution:${executionId}`, {
      ...event,
      executionId,
      type: `execution:${event.type}`
    });
  }

  // Send system-wide events
  broadcast(event: RealtimeEvent) {
    if (!this.io) return false;

    this.io.emit(event.type, {
      ...event,
      timestamp: new Date().toISOString()
    });

    return true;
  }

  // Workflow-specific events
  notifyWorkflowStarted(workflowId: string, executionId: string, userId: string) {
    this.sendWorkflowEvent(workflowId, {
      type: 'started',
      data: { executionId, status: 'running' },
      userId,
      workflowId,
      executionId,
      timestamp: new Date().toISOString()
    });
  }

  notifyWorkflowCompleted(workflowId: string, executionId: string, result: any, userId: string) {
    this.sendWorkflowEvent(workflowId, {
      type: 'completed',
      data: { executionId, status: 'completed', result },
      userId,
      workflowId,
      executionId,
      timestamp: new Date().toISOString()
    });
  }

  notifyWorkflowFailed(workflowId: string, executionId: string, error: any, userId: string) {
    this.sendWorkflowEvent(workflowId, {
      type: 'failed',
      data: { executionId, status: 'failed', error: error.message },
      userId,
      workflowId,
      executionId,
      timestamp: new Date().toISOString()
    });
  }

  notifyWorkflowProgress(workflowId: string, executionId: string, progress: any, userId: string) {
    this.sendWorkflowEvent(workflowId, {
      type: 'progress',
      data: { executionId, progress },
      userId,
      workflowId,
      executionId,
      timestamp: new Date().toISOString()
    });
  }

  // Action-specific events
  notifyActionStarted(executionId: string, actionId: string, actionType: string, userId: string) {
    this.sendExecutionEvent(executionId, {
      type: 'action:started',
      data: { actionId, actionType, status: 'running' },
      userId,
      executionId,
      timestamp: new Date().toISOString()
    });
  }

  notifyActionCompleted(executionId: string, actionId: string, result: any, userId: string) {
    this.sendExecutionEvent(executionId, {
      type: 'action:completed',
      data: { actionId, status: 'completed', result },
      userId,
      executionId,
      timestamp: new Date().toISOString()
    });
  }

  notifyActionFailed(executionId: string, actionId: string, error: any, userId: string) {
    this.sendExecutionEvent(executionId, {
      type: 'action:failed',
      data: { actionId, status: 'failed', error: error.message },
      userId,
      executionId,
      timestamp: new Date().toISOString()
    });
  }

  // Social media events
  notifyPostPublished(userId: string, postId: string, platform: string, url?: string) {
    this.sendToUser(userId, {
      type: 'social:post:published',
      data: { postId, platform, url, status: 'published' },
      userId,
      timestamp: new Date().toISOString()
    });
  }

  notifyPostFailed(userId: string, postId: string, platform: string, error: any) {
    this.sendToUser(userId, {
      type: 'social:post:failed',
      data: { postId, platform, error: error.message, status: 'failed' },
      userId,
      timestamp: new Date().toISOString()
    });
  }

  // System events
  notifySystemMaintenance(message: string, scheduledAt?: Date) {
    this.broadcast({
      type: 'system:maintenance',
      data: { message, scheduledAt },
      timestamp: new Date().toISOString()
    });
  }

  notifySystemAlert(level: 'info' | 'warning' | 'error', message: string, userId?: string) {
    const event: RealtimeEvent = {
      type: `system:alert:${level}`,
      data: { message, level },
      timestamp: new Date().toISOString()
    };

    if (userId) {
      this.sendToUser(userId, event);
    } else {
      this.broadcast(event);
    }
  }

  // Connection management
  getConnectionStats() {
    return {
      totalConnections: this.connections.size,
      uniqueUsers: this.userSockets.size,
      connectionsPerUser: Array.from(this.userSockets.entries()).map(([userId, sockets]) => ({
        userId,
        connectionCount: sockets.size
      })),
      timestamp: new Date().toISOString()
    };
  }

  getConnectionsByUser(userId: string): UserConnection[] {
    const socketIds = this.userSockets.get(userId) || new Set();
    return Array.from(socketIds)
      .map(socketId => this.connections.get(socketId))
      .filter(conn => conn !== undefined) as UserConnection[];
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  disconnectUser(userId: string, reason?: string) {
    const socketIds = this.userSockets.get(userId);
    if (!socketIds || !this.io) return false;

    socketIds.forEach(socketId => {
      const socket = this.io!.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(reason || 'Server requested disconnect');
      }
    });

    return true;
  }

  // Cleanup stale connections
  private startCleanupTask() {
    setInterval(() => {
      const now = new Date();
      const staleConnections: string[] = [];

      this.connections.forEach((connection, socketId) => {
        const inactiveTime = now.getTime() - connection.lastActivity.getTime();
        
        // Consider connections stale after 5 minutes of inactivity
        if (inactiveTime > 5 * 60 * 1000) {
          staleConnections.push(socketId);
        }
      });

      staleConnections.forEach(socketId => {
        const connection = this.connections.get(socketId);
        if (connection && this.io) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.disconnect('Inactive connection cleanup');
          }
        }
      });

      if (staleConnections.length > 0) {
        console.log(`🧹 Cleaned up ${staleConnections.length} stale connections`);
      }
    }, 60000); // Run every minute
  }

  // Shutdown
  async shutdown() {
    console.log('🔄 Shutting down Realtime Manager...');
    
    if (this.io) {
      // Notify all clients of shutdown
      this.broadcast({
        type: 'system:shutdown',
        data: { message: 'Server is shutting down' },
        timestamp: new Date().toISOString()
      });

      // Close all connections
      this.io.close();
    }

    // Clear all tracking data
    this.connections.clear();
    this.userSockets.clear();

    console.log('✅ Realtime Manager shutdown complete');
  }
}

// Singleton instance
export const realtimeManager = new RealtimeManager();