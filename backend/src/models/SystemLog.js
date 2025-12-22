/**
 * SystemLog Model
 * Repository for system logs data access operations
 */

import pool from '../config/database.js';

export class SystemLog {
  /**
   * Create a new system log entry
   * @param {Object} logData - Log data
   * @param {string} logData.actionType - Type of action (e.g., 'user_banned', 'staff_promoted')
   * @param {string} logData.performedById - UUID of user who performed the action
   * @param {string} logData.targetUserId - UUID of user affected (optional)
   * @param {string} logData.targetVideoId - UUID of video affected (optional)
   * @param {string} logData.details - Human-readable description
   * @param {Object} logData.metadata - Additional structured data (optional)
   * @returns {Promise<Object>} Created log entry
   */
  static async createLog(logData) {
    const {
      actionType,
      performedById,
      targetUserId = null,
      targetVideoId = null,
      details,
      metadata = null
    } = logData;

    const query = `
      INSERT INTO system_logs (
        action_type,
        performed_by_id,
        target_user_id,
        target_video_id,
        details,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, action_type, performed_by_id, target_user_id, target_video_id,
                details, metadata, created_at
    `;

    const params = [
      actionType,
      performedById,
      targetUserId,
      targetVideoId,
      details,
      metadata ? JSON.stringify(metadata) : null
    ];

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Get system logs with pagination and filtering
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of logs to return (default: 10)
   * @param {number} options.offset - Number of logs to skip (default: 0)
   * @param {string} options.actionType - Filter by action type (optional)
   * @param {string} options.performedById - Filter by performer (optional)
   * @returns {Promise<Array>} Array of log objects with user info
   */
  static async getLogs(options = {}) {
    const {
      limit = 10,
      offset = 0,
      actionType = null,
      performedById = null
    } = options;

    let query = `
      SELECT 
        sl.id,
        sl.action_type,
        sl.details,
        sl.metadata,
        sl.created_at,
        u.username as performed_by_username,
        u.display_name as performed_by_display_name,
        target_user.username as target_username,
        target_user.display_name as target_display_name
      FROM system_logs sl
      LEFT JOIN users u ON sl.performed_by_id = u.id
      LEFT JOIN users target_user ON sl.target_user_id = target_user.id
    `;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (actionType) {
      conditions.push(`sl.action_type = $${paramIndex}`);
      params.push(actionType);
      paramIndex++;
    }

    if (performedById) {
      conditions.push(`sl.performed_by_id = $${paramIndex}`);
      params.push(performedById);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
      ORDER BY sl.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    try {
      const result = await pool.query(query, params);

      return result.rows.map(row => {
        let metadata = null;
        try {
          if (row.metadata) {
            // If metadata is already an object (jsonb), use it directly
            metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
          }
        } catch (parseError) {
          console.error('Error parsing metadata:', parseError);
          metadata = null;
        }

        return {
          id: row.id,
          actionType: row.action_type,
          details: row.details,
          metadata,
          createdAt: row.created_at,
          performedBy: {
            username: row.performed_by_username || 'system',
            displayName: row.performed_by_display_name
          },
          targetUser: row.target_username ? {
            username: row.target_username,
            displayName: row.target_display_name
          } : null
        };
      });
    } catch (error) {
      console.error('❌ Error in SystemLog.getLogs:', error);
      console.error('Query:', query);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * Get recent system logs (for dashboard)
   * Returns logs in the same format as the old aggregation method
   * @param {number} limit - Number of logs to return (default: 10)
   * @returns {Promise<Array>} Array of log objects with format compatible with old system
   */
  static async getRecentLogs(limit = 10) {
    const logs = await this.getLogs({ limit, offset: 0 });

    // Transform to match old format for backward compatibility
    return logs.map((log, index) => ({
      id: log.id,
      action: log.actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      user: log.performedBy.username || 'system',
      details: log.details || '',
      timestamp: log.createdAt
    }));
  }

  /**
   * Get total count of logs (for pagination)
   * @param {Object} options - Filter options
   * @param {string} options.actionType - Filter by action type (optional)
   * @param {string} options.performedById - Filter by performer (optional)
   * @returns {Promise<number>} Total count
   */
  static async getTotalCount(options = {}) {
    const { actionType = null, performedById = null } = options;

    let query = 'SELECT COUNT(*) as total FROM system_logs sl';
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (actionType) {
      conditions.push(`sl.action_type = $${paramIndex}`);
      params.push(actionType);
      paramIndex++;
    }

    if (performedById) {
      conditions.push(`sl.performed_by_id = $${paramIndex}`);
      params.push(performedById);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = await pool.query(query, params);
    return parseInt(result.rows[0].total || 0);
  }
}

