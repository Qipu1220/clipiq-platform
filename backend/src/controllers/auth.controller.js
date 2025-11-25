/**
 * Authentication Controller
 * 
 * Handles authentication-related operations: login, logout, refresh token, etc.
 */

import pg from 'pg';
import { generateTokenPair } from '../utils/jwt.util.js';
import { verifyPassword } from '../utils/password.util.js';
import { verifyRefreshToken } from '../utils/jwt.util.js';

const { Pool } = pg;

// Create PostgreSQL pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'clipiq',
});

// In-memory refresh token store (use Redis or database in production)
const refreshTokenStore = new Set();

/**
 * Login Controller
 * 
 * Authenticates user with email/username and password.
 * Returns access token and refresh token on success.
 * 
 * POST /api/v1/auth/login
 * 
 * Request Body:
 * {
 *   "login": "user@example.com" or "username",
 *   "password": "password123"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Login successful",
 *   "data": {
 *     "user": { id, username, email, role },
 *     "tokens": { accessToken, refreshToken, expiresIn, tokenType }
 *   }
 * }
 */
export async function login(req, res) {
  try {
    const { login, password } = req.body;

    // Validate input
    if (!login || !password) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'MISSING_CREDENTIALS',
        message: 'Email/username and password are required'
      });
    }

    // Find user by email or username
    const query = `
      SELECT id, username, email, password, role, banned, ban_expiry, ban_reason
      FROM users
      WHERE email = $1 OR username = $1
      LIMIT 1
    `;
    
    const result = await pool.query(query, [login]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email/username or password'
      });
    }

    const user = result.rows[0];

    // Check if user is banned
    if (user.banned) {
      const isBanActive = !user.ban_expiry || new Date(user.ban_expiry) > new Date();
      
      if (isBanActive) {
        return res.status(403).json({
          success: false,
          error: 'Account suspended',
          code: 'ACCOUNT_BANNED',
          message: 'Your account has been suspended',
          banReason: user.ban_reason,
          banExpiry: user.ban_expiry,
          isPermanent: !user.ban_expiry
        });
      }
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email/username or password'
      });
    }

    // Generate tokens
    const userPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    const tokens = generateTokenPair(userPayload);

    // Store refresh token
    refreshTokenStore.add(tokens.refreshToken);

    // Update last login timestamp (optional)
    await pool.query('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        tokens: tokens
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      message: 'An error occurred during login'
    });
  }
}

/**
 * Logout Controller
 * 
 * Invalidates the refresh token.
 * 
 * POST /api/v1/auth/logout
 * 
 * Request Body:
 * {
 *   "refreshToken": "token_here"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Logout successful"
 * }
 */
export async function logout(req, res) {
  try {
    const { refreshToken } = req.body;

    if (refreshToken && refreshTokenStore.has(refreshToken)) {
      refreshTokenStore.delete(refreshToken);
    }

    return res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      message: 'An error occurred during logout'
    });
  }
}

/**
 * Refresh Token Controller
 * 
 * Generates a new access token using a valid refresh token.
 * 
 * POST /api/v1/auth/refresh
 * 
 * Request Body:
 * {
 *   "refreshToken": "token_here"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Token refreshed successfully",
 *   "data": {
 *     "accessToken": "new_token",
 *     "expiresIn": "15m",
 *     "tokenType": "Bearer"
 *   }
 * }
 */
export async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.body;

    // Validate input
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'MISSING_REFRESH_TOKEN',
        message: 'Refresh token is required'
      });
    }

    // Check if refresh token exists in store
    if (!refreshTokenStore.has(refreshToken)) {
      return res.status(403).json({
        success: false,
        error: 'Invalid refresh token',
        code: 'REFRESH_TOKEN_INVALID',
        message: 'The provided refresh token is invalid or has been revoked'
      });
    }

    // Verify refresh token
    const decoded = await verifyRefreshToken(refreshToken);

    // Get user from database
    const result = await pool.query(
      'SELECT id, username, email, role, banned FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      // User not found - remove invalid refresh token
      refreshTokenStore.delete(refreshToken);
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        message: 'The user associated with this token no longer exists'
      });
    }

    const user = result.rows[0];

    // Check if user is banned
    if (user.banned) {
      refreshTokenStore.delete(refreshToken);
      return res.status(403).json({
        success: false,
        error: 'Account suspended',
        code: 'ACCOUNT_BANNED',
        message: 'Your account has been suspended'
      });
    }

    // Generate new access token
    const { accessToken, expiresIn, tokenType } = generateTokenPair(user);

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
        expiresIn,
        tokenType
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);

    // Handle specific errors
    if (error.code === 'REFRESH_TOKEN_EXPIRED') {
      const { refreshToken } = req.body;
      if (refreshToken) {
        refreshTokenStore.delete(refreshToken);
      }

      return res.status(401).json({
        success: false,
        error: 'Refresh token expired',
        code: 'REFRESH_TOKEN_EXPIRED',
        message: 'Your refresh token has expired. Please login again.',
        expiredAt: error.expiredAt
      });
    }

    if (error.code === 'REFRESH_TOKEN_INVALID') {
      return res.status(403).json({
        success: false,
        error: 'Invalid refresh token',
        code: 'REFRESH_TOKEN_INVALID',
        message: 'The provided refresh token is invalid'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      message: 'An error occurred while refreshing token'
    });
  }
}

/**
 * Get Current User Profile
 * 
 * Returns the profile of the currently authenticated user.
 * Requires authentication.
 * 
 * GET /api/v1/auth/me
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "user": { id, username, email, role, display_name, bio, avatar_url, ... }
 *   }
 * }
 */
export async function getMe(req, res) {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT id, username, email, role, display_name, bio, avatar_url, 
              banned, ban_expiry, ban_reason, warnings, created_at, updated_at
       FROM users 
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        message: 'Your user account could not be found'
      });
    }

    const user = result.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          displayName: user.display_name,
          bio: user.bio,
          avatarUrl: user.avatar_url,
          banned: user.banned,
          warnings: user.warnings,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      }
    });

  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      message: 'An error occurred while fetching user profile'
    });
  }
}

export default {
  login,
  logout,
  refreshToken,
  getMe
};
