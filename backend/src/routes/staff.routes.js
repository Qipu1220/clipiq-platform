/**
 * Staff Routes
 * Routes for staff user management operations
 */

import express from 'express';
import * as staffController from '../controllers/staff.controller.js';
import * as staffValidator from '../validators/staff.validator.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';

const router = express.Router();

// All staff routes require authentication and staff role
router.use(authenticateToken);
router.use(requireRole(['staff']));

/**
 * GET /staff/users
 * Get all users with optional filters
 */
router.get(
  '/users',
  staffValidator.getUsersValidator,
  validate,
  staffController.getAllUsers
);

/**
 * PUT /staff/users/:username/ban
 * Ban a user (temporary or permanent)
 */
router.put(
  '/users/:username/ban',
  staffValidator.banUserValidator,
  validate,
  staffController.banUser
);

/**
 * PUT /staff/users/:username/unban
 * Unban a user
 */
router.put(
  '/users/:username/unban',
  staffValidator.unbanUserValidator,
  validate,
  staffController.unbanUser
);

/**
 * PUT /staff/users/:username/warn
 * Warn a user
 */
router.put(
  '/users/:username/warn',
  staffValidator.warnUserValidator,
  validate,
  staffController.warnUser
);

/**
 * PUT /staff/users/:username/clear-warnings
 * Clear warnings for a user
 */
router.put(
  '/users/:username/clear-warnings',
  staffValidator.clearWarningsValidator,
  validate,
  staffController.clearWarnings
);

/**
 * GET /staff/video-report/:videoId
 * Get detailed video report information for review
 */
router.get(
  '/video-report/:videoId',
  staffController.getVideoReportDetails
);

export default router;
