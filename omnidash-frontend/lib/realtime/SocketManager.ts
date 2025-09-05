import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { NextApiRequest } from 'next';
import { Socket as ClientSocket, io as ioClient } from 'socket.io-client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/AuthManager';

// Server-side Socket.IO manager
export class SocketIOServer {
  private static instance: SocketIOServer;
  private io: Server | null = null;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> socketIds
  private socketUsers: Map<string, string> = new Map(); // socketId -> userId

  private constructor() {}

  public static getInstance(): SocketIOServer {
    if (!SocketIOServer.instance) {
      SocketIOServer.instance = new SocketIOServer();
    }
    return SocketIOServer.instance;
  }

  public initialize(server: HTTPServer) {
    if (this.io) {
      console.log('Socket.IO already initialized');
      return this.io;
    }

    this.io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3001",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupEventHandlers();
    console.log('🔌 Socket.IO server initialized');
    
    return this.io;
  }

  private setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', async (socket) => {
      console.log(`🔗 Client connected: ${socket.id}`);

      // Authenticate user
      const token = socket.handshake.auth.token;
      const userId = await this.authenticateSocket(token);

      if (!userId) {
        console.log(`❌ Authentication failed for socket ${socket.id}`);
        socket.emit('auth_error', { message: 'Authentication required' });
        socket.disconnect();
        return;
      }

      // Store socket-user mapping
      this.socketUsers.set(socket.id, userId);
      
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      console.log(`✅ User ${userId} authenticated with socket ${socket.id}`);

      // Join user-specific room
      socket.join(`user:${userId}`);

      // Send initial connection success
      socket.emit('connected', {
        userId,
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });

      // Handle room subscriptions
      socket.on('join_room', (roomId: string) => {
        socket.join(roomId);
        console.log(`👥 Socket ${socket.id} joined room: ${roomId}`);
        socket.emit('room_joined', { roomId });
      });

      socket.on('leave_room', (roomId: string) => {
        socket.leave(roomId);
        console.log(`👋 Socket ${socket.id} left room: ${roomId}`);
        socket.emit('room_left', { roomId });
      });

      // Handle workflow subscriptions
      socket.on('subscribe_workflow', (workflowId: string) => {
        socket.join(`workflow:${workflowId}`);
        console.log(`⚙️ Socket ${socket.id} subscribed to workflow: ${workflowId}`);
      });

      socket.on('unsubscribe_workflow', (workflowId: string) => {
        socket.leave(`workflow:${workflowId}`);
        console.log(`⚙️ Socket ${socket.id} unsubscribed from workflow: ${workflowId}`);
      });

      // Handle execution subscriptions
      socket.on('subscribe_execution', (executionId: string) => {
        socket.join(`execution:${executionId}`);
        console.log(`📊 Socket ${socket.id} subscribed to execution: ${executionId}`);
      });

      // Handle custom events
      socket.on('workflow_action', (data) => {
        this.handleWorkflowAction(socket, userId, data);
      });

      socket.on('test_workflow', (data) => {
        this.handleTestWorkflow(socket, userId, data);
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
        this.handleDisconnect(socket.id);
      });

