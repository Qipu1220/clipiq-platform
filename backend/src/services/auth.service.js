/**
 * Authentication Service Layer
 * 
 * Contains all authentication business logic separated from HTTP concerns
 * This service can be reused across controllers, CLI tools, or other entry points
 */

import pool from '../config/database.js';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt.util.js';
import { verifyPassword } from '../utils/password.util.js';
import ApiError from '../utils/apiError.js';

// In-memory refresh token store
// TODO: Replace with Redis or database table in production
const refreshTokenStore = new Set();

/**
 * Authenticate user with login credentials
 * 
 * @param {string} login - Email or username
 * @param {string} password - User password
 * @returns {Promise<{user: object, tokens: object}>} User data and tokens
 * @throws {ApiError} If authentication fails
 */
export async function authenticateUser(login, password) {
  // Validate input
  if (!login || !password) {
    throw ApiError.badRequest(
      'Email/username and password are required',
      'MISSING_CREDENTIALS'
    );
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
    // Use same error message for security (don't reveal if user exists)
    throw ApiError.unauthorized(
      'Invalid email/username or password',
      'INVALID_CREDENTIALS'
    );
  }

  const user = result.rows[0];

  // Check if user is banned
  if (user.banned) {
    const isBanActive = !user.ban_expiry || new Date(user.ban_expiry) > new Date();

    if (isBanActive) {
      throw ApiError.forbidden(
        'Your account has been suspended',
        'ACCOUNT_BANNED',
        {
          banReason: user.ban_reason,
          banExpiry: user.ban_expiry,
          isPermanent: !user.ban_expiry
        }
      );
    }
  }

  // Verify password
  const isPasswordValid = await verifyPassword(password, user.password);

  if (!isPasswordValid) {
    throw ApiError.unauthorized(
      'Invalid email/username or password',
      'INVALID_CREDENTIALS'
    );
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

  // Update last login timestamp
  await pool.query(
    'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [user.id]
  );

  // Return user data (without password)
  const userData = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  };

  return { user: userData, tokens };
}

/**
 * Logout user by invalidating refresh token
 * 
 * @param {string} refreshToken - Refresh token to invalidate
 * @returns {Promise<boolean>} True if logout successful
 */
export async function logoutUser(refreshToken) {
  if (refreshToken && refreshTokenStore.has(refreshToken)) {
    refreshTokenStore.delete(refreshToken);
    return true;
  }

  // Even if token not found, logout is successful
  return true;
}

/**
 * Refresh access token using refresh token
 * 
 * @param {string} refreshToken - Valid refresh token
 * @returns {Promise<{accessToken: string, expiresIn: string, tokenType: string}>} New access token
 * @throws {ApiError} If refresh fails
 */
export async function refreshAccessToken(refreshToken) {
  // Validate input
  if (!refreshToken) {
    throw ApiError.badRequest(
      'Refresh token is required',
      'MISSING_REFRESH_TOKEN'
    );
  }

  // Check if refresh token exists in store
  if (!refreshTokenStore.has(refreshToken)) {
    throw ApiError.forbidden(
      'The provided refresh token is invalid or has been revoked',
      'REFRESH_TOKEN_INVALID'
    );
  }

  // Verify refresh token signature and expiry
  let decoded;
  try {
    decoded = await verifyRefreshToken(refreshToken);
  } catch (error) {
    // Remove invalid token from store
    refreshTokenStore.delete(refreshToken);

    if (error.code === 'REFRESH_TOKEN_EXPIRED') {
      throw ApiError.unauthorized(
        'Your refresh token has expired. Please login again.',
        'REFRESH_TOKEN_EXPIRED',
        { expiredAt: error.expiredAt }
      );
    }

    throw ApiError.forbidden(
      'The provided refresh token is invalid',
      'REFRESH_TOKEN_INVALID'
    );
  }

  // Get user from database
  const result = await pool.query(
    'SELECT id, username, email, role, banned FROM users WHERE id = $1',
    [decoded.userId]
  );

  if (result.rows.length === 0) {
    // User not found - remove invalid refresh token
    refreshTokenStore.delete(refreshToken);
    throw ApiError.notFound(
      'The user associated with this token no longer exists',
      'USER_NOT_FOUND'
    );
  }

  const user = result.rows[0];

  // Check if user is banned
  if (user.banned) {
    refreshTokenStore.delete(refreshToken);
    throw ApiError.forbidden(
      'Your account has been suspended',
      'ACCOUNT_BANNED'
    );
  }

  // Generate new access token only (refresh token stays the same)
  const { accessToken, expiresIn, tokenType } = generateTokenPair(user);

  return { accessToken, expiresIn, tokenType };
}

/**
 * Get user profile by ID
 * 
 * @param {string} userId - User ID
 * @returns {Promise<object>} User profile data
 * @throws {ApiError} If user not found
 */
export async function getUserProfile(userId) {
  const result = await pool.query(
    `SELECT id, username, email, role, display_name, bio, avatar_url, 
            banned, ban_expiry, ban_reason, warnings, created_at, updated_at
     FROM users 
     WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound(
      'User not found',
      'USER_NOT_FOUND'
    );
  }

  const user = result.rows[0];

  // Format response
  return {
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
  };
}

/**
 * Update user profile
 * 
 * @param {string} userId - User ID
 * @param {object} updates - Fields to update (displayName, bio, avatarUrl)
 * @returns {Promise<object>} Updated user profile
 */
export async function updateUserProfile(userId, updates) {
  const { displayName, bio, avatarUrl } = updates;

  // Build dynamic query
  const fields = [];
  const values = [userId];
  let paramCount = 2; // $1 is userId

  if (displayName !== undefined) {
    fields.push(`display_name = $${paramCount++}`);
    values.push(displayName);
  }

  if (bio !== undefined) {
    fields.push(`bio = $${paramCount++}`);
    values.push(bio);
  }

  if (avatarUrl !== undefined) {
    fields.push(`avatar_url = $${paramCount++}`);
    values.push(avatarUrl);
  }

  // If no fields to update
  if (fields.length === 0) {
    return getUserProfile(userId);
  }

  // Add updated_at
  fields.push(`updated_at = CURRENT_TIMESTAMP`);

  const query = `
     UPDATE users 
     SET ${fields.join(', ')} 
     WHERE id = $1
     RETURNING id, username, email, role, display_name, bio, avatar_url, 
               banned, ban_expiry, ban_reason, warnings, created_at, updated_at
   `;

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    throw ApiError.notFound(
      'User not found',
      'USER_NOT_FOUND'
    );
  }

  const user = result.rows[0];

  // Format response
  return {
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
  };
}

/**
 * Check if refresh token is valid and stored
 * 
 * @param {string} refreshToken - Refresh token to check
 * @returns {boolean} True if token is valid
 */
export function isRefreshTokenValid(refreshToken) {
  return refreshTokenStore.has(refreshToken);
}

/**
 * Remove all refresh tokens for cleanup (for testing or admin operations)
 * 
 * @returns {number} Number of tokens removed
 */
export function clearAllRefreshTokens() {
  const count = refreshTokenStore.size;
  refreshTokenStore.clear();
  return count;
}

export default {
  authenticateUser,
  logoutUser,
  refreshAccessToken,
  getUserProfile,
  updateUserProfile,
  isRefreshTokenValid,
  isRefreshTokenValid,
  clearAllRefreshTokens
};
