/**
 * Authentication Middleware
 * 
 * Provides middleware functions for protecting routes and verifying JWTs.
 */

import { verifyAccessToken, extractToken } from '../utils/jwt.util.js';

/**
 * Authenticate JWT Token Middleware
 * 
 * Verifies the JWT token from the Authorization header.
 * Attaches the decoded user information to req.user if valid.
 * 
 * Usage:
 *   app.get('/protected', authenticateToken, (req, res) => {
 *     res.json({ user: req.user });
 *   });
 */
export async function authenticateToken(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const token = extractToken(authHeader);

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'NO_TOKEN',
        message: 'Please provide a valid access token in the Authorization header'
      });
    }

    // Verify token
    const decoded = await verifyAccessToken(token);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp
    };

    next();
  } catch (error) {
    // Handle different error types
    if (error.code === 'TOKEN_EXPIRED') {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
        message: 'Your session has expired. Please login again.',
        expiredAt: error.expiredAt
      });
    }

    if (error.code === 'TOKEN_INVALID' || error.code === 'TOKEN_VERIFICATION_FAILED') {
      return res.status(403).json({
        error: 'Invalid token',
        code: error.code,
        message: 'The provided token is invalid or malformed'
      });
    }

    if (error.code === 'TOKEN_NOT_ACTIVE') {
      return res.status(401).json({
        error: 'Token not yet valid',
        code: 'TOKEN_NOT_ACTIVE',
        message: 'This token is not yet valid',
        date: error.date
      });
    }

    // Generic error
    return res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_FAILED',
      message: 'Unable to authenticate request'
    });
  }
}

/**
 * Optional Authentication Middleware
 * 
 * Similar to authenticateToken but doesn't fail if no token is provided.
 * Useful for routes that work differently for authenticated vs anonymous users.
 * 
 * Usage:
 *   app.get('/posts', optionalAuth, (req, res) => {
 *     if (req.user) {
 *       // Show personalized content
 *     } else {
 *       // Show public content
 *     }
 *   });
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const token = extractToken(authHeader);

    if (!token) {
      // No token provided, continue without authentication
      req.user = null;
      return next();
    }

    // Try to verify token
    const decoded = await verifyAccessToken(token);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username,
      role: decoded.role
    };

    next();
  } catch (error) {
    // Token invalid but continue without authentication
    req.user = null;
    next();
  }
}

/**
 * Role-Based Authorization Middleware
 * 
 * Checks if the authenticated user has one of the required roles.
 * Must be used after authenticateToken middleware.
 * 
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} - Middleware function
 * 
 * Usage:
 *   app.delete('/users/:id', authenticateToken, authorize('admin'), (req, res) => {
 *     // Only admins can delete users
 *   });
 * 
 *   app.get('/dashboard', authenticateToken, authorize('admin', 'staff'), (req, res) => {
 *     // Both admins and staff can access
 *   });
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
        message: 'You must be logged in to access this resource'
      });
    }

    // Check if user has required role
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
        userRole: req.user.role,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
}

/**
 * Check If User Is Self or Admin
 * 
 * Allows access if the user is accessing their own resource or is an admin.
 * Useful for profile updates, etc.
 * 
 * @param {string} userIdParam - Name of the URL parameter containing the user ID (default: 'userId')
 * @returns {Function} - Middleware function
 * 
 * Usage:
 *   app.put('/users/:userId/profile', authenticateToken, checkSelfOrAdmin(), (req, res) => {
 *     // User can update their own profile, or admin can update any profile
 *   });
 */
export function checkSelfOrAdmin(userIdParam = 'userId') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const targetUserId = req.params[userIdParam];
    const isSelf = req.user.userId === targetUserId;
    const isAdmin = req.user.role === 'admin';

    if (!isSelf && !isAdmin) {
      return res.status(403).json({
        error: 'Access denied',
        code: 'FORBIDDEN',
        message: 'You can only access your own resources'
      });
    }

    next();
  };
}

/**
 * Check If User Is Not Banned
 * 
 * Verifies that the authenticated user is not banned from the platform.
 * Queries the database to check the user's current ban status.
 * Staff and admin users bypass this check.
 * 
 * Usage:
 *   app.post('/videos', authenticateToken, checkNotBanned, (req, res) => {
 *     // Only non-banned users can upload videos
 *   });
 */
export async function checkNotBanned(req, res, next) {
  try {
    // Skip ban check for staff and admin
    if (req.user && (req.user.role === 'staff' || req.user.role === 'admin')) {
      return next();
    }

    // Import pool dynamically to avoid circular dependencies
    const { default: pool } = await import('../config/database.js');
    
    // Query database for current ban status
    const query = `
      SELECT banned, ban_expiry, ban_reason
      FROM users
      WHERE id = $1
      LIMIT 1
    `;
    
    const result = await pool.query(query, [req.user.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        message: 'The authenticated user no longer exists'
      });
    }
    
    const user = result.rows[0];
    
    // Check if user is banned
    if (user.banned) {
      const isBanActive = !user.ban_expiry || new Date(user.ban_expiry) > new Date();
      
      if (isBanActive) {
        return res.status(403).json({
          error: 'Account suspended',
          code: 'ACCOUNT_BANNED',
          message: 'Your account has been suspended and you cannot use this platform',
          data: {
            banReason: user.ban_reason,
            banExpiry: user.ban_expiry,
            isPermanent: !user.ban_expiry
          }
        });
      }
      
      // Ban has expired, auto-unban user
      await pool.query(
        'UPDATE users SET banned = false, ban_expiry = NULL, ban_reason = NULL WHERE id = $1',
        [req.user.userId]
      );
    }
    
    next();
  } catch (error) {
    console.error('Error checking ban status:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: 'Unable to verify account status'
    });
  }
}

/**
 * Rate Limiting Middleware (Simple Implementation)
 * 
 * Basic rate limiting based on IP address.
 * For production, use a proper rate limiting library like express-rate-limit.
 * 
 * @param {number} maxRequests - Maximum number of requests
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} - Middleware function
 */
const rateLimitStore = new Map();

export function rateLimit(maxRequests = 100, windowMs = 60000) {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const record = rateLimitStore.get(key);

    if (now > record.resetTime) {
      // Reset the counter
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'You have exceeded the rate limit. Please try again later.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }

    record.count++;
    next();
  };
}

export default {
  authenticateToken,
  optionalAuth,
  authorize,
  checkSelfOrAdmin,
  checkNotBanned,
  rateLimit
};
