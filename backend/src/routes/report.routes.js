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
  resolveVideoReportValidator
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

export default router;
