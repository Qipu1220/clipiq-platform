/**
 * Admin Service
 * Business logic for admin dashboard and admin operations
 * Nhan
 */

import * as UserModel from '../models/User.js';
import * as VideoModel from '../models/Video.js';
import * as ViewHistoryModel from '../models/ViewHistory.js';
import * as UserReportModel from '../models/UserReport.js';
import * as VideoReportModel from '../models/VideoReport.js';
import * as AppealModel from '../models/Appeal.js';
import { SystemSettings } from '../models/SystemSettings.js';
import { SystemLog } from '../models/SystemLog.js';
import pool from '../config/database.js';
import ApiError from '../utils/apiError.js';
import * as Minio from 'minio';

/**
 * Get MinIO client
 */
function getMinioClient() {
  return new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
  });
}

/**
 * Calculate storage usage from MinIO buckets
 * Returns storage statistics for all buckets
 */
async function calculateStorageUsage() {
  try {
    const minioClient = getMinioClient();
    const buckets = ['clipiq-videos', 'clipiq-thumbnails', 'clipiq-avatars'];

    let totalSizeBytes = 0;

    for (const bucketName of buckets) {
      try {
        const objectsStream = minioClient.listObjects(bucketName, '', true);

        for await (const obj of objectsStream) {
          if (obj.size) {
            totalSizeBytes += obj.size;
          }
        }
      } catch (error) {
        // Bucket might not exist or be empty, continue
        console.warn(`Failed to calculate size for bucket ${bucketName}:`, error.message);
      }
    }

    // Convert to GB
    const usedGB = (totalSizeBytes / (1024 * 1024 * 1024)).toFixed(1);
    // Max storage from system_settings or default 100GB
    const maxGB = 100; // TODO: Get from system_settings table if needed

    return {
      used: parseFloat(usedGB),
      max: maxGB,
      usedFormatted: `${usedGB} GB`,
      maxFormatted: `${maxGB} GB`,
      percentage: ((usedGB / maxGB) * 100).toFixed(1)
    };
  } catch (error) {
    console.error('Failed to calculate storage usage:', error);
    // Return default values if MinIO is unavailable
    return {
      used: 0,
      max: 100,
      usedFormatted: '0 GB',
      maxFormatted: '100 GB',
      percentage: '0'
    };
  }
}

/**
 * Get system logs from database
 * Now uses centralized system_logs table instead of aggregation
 */
async function getSystemLogs(limit = 10) {
  try {
    // Get logs from centralized system_logs table
    const logs = await SystemLog.getRecentLogs(limit);
    return logs;
  } catch (error) {
    throw new ApiError(500, 'Failed to fetch system logs', error.message);
  }
}

/**
 * Get dashboard summary statistics
 * Returns: users stats, videos stats, reports stats, appeals stats, system status
 * Now uses Models instead of direct SQL queries
 */
