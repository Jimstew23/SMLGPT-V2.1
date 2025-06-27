// backend/src/server.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { rateLimit } from 'express-rate-limit';

// Load environment variables
dotenv.config();

// Import routes
import chatRoutes from './routes/chat';
import uploadRoutes from './routes/upload';
import statusRoutes from './routes/status';
import speechRoutes from './routes/speech';
import documentRoutes from './routes/document';

// Import services
import { initializeApplicationInsights } from './services/monitoring';
import { initializeRedis } from './services/redis';
import { initializeJobQueue } from './services/jobQueue';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';

// Initialize Application Insights
initializeApplicationInsights();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use('/api', limiter);

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/speech', speechRoutes);
app.use('/api/documents', documentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    logger.info(`Socket ${socket.id} joined session ${sessionId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    logger.info('Starting SMLGPT V2.0 Backend Server...');
    
    // Skip optional services that may cause startup failures
    logger.info('Skipping Redis and Job Queue initialization for now');
    
    // Optional services (comment out problematic ones)
    /*
    try {
      await initializeRedis();
      logger.info('Redis initialized successfully');
    } catch (error) {
      logger.warn('Redis initialization failed, continuing without Redis:', error);
    }

    try {
      await initializeJobQueue();
      logger.info('Job Queue initialized successfully');
    } catch (error) {
      logger.warn('Job Queue initialization failed, continuing without Job Queue:', error);
    }
    */
    
    // Start the HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`🚀 SMLGPT V2.0 Backend running on port ${PORT}`);
      logger.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🌐 Frontend URL: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
      logger.info(`✅ Core API endpoints available`);
      logger.info(`📋 Health check: http://localhost:${PORT}/health`);
    });
    
    // Log available routes
    logger.info('Available API endpoints:');
    logger.info('  - GET  /health');
    logger.info('  - POST /api/chat');
    logger.info('  - POST /api/upload');
    logger.info('  - GET  /api/status');
    logger.info('  - POST /api/speech');
    logger.info('  - GET  /api/documents');
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
});

export { app, io };