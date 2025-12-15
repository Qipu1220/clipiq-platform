/**
 * User Model
 * Repository for user data access operations
 */

import pool from '../config/database.js';

export class User {
  /**
   * Get user statistics
   * Returns counts by role and banned status
   */
  static async getStatistics() {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE role = 'user') as total_users,
        COUNT(*) FILTER (WHERE role = 'staff') as total_staff,
        COUNT(*) FILTER (WHERE role = 'admin') as total_admins,
        COUNT(*) FILTER (WHERE banned = true) as banned_users
      FROM users
    `;
    const result = await pool.query(query);
    return {
      total: parseInt(result.rows[0].total_users || 0),
      staff: parseInt(result.rows[0].total_staff || 0),
      admins: parseInt(result.rows[0].total_admins || 0),
      banned: parseInt(result.rows[0].banned_users || 0)
    };
  }

  /**
   * Get all users with pagination and filtering
   */
  static async getAllUsers(options = {}) {
    const { limit = 50, offset = 0, role = null, banned = null, search = null } = options;

    let query = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.display_name,
        u.bio,
        u.avatar_url,
        u.banned,
        u.ban_expiry,
        u.ban_reason,
        u.warnings,
        u.is_demoted,
        u.created_at,
        u.updated_at,
        COUNT(v.id) FILTER (WHERE v.status = 'active') as video_count
      FROM users u
      LEFT JOIN videos v ON u.id = v.uploader_id
    `;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (role) {
      conditions.push(`u.role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    if (banned !== null) {
      conditions.push(`u.banned = $${paramIndex}`);
      params.push(banned);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(u.username ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.display_name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return result.rows.map(row => ({
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role,
      displayName: row.display_name,
      bio: row.bio,
      avatarUrl: row.avatar_url,
      banned: row.banned,
      banExpiry: row.ban_expiry,
      banReason: row.ban_reason,
      warnings: parseInt(row.warnings || 0),
      isDemoted: row.is_demoted || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      videoCount: parseInt(row.video_count || 0)
    }));
  }

  /**
   * Get total user count (for pagination)
   */
  static async getTotalCount(options = {}) {
    const { role = null, banned = null, search = null } = options;

    let query = 'SELECT COUNT(*) as total FROM users u';
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (role) {
      conditions.push(`u.role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    if (banned !== null) {
      conditions.push(`u.banned = $${paramIndex}`);
      params.push(banned);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(u.username ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.display_name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = await pool.query(query, params);
    return parseInt(result.rows[0].total || 0);
  }

  /**
   * Update user role
   * @param {string} username - Username to update
   * @param {string} newRole - New role ('admin', 'staff', 'user')
   * @returns {Promise<Object>} Updated user object
   */
  static async updateRole(username, newRole) {
    const query = `
      UPDATE users
      SET role = $1, updated_at = CURRENT_TIMESTAMP
      WHERE username = $2
      RETURNING id, username, email, role, display_name, bio, avatar_url,
                banned, ban_expiry, ban_reason, warnings, is_demoted, created_at, updated_at
    `;
    const result = await pool.query(query, [newRole, username]);
    
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role,
      displayName: row.display_name,
      bio: row.bio,
      avatarUrl: row.avatar_url,
      banned: row.banned,
      banExpiry: row.ban_expiry,
      banReason: row.ban_reason,
      warnings: parseInt(row.warnings || 0),
      isDemoted: row.is_demoted || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Get all staff members with optional is_demoted filter
   * @param {Object} options - Filter options
   * @param {boolean} options.isDemoted - Filter by is_demoted status (null = all)
   * @returns {Promise<Array>} Array of staff user objects
   */
  static async getStaffMembers(options = {}) {
    const { isDemoted = null } = options;
    
    let query = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.display_name,
        u.bio,
        u.avatar_url,
        u.banned,
        u.ban_expiry,
        u.ban_reason,
        u.warnings,
        u.is_demoted,
        u.created_at,
        u.updated_at,
        COUNT(v.id) as video_count
      FROM users u
      LEFT JOIN videos v ON v.uploader_id = u.id AND v.status = 'active'
      WHERE u.role = 'staff'
    `;
    const params = [];
    let paramIndex = 1;
    
    if (isDemoted !== null && isDemoted !== undefined) {
      if (isDemoted) {
        // For demoted: include both is_demoted = true OR is_demoted IS NULL (new staff)
        query += ` AND (u.is_demoted = $${paramIndex} OR u.is_demoted IS NULL)`;
      } else {
        // For active: only is_demoted = false
        query += ` AND u.is_demoted = $${paramIndex}`;
      }
      params.push(isDemoted);
      paramIndex++;
    }
    
    query += `
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `;
    
    try {
      const result = await pool.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        username: row.username,
        email: row.email,
        role: row.role,
        displayName: row.display_name,
        bio: row.bio,
        avatarUrl: row.avatar_url,
        banned: row.banned,
        banExpiry: row.ban_expiry,
        banReason: row.ban_reason,
        warnings: parseInt(row.warnings || 0),
        isDemoted: row.is_demoted || false,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        videoCount: parseInt(row.video_count || 0)
      }));
    } catch (error) {
      console.error('❌ Error in getStaffMembers:', error);
      console.error('Query:', query);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * Promote user to staff (set role to staff and is_demoted to false)
   * @param {string} username - Username to promote
   * @returns {Promise<Object>} Updated user object
   */
  static async promoteToStaff(username) {
    const query = `
      UPDATE users
      SET role = 'staff', is_demoted = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE username = $1 AND role != 'admin'
      RETURNING id, username, email, role, display_name, bio, avatar_url,
                banned, ban_expiry, ban_reason, warnings, is_demoted, created_at, updated_at
    `;
    const result = await pool.query(query, [username]);
    
    if (result.rows.length === 0) {
      throw new Error('User not found or is admin');
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role,
      displayName: row.display_name,
      bio: row.bio,
      avatarUrl: row.avatar_url,
      banned: row.banned,
      banExpiry: row.ban_expiry,
      banReason: row.ban_reason,
      warnings: parseInt(row.warnings || 0),
      isDemoted: row.is_demoted || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Demote staff (set is_demoted flag to true, keep role as staff)
   * @param {string} username - Username of staff to demote
   * @returns {Promise<Object>} Updated user object
   */
  static async demoteStaff(username) {
    const query = `
      UPDATE users
      SET is_demoted = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE username = $1 AND role = 'staff'
      RETURNING id, username, email, role, display_name, bio, avatar_url,
                banned, ban_expiry, ban_reason, warnings, is_demoted, created_at, updated_at
    `;
    const result = await pool.query(query, [username]);
    
    if (result.rows.length === 0) {
      throw new Error('Staff member not found');
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role,
      displayName: row.display_name,
      bio: row.bio,
      avatarUrl: row.avatar_url,
      banned: row.banned,
      banExpiry: row.ban_expiry,
      banReason: row.ban_reason,
      warnings: parseInt(row.warnings || 0),
      isDemoted: row.is_demoted || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Delete staff account permanently (only if is_demoted = true)
   * @param {string} username - Username of staff to delete
   * @returns {Promise<boolean>} True if deleted successfully
   */
  static async deleteStaffAccount(username) {
    const query = `
      DELETE FROM users
      WHERE username = $1 AND role = 'staff' AND is_demoted = TRUE
      RETURNING id
    `;
    const result = await pool.query(query, [username]);
    
    if (result.rows.length === 0) {
      throw new Error('Staff member not found or not demoted');
    }
    
    return true;
  }

  /**
   * Ban user account
   * @param {string} username - Username to ban
   * @param {string} reason - Reason for ban
   * @param {number} durationDays - Duration in days (null = permanent)
   * @returns {Promise<Object>} Updated user object
   */
  static async banUser(username, reason, durationDays = null) {
    let banExpiry = null;
    if (durationDays) {
      banExpiry = new Date();
      banExpiry.setDate(banExpiry.getDate() + durationDays);
    }

    const query = `
      UPDATE users
      SET banned = TRUE, ban_reason = $1, ban_expiry = $2, updated_at = CURRENT_TIMESTAMP
      WHERE username = $3 AND role != 'admin'
      RETURNING id, username, email, role, display_name, bio, avatar_url,
                banned, ban_expiry, ban_reason, warnings, is_demoted, created_at, updated_at
    `;
    const result = await pool.query(query, [reason, banExpiry, username]);
    
    if (result.rows.length === 0) {
      throw new Error('User not found or cannot ban admin');
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role,
      displayName: row.display_name,
      bio: row.bio,
      avatarUrl: row.avatar_url,
      banned: row.banned,
      banExpiry: row.ban_expiry,
      banReason: row.ban_reason,
      warnings: parseInt(row.warnings || 0),
      isDemoted: row.is_demoted || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Unban user account
   * @param {string} username - Username to unban
   * @returns {Promise<Object>} Updated user object
   */
  static async unbanUser(username) {
    const query = `
      UPDATE users
      SET banned = FALSE, ban_reason = NULL, ban_expiry = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE username = $1
      RETURNING id, username, email, role, display_name, bio, avatar_url,
                banned, ban_expiry, ban_reason, warnings, is_demoted, created_at, updated_at
    `;
    const result = await pool.query(query, [username]);
    
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role,
      displayName: row.display_name,
      bio: row.bio,
      avatarUrl: row.avatar_url,
      banned: row.banned,
      banExpiry: row.ban_expiry,
      banReason: row.ban_reason,
      warnings: parseInt(row.warnings || 0),
      isDemoted: row.is_demoted || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Delete user account permanently
   * @param {string} username - Username to delete
   * @returns {Promise<boolean>} True if deleted successfully
   */
  static async deleteUser(username) {
    const query = `
      DELETE FROM users
      WHERE username = $1 AND role != 'admin'
      RETURNING id
    `;
    const result = await pool.query(query, [username]);
    
    if (result.rows.length === 0) {
      throw new Error('User not found or cannot delete admin');
    }
    
    return true;
  }
}