      // Handle ping/pong for connection monitoring
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });
    });
  }

  private async authenticateSocket(token: string): Promise<string | null> {
    try {
      // In production, verify JWT token here
      // For development, return a mock user ID if token exists
      if (!token || token === 'null' || token === 'undefined') {
        return null;
      }

      // TODO: Implement proper JWT verification
      // For now, extract user ID from token or use session
      return token.replace('user:', '');
    } catch (error) {
      console.error('Socket authentication error:', error);
      return null;
    }
  }

  private handleWorkflowAction(socket: any, userId: string, data: any) {
    console.log(`⚙️ Workflow action from user ${userId}:`, data);
    
    // Broadcast to workflow subscribers
    if (data.workflowId) {
      socket.to(`workflow:${data.workflowId}`).emit('workflow_update', {
        action: data.action,
        workflowId: data.workflowId,
        userId,
        timestamp: new Date().toISOString(),
        data: data.payload
      });
    }
  }

  private handleTestWorkflow(socket: any, userId: string, data: any) {
    console.log(`🧪 Test workflow from user ${userId}:`, data);
    
    // Send test results back to user
    socket.emit('workflow_test_result', {
      workflowId: data.workflowId,
      success: true,
      result: {
        executionId: `test-${Date.now()}`,
        status: 'completed',
        duration: 1500,
        output: 'Test execution completed successfully'
      },
      timestamp: new Date().toISOString()
    });
  }

  private handleDisconnect(socketId: string) {
    const userId = this.socketUsers.get(socketId);
    
    if (userId) {
      // Remove socket from user's set
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socketId);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      
      // Remove socket-user mapping
      this.socketUsers.delete(socketId);
      
      console.log(`🗑️ Cleaned up mappings for socket ${socketId} (user ${userId})`);
    }
  }

  // Public methods for sending messages
  public sendToUser(userId: string, event: string, data: any) {
    if (!this.io) return false;
    
    this.io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
    return true;
  }

  public sendToWorkflow(workflowId: string, event: string, data: any) {
    if (!this.io) return false;
    
    this.io.to(`workflow:${workflowId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
    return true;
  }

  public sendToExecution(executionId: string, event: string, data: any) {
    if (!this.io) return false;
    
    this.io.to(`execution:${executionId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
    return true;
  }

  public broadcastToAll(event: string, data: any) {
    if (!this.io) return false;
    
    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
    return true;
  }

  // Get connection stats
  public getStats() {
    const totalSockets = this.socketUsers.size;
    const totalUsers = this.userSockets.size;
    
    return {
      totalSockets,
      totalUsers,
      userSockets: Object.fromEntries(
        Array.from(this.userSockets.entries()).map(([userId, sockets]) => [
          userId,
          sockets.size
        ])
      ),
      timestamp: new Date().toISOString()
    };
  }

  public getUserSockets(userId: string): string[] {
    const sockets = this.userSockets.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  public isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }
}

// Client-side Socket.IO manager
export class SocketIOClient {
  private static instance: SocketIOClient;
  private socket: ClientSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventHandlers: Map<string, (() => void)[]> = new Map();

  private constructor() {}

  public static getInstance(): SocketIOClient {
    if (!SocketIOClient.instance) {
      SocketIOClient.instance = new SocketIOClient();
    }
    return SocketIOClient.instance;
  }

  public connect(token: string) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    const serverUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    this.socket = ioClient(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    });

    this.setupClientEventHandlers();
    console.log('🔌 Connecting to Socket.IO server...');
  }

  private setupClientEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server');
      this.reconnectAttempts = 0;
      this.emit('connection_status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`❌ Disconnected from server: ${reason}`);
      this.emit('connection_status', { connected: false, reason });
      
      if (reason === 'io server disconnect') {
        // Server disconnected us, reconnect manually
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error);
      this.handleReconnect();
    });

    this.socket.on('auth_error', (error) => {
      console.error('🔐 Authentication error:', error);
      this.emit('auth_error', error);
    });

    this.socket.on('connected', (data) => {
      console.log('🎉 Successfully authenticated:', data);
      this.emit('authenticated', data);
    });

    // Workflow events
    this.socket.on('workflow_update', (data) => {
      this.emit('workflow_update', data);
    });

    this.socket.on('workflow_started', (data) => {
      this.emit('workflow_started', data);
    });

    this.socket.on('workflow_completed', (data) => {
      this.emit('workflow_completed', data);
    });

    this.socket.on('workflow_failed', (data) => {
      this.emit('workflow_failed', data);
    });

    // Execution events
    this.socket.on('execution_progress', (data) => {
      this.emit('execution_progress', data);
    });

    this.socket.on('execution_log', (data) => {
      this.emit('execution_log', data);
    });

    // Social media events
    this.socket.on('post_published', (data) => {
      this.emit('post_published', data);
    });

    this.socket.on('post_failed', (data) => {
      this.emit('post_failed', data);
    });

    // Content generation events
    this.socket.on('content_generated', (data) => {
      this.emit('content_generated', data);
    });

    // Pong response for connection monitoring
    this.socket.on('pong', (data) => {
      const latency = Date.now() - data.timestamp;
      this.emit('latency_update', { latency });
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('🚫 Max reconnection attempts reached');
      this.emit('reconnect_failed', { attempts: this.reconnectAttempts });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.socket?.connect();
    }, delay);
  }

  // Public methods
  public subscribeToWorkflow(workflowId: string) {
    this.socket?.emit('subscribe_workflow', workflowId);
  }

  public unsubscribeFromWorkflow(workflowId: string) {
    this.socket?.emit('unsubscribe_workflow', workflowId);
  }

  public subscribeToExecution(executionId: string) {
    this.socket?.emit('subscribe_execution', executionId);
  }

  public testWorkflow(workflowId: string, data?: any) {
    this.socket?.emit('test_workflow', { workflowId, ...data });
  }

  public sendWorkflowAction(action: string, workflowId: string, payload?: any) {
    this.socket?.emit('workflow_action', { action, workflowId, payload });
  }

  public ping() {
    this.socket?.emit('ping');
  }

  public joinRoom(roomId: string) {
    this.socket?.emit('join_room', roomId);
  }

  public leaveRoom(roomId: string) {
    this.socket?.emit('leave_room', roomId);
  }

  // Event handler management
  public on(event: string, handler: () => void) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  public off(event: string, handler: () => void) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('🔌 Disconnected from Socket.IO server');
    }
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public getLatency(): Promise<number> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const handler = () => {
        resolve(Date.now() - startTime);
        this.off('pong', handler);
      };
      
      this.on('pong', handler);
      this.ping();
    });
  }
}

// Export instances
export const socketServer = SocketIOServer.getInstance();
export const socketClient = SocketIOClient.getInstance();