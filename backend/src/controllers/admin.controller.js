/**
 * Admin Controller
 * Handles admin dashboard and admin operations
 * nhan
 */

import { 
  getDashboardStats, 
  getTopVideos, 
  getPendingReports, 
  getPendingAppeals,
  getSystemLogsForDashboard 
} from '../services/admin.service.js';
import ApiError from '../utils/apiError.js';
import { getAllUsers, getStaffMembers, promoteToStaff, demoteStaff, deleteStaffAccount, banUser, unbanUser, deleteUser, toggleMaintenanceMode, toggleServiceMaintenanceMode, getGeneralSettings, updateGeneralSettings, getSystemLogsPaginated, createStaffAccount } from '../services/admin.service.js';
import { getAnalyticsStats } from '../services/analytics.service.js';
import { asyncHandler } from '../middlewares/error.middleware.js';

/**
 * GET /api/v1/admin/dashboard/summary
 * Get dashboard summary for admin
 * 
 * Query params:
 * - includeTopVideos (true/false, default: true)
 * - includeReports (true/false, default: true)
 * - includeAppeals (true/false, default: true)
 * - includeSystemLogs (true/false, default: true)
 */
export async function getDashboardSummary(req, res, next) {
  try {
    const { 
      includeTopVideos = 'true', 
      includeReports = 'true', 
      includeAppeals = 'true',
      includeSystemLogs = 'true'
    } = req.query;
    
    // Get main stats
    const stats = await getDashboardStats();
    
    // Get additional data based on query params
    const promises = [];
    
    if (includeTopVideos === 'true') {
      promises.push(getTopVideos(5).then(data => ({ topVideos: data })).catch(() => ({ topVideos: [] })));
    } else {
      promises.push(Promise.resolve({ topVideos: [] }));
    }
    
    if (includeReports === 'true') {
      promises.push(getPendingReports(5).then(data => ({ reports: data })).catch(() => ({ reports: { userReports: [], videoReports: [] } })));
    } else {
      promises.push(Promise.resolve({ reports: { userReports: [], videoReports: [] } }));
    }
    
    if (includeAppeals === 'true') {
      promises.push(getPendingAppeals(5).then(data => ({ appeals: data })).catch(() => ({ appeals: [] })));
    } else {
      promises.push(Promise.resolve({ appeals: [] }));
    }
    
    if (includeSystemLogs === 'true') {
      promises.push(getSystemLogsForDashboard(4).then(data => ({ systemLogs: data })).catch(() => ({ systemLogs: [] })));
    } else {
      promises.push(Promise.resolve({ systemLogs: [] }));
    }
    
    // Execute all promises in parallel
    const [topVideosResult, reportsResult, appealsResult, systemLogsResult] = await Promise.all(promises);
    
    return res.status(200).json({
      success: true,
      data: {
        stats,
        ...topVideosResult,
        ...reportsResult,
        ...appealsResult,
        ...systemLogsResult
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/admin/users
 * Get all users (Admin only)
 */
export const getAllUsersController = asyncHandler(async (req, res) => {
  const {
    page = '1',
    limit = '50',
    role = null,
    banned = null,
    search = null
  } = req.query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));

  const options = {
    page: pageNum,
    limit: limitNum,
    role: role || null,
    banned: banned === 'true' ? true : banned === 'false' ? false : null,
    search: search || null
  };

  const result = await getAllUsers(options);

  console.log('📊 getAllUsers result:', {
    userCount: result.users.length,
    total: result.total,
    firstUser: result.users[0] ? result.users[0].username : 'none'
  });

  return res.status(200).json({
    success: true,
    data: {
      users: result.users,
      total: result.total
    }
  });
});

/**
 * GET /api/v1/admin/staff
 * Get all staff members with optional filter (Admin only)
 */
export const getStaffMembersController = asyncHandler(async (req, res) => {
  const { isDemoted } = req.query;
  
  let filterOptions = {};
  if (isDemoted !== undefined) {
    filterOptions.isDemoted = isDemoted === 'true';
  }
  
  const staffMembers = await getStaffMembers(filterOptions);
  
  return res.status(200).json({
    success: true,
    data: {
      staff: staffMembers
    }
  });
});

/**
 * POST /api/v1/admin/staff/:username/promote
 * Promote user to staff or reactivate demoted staff (Admin only)
 */
export const promoteStaffController = asyncHandler(async (req, res) => {
  const { username } = req.params;
  
  if (!username) {
    return res.status(400).json({
      success: false,
      error: 'Username is required'
    });
  }
  
  const performedById = req.user?.userId;
  if (!performedById) {
    return res.status(401).json({
      success: false,
      error: 'User not authenticated'
    });
  }
  
  const user = await promoteToStaff(username, performedById);
  
  return res.status(200).json({
    success: true,
    data: {
      user
    }
  });
});

/**
 * POST /api/v1/admin/staff/create
 * Create new staff account (Admin only)
 */
export const createStaffController = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password are required'
    });
  }
  
  const performedById = req.user?.userId;
  if (!performedById) {
    return res.status(401).json({
      success: false,
      error: 'User not authenticated'
    });
  }
  
  const user = await createStaffAccount({
    username,
    password
  }, performedById);
  
  return res.status(201).json({
    success: true,
    message: 'Staff account created successfully',
    data: {
      user
    }
  });
});

