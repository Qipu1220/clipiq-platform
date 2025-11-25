/**
 * JWT Utilities
 * 
 * Provides functions for generating and verifying JSON Web Tokens (JWT).
 * Supports both access tokens (short-lived) and refresh tokens (long-lived).
 */

import jwt from 'jsonwebtoken';

// Token configuration from environment variables
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'clipiq-super-secret-jwt-key-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'clipiq-refresh-token-secret';
const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRE || '7d'; // 7 days for development, use '15m' in production
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRE || '30d';
const TOKEN_ISSUER = 'clipiq-platform';
const TOKEN_AUDIENCE = 'clipiq-api';

/**
 * Generate Access Token
 * 
 * @param {Object} user - User object containing id, email, role
 * @returns {string} - JWT access token
 */
export function generateAccessToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    type: 'access'
  };

  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE
  });
}

/**
 * Generate Refresh Token
 * 
 * @param {Object} user - User object containing id
 * @returns {string} - JWT refresh token
 */
export function generateRefreshToken(user) {
  const payload = {
    userId: user.id,
    type: 'refresh'
  };

  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: TOKEN_ISSUER
  });
}

/**
 * Generate Token Pair (Access + Refresh)
 * 
 * @param {Object} user - User object
 * @returns {Object} - { accessToken, refreshToken, expiresIn, tokenType }
 */
export function generateTokenPair(user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY,
    tokenType: 'Bearer'
  };
}

/**
 * Verify Access Token
 * 
 * @param {string} token - JWT access token to verify
 * @returns {Promise<Object>} - Decoded token payload
 * @throws {Error} - If token is invalid or expired
 */
export function verifyAccessToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, ACCESS_TOKEN_SECRET, {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE
    }, (err, decoded) => {
      if (err) {
        if (err instanceof jwt.TokenExpiredError) {
          return reject({
            name: 'TokenExpiredError',
            message: 'Access token expired',
            expiredAt: err.expiredAt,
            code: 'TOKEN_EXPIRED'
          });
        }

        if (err instanceof jwt.NotBeforeError) {
          return reject({
            name: 'NotBeforeError',
            message: 'Token not yet valid',
            date: err.date,
            code: 'TOKEN_NOT_ACTIVE'
          });
        }

        if (err instanceof jwt.JsonWebTokenError) {
          return reject({
            name: 'JsonWebTokenError',
            message: 'Invalid access token',
            code: 'TOKEN_INVALID'
          });
        }

        return reject({
          name: 'VerificationError',
          message: 'Token verification failed',
          code: 'TOKEN_VERIFICATION_FAILED'
        });
      }

      resolve(decoded);
    });
  });
}

/**
 * Verify Refresh Token
 * 
 * @param {string} token - JWT refresh token to verify
 * @returns {Promise<Object>} - Decoded token payload
 * @throws {Error} - If token is invalid or expired
 */
export function verifyRefreshToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, REFRESH_TOKEN_SECRET, {
      issuer: TOKEN_ISSUER
    }, (err, decoded) => {
      if (err) {
        if (err instanceof jwt.TokenExpiredError) {
          return reject({
            name: 'TokenExpiredError',
            message: 'Refresh token expired',
            expiredAt: err.expiredAt,
            code: 'REFRESH_TOKEN_EXPIRED'
          });
        }

        return reject({
          name: 'JsonWebTokenError',
          message: 'Invalid refresh token',
          code: 'REFRESH_TOKEN_INVALID'
        });
      }

      resolve(decoded);
    });
  });
}

/**
 * Decode Token Without Verification (for inspection only)
 * 
 * @param {string} token - JWT token to decode
 * @returns {Object|null} - Decoded token payload or null if invalid
 */
export function decodeToken(token) {
  try {
    return jwt.decode(token, { complete: false });
  } catch (error) {
    return null;
  }
}

/**
 * Extract Token from Authorization Header
 * 
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} - Extracted token or null
 */
export function extractToken(authHeader) {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Check if Token is Expired (without verification)
 * 
 * @param {string} token - JWT token to check
 * @returns {boolean} - True if expired, false otherwise
 */
export function isTokenExpired(token) {
  const decoded = decodeToken(token);
  
  if (!decoded || !decoded.exp) {
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
}

export default {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  extractToken,
  isTokenExpired
};
