/**
 * Global Error Handling Middleware
 * 
 * Centralized error handler that catches all errors
 * Formats ApiError instances consistently
 * Logs errors and sends appropriate responses
 */

import ApiError from '../utils/apiError.js';

/**
 * Error handler middleware
 * Must have 4 parameters to be recognized as error middleware
 */
export function errorHandler(err, req, res, next) {
  // Log error details
  console.error('Error caught by error handler:');
  console.error('Message:', err.message);
  console.error('Stack:', err.stack);

  // Handle ApiError instances
  if (err instanceof ApiError) {
    const response = {
      success: false,
      error: err.message,
      code: err.code
    };

    // Add details if available
    if (err.details) {
      response.details = err.details;
    }

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
      response.stack = err.stack;
    }

    return res.status(err.statusCode).json(response);
  }

  // Handle validation errors from express-validator or other sources
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.details || err.message
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: 'INVALID_TOKEN',
      message: err.message
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
      code: 'TOKEN_EXPIRED',
      message: 'Your session has expired. Please login again.',
      expiredAt: err.expiredAt
    });
  }

  // Handle database errors
  if (err.code && err.code.startsWith('23')) { // PostgreSQL constraint violations
    if (err.code === '23505') { // Unique violation
      return res.status(409).json({
        success: false,
        error: 'Duplicate entry',
        code: 'DUPLICATE_ENTRY',
        message: 'A record with this value already exists',
        ...(process.env.NODE_ENV === 'development' && { detail: err.detail })
      });
    }

    if (err.code === '23503') { // Foreign key violation
      return res.status(400).json({
        success: false,
        error: 'Invalid reference',
        code: 'FOREIGN_KEY_VIOLATION',
        message: 'Referenced record does not exist',
        ...(process.env.NODE_ENV === 'development' && { detail: err.detail })
      });
    }

    if (err.code === '23502') { // Not null violation
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        code: 'NOT_NULL_VIOLATION',
        message: 'A required field is missing',
        ...(process.env.NODE_ENV === 'development' && { detail: err.detail })
      });
    }
  }

  // Handle multer (file upload) errors
  if (err.name === 'MulterError') {
    let message = 'File upload error';
    let code = 'FILE_UPLOAD_ERROR';

    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size exceeds maximum allowed size';
      code = 'FILE_TOO_LARGE';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files uploaded';
      code = 'TOO_MANY_FILES';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field';
      code = 'UNEXPECTED_FILE';
    }

    return res.status(400).json({
      success: false,
      error: message,
      code: code
    });
  }

  // Handle syntax errors (malformed JSON, etc.)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON',
      code: 'INVALID_JSON',
      message: 'Request body contains invalid JSON'
    });
  }

  // Default to 500 Internal Server Error
  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    error: err.isOperational ? err.message : 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    message: err.isOperational ? err.message : 'An unexpected error occurred'
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.originalError = err.message;
  }

  return res.status(statusCode).json(response);
}

/**
 * 404 Not Found handler
 * Should be placed after all routes
 */
export function notFoundHandler(req, res, next) {
  const error = ApiError.notFound(
    `Route ${req.method} ${req.originalUrl} not found`,
    'ROUTE_NOT_FOUND'
  );
  next(error);
}

/**
 * Async handler wrapper to catch promise rejections
 * Eliminates need for try-catch in async route handlers
 * 
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
