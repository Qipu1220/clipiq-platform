/**
 * ClipIQ Platform - Backend Server
 * 
 * Main Express server with authentication and API routes
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

// Import routes
import authRoutes from './routes/auth.routes.js';

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

// 404 handler - Must be after all routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    code: 'ROUTE_NOT_FOUND',
    message: `Cannot ${req.method} ${req.path}`,
    availableRoutes: {
      auth: [
        'POST /api/v1/auth/login',
        'POST /api/v1/auth/logout',
        'POST /api/v1/auth/refresh',
        'GET /api/v1/auth/me'
      ]
    }
  });
});

// ===========================================
// Global Error Handler
// ===========================================

app.use((err, req, res, next) => {
  console.error('❌ Error:', err);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      message: err.message,
      details: err.errors
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid Token',
      code: 'TOKEN_INVALID',
      message: 'The provided token is invalid'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token Expired',
      code: 'TOKEN_EXPIRED',
      message: 'Your token has expired',
      expiredAt: err.expiredAt
    });
  }

  // Default error response
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.name || 'Internal Server Error',
    code: err.code || 'SERVER_ERROR',
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

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