export async function getDashboardStats() {
  try {
    // Get basic statistics using direct queries since models may not have all methods
    const userStatsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE role = 'user') as total,
        COUNT(*) FILTER (WHERE role = 'staff') as staff,
        COUNT(*) FILTER (WHERE role = 'admin') as admins,
        COUNT(*) FILTER (WHERE role = 'user' AND banned = true) as banned
      FROM users
    `;

    const videoStatsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day') as uploaded_today,
        COALESCE(SUM(views), 0) as total_views
      FROM videos WHERE status = 'active'
    `;

    const views24hQuery = `
      SELECT COUNT(*) as count
      FROM view_history 
      WHERE created_at >= NOW() - INTERVAL '1 day'
    `;

    const userReportsQuery = `SELECT COUNT(*) as count FROM user_reports WHERE status = 'pending'`;
    const videoReportsQuery = `SELECT COUNT(*) as count FROM video_reports WHERE status = 'pending'`;
    const appealsQuery = `SELECT COUNT(*) as count FROM appeals WHERE status = 'pending'`;

    const [
      userStatsResult,
      videoStatsResult,
      views24hResult,
      userReportsResult,
      videoReportsResult,
      appealsResult
    ] = await Promise.all([
      pool.query(userStatsQuery),
      pool.query(videoStatsQuery),
      pool.query(views24hQuery),
      pool.query(userReportsQuery),
      pool.query(videoReportsQuery),
      pool.query(appealsQuery)
    ]);

    const userStats = {
      total: parseInt(userStatsResult.rows[0].total) || 0,
      staff: parseInt(userStatsResult.rows[0].staff) || 0,
      admins: parseInt(userStatsResult.rows[0].admins) || 0,
      banned: parseInt(userStatsResult.rows[0].banned) || 0
    };

    const videoStats = {
      total: parseInt(videoStatsResult.rows[0].total) || 0,
      uploadedToday: parseInt(videoStatsResult.rows[0].uploaded_today) || 0,
      totalViews: parseInt(videoStatsResult.rows[0].total_views) || 0
    };

    const views24h = parseInt(views24hResult.rows[0].count) || 0;
    const userReportsCount = parseInt(userReportsResult.rows[0].count) || 0;
    const videoReportsCount = parseInt(videoReportsResult.rows[0].count) || 0;
    const appealsCount = parseInt(appealsResult.rows[0].count) || 0;

    // Get maintenance modes from system_settings or default to false
    let maintenanceMode = false;
    let serviceMaintenanceMode = false;
    try {
      const settingsQuery = `SELECT key, value FROM system_settings WHERE key IN ('maintenance_mode', 'service_maintenance_mode')`;
      const settingsResult = await pool.query(settingsQuery);
      settingsResult.rows.forEach(row => {
        if (row.key === 'maintenance_mode') {
          maintenanceMode = row.value === 'true' || row.value === true;
        } else if (row.key === 'service_maintenance_mode') {
          serviceMaintenanceMode = row.value === 'true' || row.value === true;
        }
      });
    } catch (error) {
      console.warn('Failed to fetch maintenance modes, using defaults:', error.message);
    }

    // Calculate storage usage (async, don't block if it fails)
    let storageUsage;
    try {
      storageUsage = await calculateStorageUsage();
    } catch (error) {
      console.warn('Storage calculation failed, using defaults:', error.message);
      storageUsage = {
        used: 0,
        max: 100,
        usedFormatted: '0 GB',
        maxFormatted: '100 GB',
        percentage: '0'
      };
    }

    return {
      users: userStats,
      videos: {
        ...videoStats,
        views24h
      },
      reports: {
        pending: userReportsCount + videoReportsCount
      },
      appeals: {
        pending: appealsCount
      },
      system: {
        maintenanceMode,
        serviceMaintenanceMode,
        storage: storageUsage,
        uptime: '99.9%' // TODO: Calculate from server start time or system_settings
      }
    };
  } catch (error) {
    console.error('❌ Error in getDashboardStats:', error);
    console.error('Error stack:', error.stack);
    throw new ApiError(500, 'Failed to fetch dashboard statistics', error.message);
  }
}

/**
 * Get top videos by views
 * Now uses Video Model
 */
export async function getTopVideos(limit = 5) {
  try {
    return await VideoModel.getTopByViews(limit);
  } catch (error) {
    throw new ApiError(500, 'Failed to fetch top videos', error.message);
  }
}

/**
 * Get pending reports (latest)
 * Now uses UserReport and VideoReport Models
 */
export async function getPendingReports(limit = 5) {
  try {
    const [userReports, videoReports] = await Promise.all([
      UserReportModel.getPending(limit),
      VideoReportModel.getPending(limit)
    ]);

    return {
      userReports,
      videoReports
    };
  } catch (error) {
    throw new ApiError(500, 'Failed to fetch pending reports', error.message);
  }
}

/**
 * Get pending appeals (latest)
 * Now uses Appeal Model
 */
export async function getPendingAppeals(limit = 5) {
  try {
    return await AppealModel.getPending(limit);
  } catch (error) {
    throw new ApiError(500, 'Failed to fetch pending appeals', error.message);
  }
}