/**
 * PUT /api/v1/admin/staff/:username/demote
 * Demote staff (set is_demoted flag) (Admin only)
 */
export const demoteStaffController = asyncHandler(async (req, res) => {
  const { username } = req.params;
  
  if (!username) {
    return res.status(400).json({
      success: false,
      error: 'Username is required'
    });
  }
  
  const performedById = req.user?.userId;
  if (!performedById) {
    return res.status(401).json({
      success: false,
      error: 'User not authenticated'
    });
  }
  
  const user = await demoteStaff(username, performedById);
  
  return res.status(200).json({
    success: true,
    data: {
      user
    }
  });
});

/**
 * DELETE /api/v1/admin/staff/:username
 * Delete staff account permanently (only if is_demoted = true) (Admin only)
 */
export const deleteStaffAccountController = asyncHandler(async (req, res) => {
  const { username } = req.params;
  
  if (!username) {
    return res.status(400).json({
      success: false,
      error: 'Username is required'
    });
  }
  
  const performedById = req.user?.userId;
  if (!performedById) {
    return res.status(401).json({
      success: false,
      error: 'User not authenticated'
    });
  }
  
  await deleteStaffAccount(username, performedById);
  
  return res.status(200).json({
    success: true,
    message: 'Staff account deleted successfully'
  });
});

/**
 * POST /api/v1/admin/users/:username/ban
 * Ban user account (Admin only)
 */
export const banUserController = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const { reason, durationDays } = req.body;
  
  if (!username) {
    return res.status(400).json({
      success: false,
      error: 'Username is required'
    });
  }
  
  if (!reason || reason.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Ban reason is required'
    });
  }
  
  const performedById = req.user?.userId;
  if (!performedById) {
    return res.status(401).json({
      success: false,
      error: 'User not authenticated'
    });
  }
  
  const user = await banUser(username, reason, durationDays || null, performedById);
  
  return res.status(200).json({
    success: true,
    data: {
      user
    }
  });
});

/**
 * POST /api/v1/admin/users/:username/unban
 * Unban user account (Admin only)
 */
export const unbanUserController = asyncHandler(async (req, res) => {
  const { username } = req.params;
  
  if (!username) {
    return res.status(400).json({
      success: false,
      error: 'Username is required'
    });
  }
  
  const performedById = req.user?.userId;
  if (!performedById) {
    return res.status(401).json({
      success: false,
      error: 'User not authenticated'
    });
  }
  
  const user = await unbanUser(username, performedById);
  
  return res.status(200).json({
    success: true,
    data: {
      user
    }
  });
});

/**
 * DELETE /api/v1/admin/users/:username
 * Delete user account permanently (Admin only)
 */
