/**
 * Report Routes
 * 
 * Defines routes for report operations:
 * - POST /reports/videos - Report a video (User)
 * - GET /reports/videos - Get all video reports (Staff/Admin)
 * - GET /reports/videos/:id - Get video report by ID (Staff/Admin)
 * - PUT /reports/videos/:id/resolve - Resolve a video report (Staff/Admin)
 */

import express from 'express';
import * as ReportController from '../controllers/report.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import {
  reportVideoValidator,
  getVideoReportsValidator,
  getReportByIdValidator,
  resolveVideoReportValidator,
  reportUserValidator,
  getUserReportsValidator,
  resolveUserReportValidator
} from '../validators/report.validator.js';

const router = express.Router();

/**
 * POST /api/v1/reports/videos
 * 
 * Report a video
 * Requires authentication
 * 
 * Request Body:
 * {
 *   "videoId": "uuid",
 *   "reason": "spam|harassment|hate|violence|nudity|copyright|misleading|other",
 *   "description": "Optional description"
 * }
 */
router.post(
  '/videos',
  authenticateToken,
  reportVideoValidator,
  validate,
  ReportController.reportVideo
);

/**
 * GET /api/v1/reports/videos
 * 
 * Get all video reports (Staff/Admin only)
 * Requires authentication and staff/admin role
 * 
 * Query Params:
 * - status: pending|reviewed|resolved
 * - page: 1
 * - limit: 20
 */
router.get(
  '/videos',
  authenticateToken,
  requireRole(['admin', 'staff']),
  getVideoReportsValidator,
  validate,
  ReportController.getVideoReports
);

/**
 * GET /api/v1/reports/videos/:id
 * 
 * Get video report by ID (Staff/Admin only)
 * Requires authentication and staff/admin role
 */
router.get(
  '/videos/:id',
  authenticateToken,
  requireRole(['admin', 'staff']),
  getReportByIdValidator,
  validate,
  ReportController.getVideoReportById
);

/**
 * PUT /api/v1/reports/videos/:id/resolve
 * 
 * Resolve a video report (Staff/Admin only)
 * Requires authentication and staff/admin role
 * 
 * Request Body:
 * {
 *   "action": "dismiss|warn_user|ban_user|delete_content",
 *   "note": "Optional note"
 * }
 */
router.put(
  '/videos/:id/resolve',
  authenticateToken,
  requireRole(['admin', 'staff']),
  resolveVideoReportValidator,
  validate,
  ReportController.resolveVideoReport
);

/**
 * POST /api/v1/reports/users
 * 
 * Report a user
 * Requires authentication
 * 
 * Request Body:
 * {
 *   "username": "string",
 *   "reason": "spam|harassment|hate|violence|nudity|impersonation|fake_account|other",
 *   "description": "Optional description"
 * }
 */
router.post(
  '/users',
  authenticateToken,
  reportUserValidator,
  validate,
  ReportController.reportUser
);

/**
 * GET /api/v1/reports/users
 * 
 * Get all user reports (Staff/Admin only)
 * Requires authentication and staff/admin role
 * 
 * Query Params:
 * - status: pending|reviewed|resolved
 * - page: 1
 * - limit: 20
 */
router.get(
  '/users',
  authenticateToken,
  requireRole(['admin', 'staff']),
  getUserReportsValidator,
  validate,
  ReportController.getUserReports
);

/**
 * GET /api/v1/reports/users/:id
 * 
 * Get user report by ID (Staff/Admin only)
 * Requires authentication and staff/admin role
 */
router.get(
  '/users/:id',
  authenticateToken,
  requireRole(['admin', 'staff']),
  getReportByIdValidator,
  validate,
  ReportController.getUserReportById
);

/**
 * PUT /api/v1/reports/users/:id/resolve
 * 
 * Resolve a user report (Staff/Admin only)
 * Requires authentication and staff/admin role
 * 
 * Request Body:
 * {
 *   "action": "dismiss|warn_user|ban_user|delete_content",
 *   "note": "Optional note"
 * }
 */
router.put(
  '/users/:id/resolve',
  authenticateToken,
  requireRole(['admin', 'staff']),
  resolveUserReportValidator,
  validate,
  ReportController.resolveUserReport
);

export default router;