/**
 * Get system logs for dashboard
 */
export async function getSystemLogsForDashboard(limit = 4) {
  return await getSystemLogs(limit);
}

/**
 * Get system logs with pagination and filtering
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of logs to return (default: 50)
 * @param {number} options.offset - Number of logs to skip (default: 0)
 * @param {string} options.actionType - Filter by action type (optional)
 * @returns {Promise<Object>} Object with logs and total count
 */
export async function getSystemLogsPaginated(options = {}) {
  try {
    const {
      limit = 50,
      offset = 0,
      actionType = null
    } = options;

    console.log('🔍 Fetching system logs with options:', { limit, offset, actionType });

    const [logs, total] = await Promise.all([
      SystemLog.getLogs({ limit, offset, actionType }),
      SystemLog.getTotalCount({ actionType })
    ]);

    console.log(`✅ Fetched ${logs.length} logs, total: ${total}`);

    // Transform logs to match frontend format
    const transformedLogs = logs.map(log => ({
      id: log.id,
      action: log.actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      user: log.performedBy.username || 'system',
      details: log.details || '',
      timestamp: log.createdAt
    }));

    return {
      logs: transformedLogs,
      total,
      limit,
      offset
    };
  } catch (error) {
    console.error('❌ Error in getSystemLogsPaginated:', error);
    console.error('Error stack:', error.stack);
    throw new ApiError(500, 'Failed to fetch system logs', error.message);
  }
}

/**
 * Get all users with pagination and filtering
 */
export async function getAllUsers(options = {}) {
  try {
    const {
      page = 1,
      limit = 50,
      role = null,
      banned = null,
      search = null
    } = options;

    console.log('📋 getAllUsers service called with options:', { page, limit, role, banned, search });

    // UserModel.getAllUsers already returns { users, total }
    const result = await UserModel.getAllUsers({
      page,
      limit,
      role,
      banned,
      search
    });

    console.log('📋 UserModel.getAllUsers returned:', {
      userCount: result.users?.length || 0,
      total: result.total,
      firstUser: result.users?.[0]?.username || 'none'
    });

    return result;
  } catch (error) {
    console.error('❌ Error in getAllUsers service:', error);
    throw new ApiError(500, 'Failed to fetch users', error.message);
  }
}

/**
 * Get all staff members with optional filter
 * @param {Object} options - Filter options
 * @param {boolean} options.isDemoted - Filter by is_demoted status (null = all)
 * @returns {Promise<Array>} Array of staff members
 */
export async function getStaffMembers(options = {}) {
  try {
    // Use getAllUsers with role filter
    const result = await UserModel.getAllUsers({
      role: 'staff',
      page: 1,
      limit: 100,
      ...options
    });
    return result.users;
  } catch (error) {
    throw new ApiError(500, 'Failed to fetch staff members', error.message);
  }
}

/**
 * Promote user to staff (or reactivate demoted staff)
 * @param {string} username - Username to promote
 * @param {string} performedById - UUID of admin performing the action
 * @returns {Promise<Object>} Updated user object
 */
export async function promoteToStaff(username, performedById) {
  try {
    const user = await UserModel.promoteToStaff(username);

    // Log the action
    try {
      await SystemLog.createLog({
        actionType: 'staff_promoted',
        performedById,
        targetUserId: UserModel.id,
        details: `Promoted ${username} to staff`,
        metadata: {
          targetUsername: username,
          newRole: 'staff'
        }
      });
      console.log(`✅ System log created: staff_promoted ${username} by user ${performedById}`);
    } catch (logError) {
      console.error('Failed to log staff promotion:', logError);
    }

    return user;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error.message === 'User not found or is admin') {
      throw new ApiError(404, 'User not found or cannot promote admin', 'USER_NOT_FOUND');
    }
    throw new ApiError(500, 'Failed to promote to staff', error.message);
  }
}

/**
 * Demote staff (set is_demoted flag to true, keep role as staff)
 * @param {string} username - Username of staff to demote
 * @param {string} performedById - UUID of admin performing the action
 * @returns {Promise<Object>} Updated user object
 */
