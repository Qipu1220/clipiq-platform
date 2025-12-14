/**
 * Admin Routes
 * Routes for admin and staff user management operations
 */

import express from 'express';
import * as adminController from '../controllers/admin.controller.js';
import * as adminValidator from '../validators/admin.validator.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';

const router = express.Router();

// All admin routes require authentication and staff role only
router.use(authenticateToken);
router.use(requireRole(['staff']));

/**
 * GET /admin/users
 * Get all users with optional filters
 */
router.get(
  '/users',
  adminValidator.getUsersValidator,
  validate,
  adminController.getAllUsers
);

/**
 * PUT /admin/users/:username/ban
 * Ban a user (temporary or permanent)
 */
router.put(
  '/users/:username/ban',
  adminValidator.banUserValidator,
  validate,
  adminController.banUser
);

/**
 * PUT /admin/users/:username/unban
 * Unban a user
 */
router.put(
  '/users/:username/unban',
  adminValidator.unbanUserValidator,
  validate,
  adminController.unbanUser
);

/**
 * PUT /admin/users/:username/warn
 * Warn a user
 */
router.put(
  '/users/:username/warn',
  adminValidator.warnUserValidator,
  validate,
  adminController.warnUser
);

/**
 * PUT /admin/users/:username/clear-warnings
 * Clear warnings for a user
 */
router.put(
  '/users/:username/clear-warnings',
  adminValidator.clearWarningsValidator,
  validate,
  adminController.clearWarnings
);

export default router;
