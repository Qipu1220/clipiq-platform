/**
 * Custom API Error Class
 * 
 * Extends Error to provide consistent error structure across the application
 * Supports HTTP status codes and error codes for better error handling
 */

class ApiError extends Error {
  /**
   * Create an API Error
   * 
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {string} code - Application-specific error code
   * @param {boolean} isOperational - Whether this is an operational error (true) or programming error (false)
   * @param {object} details - Additional error details
   */
  constructor(
    statusCode,
    message,
    code = 'INTERNAL_ERROR',
    isOperational = true,
    details = null
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  // Static factory methods for common errors
  static badRequest(message, code = 'BAD_REQUEST', details = null) {
    return new ApiError(400, message, code, true, details);
  }

  static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED', details = null) {
    return new ApiError(401, message, code, true, details);
  }

  static forbidden(message = 'Forbidden', code = 'FORBIDDEN', details = null) {
    return new ApiError(403, message, code, true, details);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND', details = null) {
    return new ApiError(404, message, code, true, details);
  }

  static conflict(message = 'Conflict', code = 'CONFLICT', details = null) {
    return new ApiError(409, message, code, true, details);
  }

  static unprocessableEntity(message, code = 'VALIDATION_ERROR', details = null) {
    return new ApiError(422, message, code, true, details);
  }

  static internal(message = 'Internal server error', code = 'INTERNAL_ERROR', details = null) {
    return new ApiError(500, message, code, false, details);
  }

  static tooManyRequests(message = 'Too many requests', code = 'RATE_LIMIT_EXCEEDED', details = null) {
    return new ApiError(429, message, code, true, details);
  }
}

export default ApiError;
