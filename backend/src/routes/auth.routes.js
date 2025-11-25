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
import { login, logout, refreshToken, getMe } from '../controllers/auth.controller.js';
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

export default router;
