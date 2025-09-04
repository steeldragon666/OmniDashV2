import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import rateLimit from 'express-rate-limit';
import winston from 'winston';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import brandRoutes from './routes/brand';
import socialRoutes from './routes/social';
import workflowRoutes from './routes/workflow';
import aiRoutes from './routes/ai';
import analyticsRoutes from './routes/analytics';
import assetsRoutes from './routes/assets';
import agentRoutes from './routes/agents';

// Import agent system
import { agentService } from './agents/services/AgentService';

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new SocketIO(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});

// Configure logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      return `${timestamp} [${level}]: ${stack || message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Global rate limiting
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.'
    });
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3001',
    'http://localhost:3000',
    'https://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply global rate limiting
app.use(globalRateLimit);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const agentStatus = agentService.getStatus();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    agents: agentStatus
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/agents', agentRoutes);

// WebSocket connections
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  // Join brand rooms
  socket.on('join-brand', (brandId: string) => {
    socket.join(`brand-${brandId}`);
    logger.info(`Socket ${socket.id} joined brand-${brandId}`);
  });

  // Leave brand rooms
  socket.on('leave-brand', (brandId: string) => {
    socket.leave(`brand-${brandId}`);
    logger.info(`Socket ${socket.id} left brand-${brandId}`);
  });

  // Handle workflow execution updates
  socket.on('workflow-status', (data: { workflowId: string; status: string }) => {
    socket.broadcast.emit('workflow-update', data);
  });

  // Handle real-time notifications
  socket.on('notification', (data: { brandId: string; message: string; type: string }) => {
    io.to(`brand-${data.brandId}`).emit('notification', {
      message: data.message,
      type: data.type,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      error: 'Internal server error'
    });
  } else {
    res.status(500).json({
      error: err.message,
      stack: err.stack
    });
  }
});

// Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found'
  });
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Shutdown agents first
    await agentService.shutdown();
    
    httpServer.close(() => {
      logger.info('HTTP server closed.');
      
      // Close database connections, cleanup, etc.
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Initialize and start agent system
const initializeAgents = async () => {
  try {
    await agentService.initialize();
    await agentService.startAll();
    logger.info('🤖 Agent system initialized and started');
  } catch (error) {
    logger.error('Failed to initialize agent system:', error);
    // Continue server startup even if agents fail to initialize
  }
};

// Start server
const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, async () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
  logger.info(`🤖 Agent API: http://localhost:${PORT}/api/agents`);
  
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`📖 API Documentation: http://localhost:${PORT}/api/docs`);
  }

  // Initialize agents after server starts
  await initializeAgents();
});

export { app, io };