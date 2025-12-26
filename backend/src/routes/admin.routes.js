/**
 * Admin Routes
 * Routes for admin dashboard and admin operations
 * Base path: /api/v1/admin
 * nhan
 */

import express from 'express';
import { 
  getDashboardSummary, 
  getAllUsersController, 
  getStaffMembersController,
  promoteStaffController,
  demoteStaffController,
  deleteStaffAccountController,
  banUserController,
  unbanUserController,
  deleteUserController,
  getSystemLogsController,
  getAnalyticsController,
  toggleMaintenanceModeController,
  toggleServiceMaintenanceModeController,
  getGeneralSettingsController,
  updateGeneralSettingsController
} from '../controllers/admin.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * GET /api/v1/admin/dashboard/summary
 * Get dashboard summary (Admin only)
 * 
 * Query params:
 * - includeTopVideos (true/false, default: true)
 * - includeReports (true/false, default: true)
 * - includeAppeals (true/false, default: true)
 * - includeSystemLogs (true/false, default: true)
 */
router.get('/dashboard/summary',
  authenticateToken,
  authorize('admin'),
  getDashboardSummary
);

/**
 * GET /api/v1/admin/users
 * Get all users (Admin and Staff)
 */
router.get('/users',
  authenticateToken,
  authorize('admin', 'staff'),
  getAllUsersController
);

/**
 * POST /api/v1/admin/users/:username/ban
 * Ban user account (Admin only)
 */
router.post('/users/:username/ban',
  authenticateToken,
  authorize('admin'),
  banUserController
);

/**
 * POST /api/v1/admin/users/:username/unban
 * Unban user account (Admin only)
 */
router.post('/users/:username/unban',
  authenticateToken,
  authorize('admin'),
  unbanUserController
);

/**
 * DELETE /api/v1/admin/users/:username
 * Delete user account permanently (Admin only)
 */
router.delete('/users/:username',
  authenticateToken,
  authorize('admin'),
  deleteUserController
);

/**
 * GET /api/v1/admin/staff
 * Get all staff members with optional filter (Admin only)
 * Query params: isDemoted (true/false)
 */
router.get('/staff',
  authenticateToken,
  authorize('admin'),
  getStaffMembersController
);

/**
 * POST /api/v1/admin/staff/:username/promote
 * Promote user to staff or reactivate demoted staff (Admin only)
 */
router.post('/staff/:username/promote',
  authenticateToken,
  authorize('admin'),
  promoteStaffController
);

/**
 * PUT /api/v1/admin/staff/:username/demote
 * Demote staff (set is_demoted flag) (Admin only)
 */
router.put('/staff/:username/demote',
  authenticateToken,
  authorize('admin'),
  demoteStaffController
);

/**
 * DELETE /api/v1/admin/staff/:username
 * Delete staff account permanently (only if is_demoted = true) (Admin only)
 */
router.delete('/staff/:username',
  authenticateToken,
  authorize('admin'),
  deleteStaffAccountController
);

/**
 * GET /api/v1/admin/system-logs
 * Get system logs with pagination (Admin only)
 * Query params: page, limit, actionType
 */
router.get('/system-logs',
  authenticateToken,
  authorize('admin'),
  getSystemLogsController
);

/**
 * GET /api/v1/admin/analytics
 * Get analytics statistics (Admin only)
 * Returns comprehensive analytics with month-over-month comparison
 */
router.get('/analytics',
  authenticateToken,
  authorize('admin'),
  getAnalyticsController
);

/**
 * PUT /api/v1/admin/settings/maintenance-mode
 * Toggle system maintenance mode (Admin only)
 * Only admins can access when enabled
 */
router.put('/settings/maintenance-mode',
  authenticateToken,
  authorize('admin'),
  toggleMaintenanceModeController
);

/**
 * PUT /api/v1/admin/settings/service-maintenance-mode
 * Toggle service maintenance mode (Admin only)
 * Admin and staff can access when enabled, regular users cannot
 */
router.put('/settings/service-maintenance-mode',
  authenticateToken,
  authorize('admin'),
  toggleServiceMaintenanceModeController
);

/**
 * GET /api/v1/admin/settings/general
 * Get general settings (Admin only)
 */
router.get('/settings/general',
  authenticateToken,
  authorize('admin'),
  getGeneralSettingsController
);

/**
 * PUT /api/v1/admin/settings/general
 * Update general settings (Admin only)
 */
router.put('/settings/general',
  authenticateToken,
  authorize('admin'),
  updateGeneralSettingsController
);

export default router;
