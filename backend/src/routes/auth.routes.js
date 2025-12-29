/**
 * Authentication Routes
 * 
 * Defines routes for authentication operations:
 * - POST /auth/login - User login
 * - POST /auth/logout - User logout
 * - POST /auth/refresh - Refresh access token
 * - GET /auth/me - Get current user profile
 */

import express from 'express';
import { login, logout, refreshToken, getMe, updateProfile, uploadAvatar, getSystemStatus, googleLogin, register } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

/**
 * Validation middleware for express-validator
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }

  next();
};

/**
 * POST /api/v1/auth/login
 * 
 * Login with email/username and password
 * 
 * Request Body:
 * {
 *   "login": "user@example.com" or "username",
 *   "password": "password123"
 * }
 */
router.post('/login',
  [
    body('login')
      .trim()
      .notEmpty().withMessage('Email or username is required')
      .isLength({ min: 3, max: 255 }).withMessage('Login must be between 3 and 255 characters'),

    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters')
  ],
  validate,
  login
);

/**
 * POST /api/v1/auth/logout
 * 
 * Logout and invalidate refresh token
 * 
 * Request Body:
 * {
 *   "refreshToken": "token_here"
 * }
 */
router.post('/logout',
  [
    body('refreshToken')
      .optional()
      .isString().withMessage('Refresh token must be a string')
  ],
  validate,
  logout
);

/**
 * POST /api/v1/auth/refresh
 * 
 * Refresh access token using refresh token
 * 
 * Request Body:
 * {
 *   "refreshToken": "token_here"
 * }
 */
router.post('/refresh',
  [
    body('refreshToken')
      .notEmpty().withMessage('Refresh token is required')
      .isString().withMessage('Refresh token must be a string')
  ],
  validate,
  refreshToken
);

/**
 * GET /api/v1/auth/me
 * 
 * Get current authenticated user's profile
 * Requires authentication (JWT token)
 * 
 * Headers:
 * Authorization: Bearer <access_token>
 */
router.get('/me',
  authenticateToken,
  getMe
);

/**
 * PATCH /api/v1/auth/me
 * 
 * Update current authenticated user's profile
 * Requires authentication (JWT token)
 * 
 * Body: { displayName?, bio? }
 * Note: Avatar upload should use separate upload endpoint
 */
router.patch('/me',
  authenticateToken,
  [
    body('displayName').optional().trim().isLength({ max: 50 }).withMessage('Display name too long'),
    body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio too long')
  ],
  validate,
  updateProfile
);

/**
 * PATCH /api/v1/auth/avatar
 * 
 * Upload and update user avatar
 * Requires authentication (JWT token)
 * 
 * Body: { avatar: 'data:image/...' }
 */
router.patch('/avatar',
  authenticateToken,
  [
    body('avatar')
      .notEmpty().withMessage('Avatar is required')
      .custom((value) => {
        const isBase64DataUri = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/.test(value);
        if (!isBase64DataUri) {
          throw new Error('Avatar must be a base64 image');
        }
        return true;
      })
  ],
  validate,
  uploadAvatar
);

/**
 * GET /api/v1/auth/status
 * 
 * Get system status including maintenance mode
 * Public endpoint - no authentication required
 */
router.get('/status', getSystemStatus);

/**
 * POST /api/v1/auth/google
 * 
 * Login with Google (Firebase)
 * Creates new user if doesn't exist
 * 
 * Request Body:
 * {
 *   "idToken": "firebase_id_token",
 *   "email": "user@gmail.com",
 *   "displayName": "User Name",
 *   "photoURL": "https://..."
 * }
 */
router.post('/google',
  [
    body('idToken')
      .notEmpty().withMessage('ID token is required')
      .isString().withMessage('ID token must be a string'),

    body('email')
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format'),

    body('displayName')
      .optional()
      .isString().withMessage('Display name must be a string')
      .isLength({ max: 100 }).withMessage('Display name too long'),

    body('photoURL')
      .optional()
      .isString().withMessage('Photo URL must be a string')
  ],
  validate,
  googleLogin
);

/**
 * POST /api/v1/auth/register
 * 
 * Register new user with Firebase Email/Password
 * 
 * Request Body:
 * {
 *   "idToken": "firebase_id_token",
 *   "username": "username",
 *   "email": "user@example.com",
 *   "displayName": "Display Name"
 * }
 */
router.post('/register',
  [
    body('idToken')
      .notEmpty().withMessage('ID token is required')
      .isString().withMessage('ID token must be a string'),

    body('username')
      .notEmpty().withMessage('Username is required')
      .isString().withMessage('Username must be a string')
      .isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),

    body('email')
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format'),

    body('displayName')
      .optional()
      .isString().withMessage('Display name must be a string')
      .isLength({ max: 100 }).withMessage('Display name too long')
  ],
  validate,
  register
);

export default router;