export async function demoteStaff(username, performedById) {
  try {
    const user = await UserModel.demoteStaff(username);

    // Log the action
    try {
      await SystemLog.createLog({
        actionType: 'staff_demoted',
        performedById,
        targetUserId: UserModel.id,
        details: `Demoted ${username} (staff flag set to demoted)`,
        metadata: {
          targetUsername: username,
          isDemoted: true
        }
      });
      console.log(`✅ System log created: staff_demoted ${username} by user ${performedById}`);
    } catch (logError) {
      console.error('Failed to log staff demotion:', logError);
    }

    return user;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error.message === 'Staff member not found') {
      throw new ApiError(404, 'Staff member not found', 'STAFF_NOT_FOUND');
    }
    throw new ApiError(500, 'Failed to demote staff', error.message);
  }
}

/**
 * Delete staff account permanently (only if is_demoted = true)
 * @param {string} username - Username of staff to delete
 * @param {string} performedById - UUID of admin performing the action
 * @returns {Promise<boolean>} True if deleted successfully
 */
export async function deleteStaffAccount(username, performedById) {
  try {
    // Get user info before deletion for logging
    const staffList = await getStaffMembers({ isDemoted: true });
    const user = staffList.find(s => s.username === username);
    if (!user) {
      throw new ApiError(400, 'Can only delete demoted staff accounts', 'CANNOT_DELETE');
    }

    await UserModel.deleteStaffAccount(username);

    // Log the action
    try {
      await SystemLog.createLog({
        actionType: 'staff_deleted',
        performedById,
        targetUserId: UserModel.id,
        details: `Permanently deleted staff account ${username}`,
        metadata: {
          targetUsername: username,
          deletedAt: new Date().toISOString()
        }
      });
      console.log(`✅ System log created: staff_deleted ${username} by user ${performedById}`);
    } catch (logError) {
      console.error('Failed to log staff deletion:', logError);
    }

    return true;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error.message === 'Staff member not found or not demoted') {
      throw new ApiError(404, 'Staff member not found or not demoted', 'STAFF_NOT_FOUND');
    }
    throw new ApiError(500, 'Failed to delete staff account', error.message);
  }
}

/**
 * Ban user account
 * @param {string} username - Username to ban
 * @param {string} reason - Reason for ban
 * @param {number} durationDays - Duration in days (null = permanent)
 * @param {string} performedById - UUID of admin performing the action
 * @returns {Promise<Object>} Updated user object
 */
export async function banUser(username, reason, durationDays, performedById) {
  try {
    const user = await UserModel.banUser(username, reason, durationDays);

    // Log the action
    try {
      await SystemLog.createLog({
        actionType: 'user_banned',
        performedById,
        targetUserId: UserModel.id,
        details: `Banned user ${username}${durationDays ? ` for ${durationDays} days` : ' permanently'}: ${reason}`,
        metadata: {
          targetUsername: username,
          reason,
          durationDays,
          permanent: !durationDays
        }
      });
      console.log(`✅ System log created: user_banned ${username} by user ${performedById}`);
    } catch (logError) {
      console.error('Failed to log user ban:', logError);
    }

    return user;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error.message === 'User not found or cannot ban admin') {
      throw new ApiError(404, 'User not found or cannot ban admin', 'USER_NOT_FOUND');
    }
    throw new ApiError(500, 'Failed to ban user', error.message);
  }
}

/**
 * Unban user account
 * @param {string} username - Username to unban
 * @param {string} performedById - UUID of admin performing the action
 * @returns {Promise<Object>} Updated user object
 */
