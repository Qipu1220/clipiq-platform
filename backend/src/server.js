/**
 * ClipIQ Platform - Backend Server
 * 
 * Main Express server with authentication and API routes
 * Following best practices with proper error handling and middleware
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

// Import routes
import authRoutes from './routes/auth.routes.js';
import videoRoutes from './routes/video.routes.js';
import userRoutes from './routes/user.routes.js';
import searchRoutes from './routes/search.routes.js';
import impressionRoutes from './routes/impression.routes.js';
import feedRoutes from './routes/feed.routes.js';
import explorerRoutes from './routes/explorer.routes.js';

// Import middleware
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';

// Import maintenance scheduler
import setupMaintenanceJobs from './scripts/maintenance.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ===========================================
// Middleware Configuration
// ===========================================

// CORS - Allow frontend to access API
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ===========================================
// API Routes
// ===========================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ClipIQ Backend is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API v1 routes
app.use('/api/v1/auth', authRoutes); 
app.use('/api/v1/videos', videoRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/events', impressionRoutes); // Changed from /impressions to avoid ad blockers
app.use('/api/v1/feed', feedRoutes);
app.use('/api/v1/explorer', explorerRoutes);

// ===========================================
// Error Handling
// ===========================================

// 404 handler - Must be after all routes
app.use(notFoundHandler);

// Global error handler - Must be last
app.use(errorHandler);

// ===========================================
// Server Startup
// ===========================================

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🚀 ClipIQ Backend Server');
  console.log('='.repeat(50));
  console.log(`📡 Server running on port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api/v1`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log('='.repeat(50));
  console.log('📚 Available Routes:');
  console.log('   POST   /api/v1/auth/login      - User login');
  console.log('   POST   /api/v1/auth/logout     - User logout');
  console.log('   POST   /api/v1/auth/refresh    - Refresh token');
  console.log('   GET    /api/v1/auth/me         - Get current user');
  console.log('='.repeat(50));
  
  // Setup automated maintenance tasks
  setupMaintenanceJobs();
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT received, shutting down gracefully...');
  process.exit(0);
});

export default app;
