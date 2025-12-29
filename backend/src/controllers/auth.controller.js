/**
 * Authentication Controller
 * 
 * Thin HTTP layer that handles requests/responses
 * Delegates business logic to auth.service.js
 * 
 * Following SOLID principles and separation of concerns
 */

import * as authService from '../services/auth.service.js';
import ApiError from '../utils/apiError.js';
import { SystemSettings } from '../models/SystemSettings.js';
import * as minioService from '../services/minio.service.js';

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
export async function login(req, res, next) {
  try {
    const { login, password } = req.body;

    // Delegate to service layer
    const { user, tokens } = await authService.authenticateUser(login, password);

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        tokens
      }
    });

  } catch (error) {
    // Pass error to error handling middleware
    next(error);
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
export async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;

    // Delegate to service layer
    await authService.logoutUser(refreshToken);

    return res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    next(error);
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
export async function refreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body;

    // Delegate to service layer
    const tokens = await authService.refreshAccessToken(refreshToken);

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokens
    });

  } catch (error) {
    next(error);
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
export async function getMe(req, res, next) {
  try {
    const userId = req.user.userId;

    // Delegate to service layer
    const user = await authService.getUserProfile(userId);

    return res.status(200).json({
      success: true,
      data: { user }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Update Current User Profile
 * 
 * Updates profile fields (displayName, bio, avatarUrl)
 * Requires authentication.
 * 
 * PATCH /api/v1/auth/me
 * 
 * Request Body (partial):
 * {
 *   "displayName": "New Name",
 *   "bio": "New Bio",
 *   "avatarUrl": "http://..."
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Profile updated successfully",
 *   "data": {
 *     "user": { ...updated_user_profile... }
 *   }
 * }
 */
export async function updateProfile(req, res, next) {
  try {
    const userId = req.user.userId;
    const { displayName, bio } = req.body;

    // Delegate to service layer
    const user = await authService.updateUserProfile(userId, {
      displayName,
      bio
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Upload Avatar Controller
 * 
 * Upload and update user's avatar (accepts base64 image)
 * Uploads to MinIO and stores the URL in database
 * 
 * PATCH /api/v1/auth/avatar
 * 
 * Request Body:
 * {
 *   "avatar": "data:image/png;base64,..."
 * }
 */
export async function uploadAvatar(req, res, next) {
  try {
    const userId = req.user.userId;
    const { avatar } = req.body;

    if (!avatar) {
      throw ApiError.badRequest('Avatar data is required', 'AVATAR_REQUIRED');
    }

    // Upload avatar to MinIO
    const { url } = await minioService.uploadAvatar(avatar, userId);

    // Update user's avatar URL in database
    const user = await authService.updateUserProfile(userId, {
      avatarUrl: url
    });

    return res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      data: { user }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Get system status including maintenance mode
 * Public endpoint - no authentication required
 * 
 * GET /api/v1/auth/status
 */
export async function getSystemStatus(req, res, next) {
  try {
    const maintenanceMode = await SystemSettings.getMaintenanceMode();
    const serviceMaintenanceMode = await SystemSettings.getServiceMaintenanceMode();
    
    return res.status(200).json({
      success: true,
      data: {
        maintenanceMode,
        serviceMaintenanceMode
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Google Sign-In Controller
 * 
 * Authenticates user with Google ID token.
 * Creates new user if doesn't exist, or logs in existing user.
 * 
 * POST /api/v1/auth/google
 * 
 * Request Body:
 * {
 *   "idToken": "firebase_id_token",
 *   "email": "user@gmail.com",
 *   "displayName": "User Name",
 *   "photoURL": "https://..."
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Google login successful",
 *   "data": {
 *     "user": { id, username, email, role },
 *     "tokens": { accessToken, refreshToken, expiresIn, tokenType }
 *   }
 * }
 */
export async function googleLogin(req, res, next) {
  try {
    const { idToken, email, displayName, photoURL } = req.body;

    // Note: In production, you should verify the idToken with Firebase Admin SDK
    // For now, we trust the client-side Firebase authentication
    // TODO: Add Firebase Admin SDK verification for production

    // Delegate to service layer
    const { user, tokens } = await authService.authenticateWithGoogle({
      email,
      displayName,
      photoURL
    });

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Google login successful',
      data: {
        user,
        tokens
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Register Controller
 * 
 * Registers a new user with email/password (from Firebase).
 * 
 * POST /api/v1/auth/register
 * 
 * Request Body:
 * {
 *   "idToken": "firebase_id_token",
 *   "username": "username",
 *   "email": "user@example.com",
 *   "displayName": "Display Name"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Registration successful",
 *   "data": {
 *     "user": { id, username, email, role }
 *   }
 * }
 */
export async function register(req, res, next) {
  try {
    const { idToken, username, email, displayName } = req.body;

    // Delegate to service layer
    const user = await authService.registerUser({
      username,
      email,
      displayName
    });

    // Return success response
    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user }
    });

  } catch (error) {
    next(error);
  }
}

export default {
  login,
  logout,
  refreshToken,
  getMe,
  updateProfile,
  uploadAvatar,
  getSystemStatus,
  googleLogin,
  register
};