export async function unbanUser(username, performedById) {
  try {
    // Get user info before unbanning for logging
    const result = await UserModel.getAllUsers({ limit: 1000 });
    const user = result.users.find(u => u.username === username);
    if (!user) {
      throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
    }

    const updatedUser = await UserModel.unbanUser(username);

    // Log the action
    try {
      await SystemLog.createLog({
        actionType: 'user_unbanned',
        performedById,
        targetUserId: updatedUser.id,
        details: `Unbanned user ${username}`,
        metadata: {
          targetUsername: username
        }
      });
      console.log(`✅ System log created: user_unbanned ${username} by user ${performedById}`);
    } catch (logError) {
      console.error('Failed to log user unban:', logError);
    }

    return updatedUser;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error.message === 'User not found') {
      throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
    }
    throw new ApiError(500, 'Failed to unban user', error.message);
  }
}

/**
 * Delete user account permanently
 * @param {string} username - Username to delete
 * @param {string} performedById - UUID of admin performing the action
 * @returns {Promise<boolean>} True if deleted successfully
 */
export async function deleteUser(username, performedById) {
  try {
    // Get user info before deletion for logging
    const result = await UserModel.getAllUsers({ limit: 1000 });
    const user = result.users.find(u => u.username === username);
    if (!user || user.role === 'admin') {
      throw new ApiError(404, 'User not found or cannot delete admin', 'USER_NOT_FOUND');
    }

    await UserModel.deleteUser(username);

    // Log the action
    try {
      await SystemLog.createLog({
        actionType: 'user_deleted',
        performedById,
        targetUserId: UserModel.id,
        details: `Permanently deleted user account ${username}`,
        metadata: {
          targetUsername: username,
          deletedAt: new Date().toISOString()
        }
      });
      console.log(`✅ System log created: user_deleted ${username} by user ${performedById}`);
    } catch (logError) {
      console.error('Failed to log user deletion:', logError);
    }

    return true;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error.message === 'User not found or cannot delete admin') {
      throw new ApiError(404, 'User not found or cannot delete admin', 'USER_NOT_FOUND');
    }
    throw new ApiError(500, 'Failed to delete user account', error.message);
  }
}

/**
 * Toggle maintenance mode (system maintenance - only admin access)
 * @param {boolean} enabled - True to enable, false to disable
 * @param {string} performedById - UUID of user performing the action
 * @returns {Promise<boolean>} Updated maintenance mode status
 */
export async function toggleMaintenanceMode(enabled, performedById) {
  try {
    const newStatus = await SystemSettings.updateMaintenanceMode(enabled);

    // Log the action
    try {
      if (!performedById) {
        console.warn('Warning: No performedById provided for maintenance mode toggle log');
      } else {
        await SystemLog.createLog({
          actionType: enabled ? 'maintenance_mode_enabled' : 'maintenance_mode_disabled',
          performedById,
          details: enabled
            ? 'Enabled system maintenance mode - only admins can access the system'
            : 'Disabled system maintenance mode - all users can access the system',
          metadata: {
            enabled: newStatus,
            type: 'system'
          }
        });
        console.log(`✅ System log created: maintenance_mode_${enabled ? 'enabled' : 'disabled'} by user ${performedById}`);
      }
    } catch (logError) {
      // Don't fail the operation if logging fails, but log the error
      console.error('❌ Failed to log maintenance mode toggle:', logError);
      console.error('Error details:', {
        message: logError.message,
        stack: logError.stack,
        performedById,
        enabled
      });
    }

    return newStatus;
  } catch (error) {
    throw new ApiError(500, 'Failed to toggle maintenance mode', error.message);
  }
}

/**
 * Toggle service maintenance mode (allows admin and staff access)
 * @param {boolean} enabled - True to enable, false to disable
 * @param {string} performedById - UUID of user performing the action
 * @returns {Promise<boolean>} Updated service maintenance mode status
 */