export const deleteUserController = asyncHandler(async (req, res) => {
  const { username } = req.params;
  
  if (!username) {
    return res.status(400).json({
      success: false,
      error: 'Username is required'
    });
  }
  
  const performedById = req.user?.userId;
  if (!performedById) {
    return res.status(401).json({
      success: false,
      error: 'User not authenticated'
    });
  }
  
  await deleteUser(username, performedById);
  
  return res.status(200).json({
    success: true,
    message: 'User account deleted successfully'
  });
});

/**
 * GET /api/v1/admin/system-logs
 * Get system logs with pagination (Admin only)
 * Query params: page, limit, actionType
 */
export const getSystemLogsController = asyncHandler(async (req, res) => {
  const {
    page = '1',
    limit = '50',
    actionType = null
  } = req.query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
  const offset = (pageNum - 1) * limitNum;

  const result = await getSystemLogsPaginated({
    limit: limitNum,
    offset,
    actionType: actionType || null
  });

  return res.status(200).json({
    success: true,
    data: {
      logs: result.logs,
      pagination: {
        total: result.total,
        page: pageNum,
        pages: Math.ceil(result.total / limitNum),
        limit: limitNum
      }
    }
  });
});

/**
 * GET /api/v1/admin/analytics
 * Get analytics statistics (Admin only)
 * Returns comprehensive analytics with month-over-month comparison
 */
export const getAnalyticsController = asyncHandler(async (req, res) => {
  const stats = await getAnalyticsStats();
  
  return res.status(200).json({
    success: true,
    data: stats
  });
});

/**
 * PUT /api/v1/admin/settings/maintenance-mode
 * Toggle system maintenance mode (Admin only)
 * Only admins can access when enabled
 */
export const toggleMaintenanceModeController = asyncHandler(async (req, res) => {
  const { enabled } = req.body;
  
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({
      success: false,
      error: 'enabled must be a boolean value'
    });
  }
  
  const performedById = req.user?.userId;
  if (!performedById) {
    return res.status(401).json({
      success: false,
      error: 'User not authenticated'
    });
  }
  
  const newStatus = await toggleMaintenanceMode(enabled, performedById);
  
  return res.status(200).json({
    success: true,
    data: {
      maintenanceMode: newStatus
    }
  });
});

/**
 * PUT /api/v1/admin/settings/service-maintenance-mode
 * Toggle service maintenance mode (Admin only)
 * Admin and staff can access when enabled, regular users cannot
 */
export const toggleServiceMaintenanceModeController = asyncHandler(async (req, res) => {
  const { enabled } = req.body;
  
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({
      success: false,
      error: 'enabled must be a boolean value'
    });
  }
  
  const performedById = req.user?.userId;
  if (!performedById) {
    return res.status(401).json({
      success: false,
      error: 'User not authenticated'
    });
  }
  
  const newStatus = await toggleServiceMaintenanceMode(enabled, performedById);
  
  return res.status(200).json({
    success: true,
    data: {
      serviceMaintenanceMode: newStatus
    }
  });
});

/**
 * GET /api/v1/admin/settings/general
 * Get general settings (Admin only)
 */
export const getGeneralSettingsController = asyncHandler(async (req, res) => {
  const settings = await getGeneralSettings();
  
  return res.status(200).json({
    success: true,
    data: settings
  });
});

/**
 * PUT /api/v1/admin/settings/general
 * Update general settings (Admin only)
 */
export const updateGeneralSettingsController = asyncHandler(async (req, res) => {
  const { siteName, maxUploadSizeMB, maxVideoDurationSeconds } = req.body;
  
  if (!siteName || !maxUploadSizeMB || !maxVideoDurationSeconds) {
    return res.status(400).json({
      success: false,
      error: 'All fields are required: siteName, maxUploadSizeMB, maxVideoDurationSeconds'
    });
  }
  
  const performedById = req.user?.userId;
  if (!performedById) {
    return res.status(401).json({
      success: false,
      error: 'User not authenticated'
    });
  }
  
  const updatedSettings = await updateGeneralSettings({
    siteName,
    maxUploadSizeMB: parseInt(maxUploadSizeMB),
    maxVideoDurationSeconds: parseInt(maxVideoDurationSeconds)
  }, performedById);
  
  return res.status(200).json({
    success: true,
    data: updatedSettings
  });
});
