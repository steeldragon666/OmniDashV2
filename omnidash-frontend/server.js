const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT, 10) || 3001;

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server
  const httpServer = createServer(handler);

  // Initialize Socket.IO
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || "http://localhost:3001",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Socket.IO connection handling
  const userSockets = new Map(); // userId -> Set<socketId>
  const socketUsers = new Map(); // socketId -> userId

  io.on('connection', async (socket) => {
    console.log(`🔗 Client connected: ${socket.id}`);

    // Simple authentication - in production, verify JWT
    const token = socket.handshake.auth.token;
    if (!token || token === 'null' || token === 'undefined') {
      console.log(`❌ No auth token for socket ${socket.id}`);
      socket.emit('auth_error', { message: 'Authentication required' });
      socket.disconnect();
      return;
    }

    // Extract user ID from token (simplified for development)
    const userId = token.replace('user:', '') || 'anonymous';
    
    // Store socket-user mapping
    socketUsers.set(socket.id, userId);
    
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    console.log(`✅ User ${userId} authenticated with socket ${socket.id}`);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Send connection success
    socket.emit('connected', {
      userId,
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });

    // Handle room subscriptions
    socket.on('join_room', (roomId) => {
      socket.join(roomId);
      console.log(`👥 Socket ${socket.id} joined room: ${roomId}`);
      socket.emit('room_joined', { roomId });
    });

    socket.on('leave_room', (roomId) => {
      socket.leave(roomId);
      console.log(`👋 Socket ${socket.id} left room: ${roomId}`);
      socket.emit('room_left', { roomId });
    });

    // Handle workflow subscriptions
    socket.on('subscribe_workflow', (workflowId) => {
      socket.join(`workflow:${workflowId}`);
      console.log(`⚙️ Socket ${socket.id} subscribed to workflow: ${workflowId}`);
    });

    socket.on('unsubscribe_workflow', (workflowId) => {
      socket.leave(`workflow:${workflowId}`);
      console.log(`⚙️ Socket ${socket.id} unsubscribed from workflow: ${workflowId}`);
    });

    // Handle execution subscriptions
    socket.on('subscribe_execution', (executionId) => {
      socket.join(`execution:${executionId}`);
      console.log(`📊 Socket ${socket.id} subscribed to execution: ${executionId}`);
    });

    // Handle workflow actions
    socket.on('workflow_action', (data) => {
      console.log(`⚙️ Workflow action from user ${userId}:`, data);
      
      if (data.workflowId) {
        socket.to(`workflow:${data.workflowId}`).emit('workflow_update', {
          action: data.action,
          workflowId: data.workflowId,
          userId,
          timestamp: new Date().toISOString(),
          data: data.payload
        });
      }
    });

    // Handle test workflow
    socket.on('test_workflow', (data) => {
      console.log(`🧪 Test workflow from user ${userId}:`, data);
      
      // Simulate test execution
      setTimeout(() => {
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
      }, 1500);
    });

    // Handle ping/pong for connection monitoring
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
      
      // Cleanup mappings
      const userId = socketUsers.get(socket.id);
      if (userId) {
        const userSocketSet = userSockets.get(userId);
        if (userSocketSet) {
          userSocketSet.delete(socket.id);
          if (userSocketSet.size === 0) {
            userSockets.delete(userId);
          }
        }
        socketUsers.delete(socket.id);
        console.log(`🗑️ Cleaned up mappings for socket ${socket.id} (user ${userId})`);
      }
    });
  });

  // Utility functions for broadcasting
  global.broadcastToUser = (userId, event, data) => {
    io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  };

  global.broadcastToWorkflow = (workflowId, event, data) => {
    io.to(`workflow:${workflowId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  };

  global.broadcastToExecution = (executionId, event, data) => {
    io.to(`execution:${executionId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  };

  global.getSocketStats = () => {
    return {
      totalSockets: socketUsers.size,
      totalUsers: userSockets.size,
      connectedUsers: Array.from(userSockets.keys()),
      timestamp: new Date().toISOString()
    };
  };

  // Start server
  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`🚀 Server ready on http://${hostname}:${port}`);
    console.log(`🔌 Socket.IO server initialized`);
    console.log(`📊 Dashboard: http://${hostname}:${port}`);
    console.log(`⚙️ Workflows: http://${hostname}:${port}/workflows`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🔄 SIGTERM received, shutting down gracefully');
    
    io.close(() => {
      console.log('🔌 Socket.IO server closed');
    });
    
    httpServer.close(() => {
      console.log('🛑 HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('🔄 SIGINT received, shutting down gracefully');
    
    io.close(() => {
      console.log('🔌 Socket.IO server closed');
    });
    
    httpServer.close(() => {
      console.log('🛑 HTTP server closed');
      process.exit(0);
    });
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;