export async function toggleServiceMaintenanceMode(enabled, performedById) {
  try {
    const newStatus = await SystemSettings.updateServiceMaintenanceMode(enabled);

    // Log the action
    try {
      if (!performedById) {
        console.warn('Warning: No performedById provided for service maintenance mode toggle log');
      } else {
        await SystemLog.createLog({
          actionType: enabled ? 'service_maintenance_mode_enabled' : 'service_maintenance_mode_disabled',
          performedById,
          details: enabled
            ? 'Enabled service maintenance mode - admin and staff can access, regular users cannot'
            : 'Disabled service maintenance mode - all users can access the system',
          metadata: {
            enabled: newStatus,
            type: 'service'
          }
        });
        console.log(`✅ System log created: service_maintenance_mode_${enabled ? 'enabled' : 'disabled'} by user ${performedById}`);
      }
    } catch (logError) {
      // Don't fail the operation if logging fails, but log the error
      console.error('❌ Failed to log service maintenance mode toggle:', logError);
      console.error('Error details:', {
        message: logError.message,
        stack: logError.stack,
        performedById,
        enabled
      });
    }

    return newStatus;
  } catch (error) {
    throw new ApiError(500, 'Failed to toggle service maintenance mode', error.message);
  }
}

/**
 * Get general settings
 * @returns {Promise<Object>} General settings object
 */
export async function getGeneralSettings() {
  try {
    const keys = ['site_name', 'max_upload_size_mb', 'max_video_duration_seconds'];
    const settings = await SystemSettings.getSettings(keys);

    return {
      siteName: settings.site_name || 'ClipIQ Platform',
      maxUploadSizeMB: parseInt(settings.max_upload_size_mb || '500'),
      maxVideoDurationSeconds: parseInt(settings.max_video_duration_seconds || '3600')
    };
  } catch (error) {
    throw new ApiError(500, 'Failed to fetch general settings', error.message);
  }
}

/**
 * Update general settings
 * @param {Object} settings - Settings object
 * @param {string} settings.siteName - Site name
 * @param {number} settings.maxUploadSizeMB - Max upload size in MB
 * @param {number} settings.maxVideoDurationSeconds - Max video duration in seconds
 * @param {string} performedById - UUID of admin performing the action
 * @returns {Promise<Object>} Updated settings
 */
export async function updateGeneralSettings(settings, performedById) {
  try {
    // Validate inputs
    if (!settings.siteName || settings.siteName.trim().length === 0) {
      throw new ApiError(400, 'Site name is required', 'INVALID_SITE_NAME');
    }
    if (settings.siteName.length > 100) {
      throw new ApiError(400, 'Site name must be 100 characters or less', 'INVALID_SITE_NAME');
    }
    if (!settings.maxUploadSizeMB || settings.maxUploadSizeMB < 1 || settings.maxUploadSizeMB > 10000) {
      throw new ApiError(400, 'Max upload size must be between 1 and 10000 MB', 'INVALID_UPLOAD_SIZE');
    }
    if (!settings.maxVideoDurationSeconds || settings.maxVideoDurationSeconds < 1 || settings.maxVideoDurationSeconds > 86400) {
      throw new ApiError(400, 'Max video duration must be between 1 and 86400 seconds', 'INVALID_VIDEO_DURATION');
    }

    // Update settings
    const updateData = {
      site_name: settings.siteName.trim(),
      max_upload_size_mb: settings.maxUploadSizeMB.toString(),
      max_video_duration_seconds: settings.maxVideoDurationSeconds.toString()
    };

    await SystemSettings.updateSettings(updateData);

    // Log the action
    try {
      await SystemLog.createLog({
        actionType: 'settings_updated',
        performedById,
        details: `Updated general settings: site name="${updateData.site_name}", max upload=${updateData.max_upload_size_mb}MB, max duration=${updateData.max_video_duration_seconds}s`,
        metadata: {
          siteName: updateData.site_name,
          maxUploadSizeMB: parseInt(updateData.max_upload_size_mb),
          maxVideoDurationSeconds: parseInt(updateData.max_video_duration_seconds)
        }
      });
    } catch (logError) {
      // Don't fail the operation if logging fails
      console.error('Failed to log settings update:', logError);
    }

    // Return updated settings
    return {
      siteName: updateData.site_name,
      maxUploadSizeMB: parseInt(updateData.max_upload_size_mb),
      maxVideoDurationSeconds: parseInt(updateData.max_video_duration_seconds)
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to update general settings', error.message);
  }
}



