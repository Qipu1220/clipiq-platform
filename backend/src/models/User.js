/**
 * User Model
 * Database operations for user management
 */

import pool from '../config/database.js';

/**
 * Get all users with optional filters
 */
export async function getAllUsers(filters = {}) {
  const { role, banned, search, page = 1, limit = 100 } = filters;
  const offset = (page - 1) * limit;

  let query = `
    SELECT 
      u.id,
      u.username,
      u.email,
      u.role,
      u.display_name as "displayName",
      u.bio,
      u.avatar_url as "avatarUrl",
      u.banned,
      u.ban_expiry as "banExpiry",
      u.ban_reason as "banReason",
      u.warnings,
      u.is_demoted as "isDemoted",
      u.created_at as "createdAt",
      u.updated_at as "updatedAt",
      COUNT(DISTINCT v.id) as "videoCount",
      COUNT(DISTINCT sub_followers.id) as "followerCount",
      COUNT(DISTINCT sub_following.id) as "followingCount"
    FROM users u
    LEFT JOIN videos v ON u.id = v.uploader_id AND v.status = 'active'
    LEFT JOIN subscriptions sub_followers ON u.id = sub_followers.following_id
    LEFT JOIN subscriptions sub_following ON u.id = sub_following.follower_id
  `;

  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (role) {
    conditions.push(`u.role = $${paramIndex}`);
    params.push(role);
    paramIndex++;
  }

  if (banned !== undefined && banned !== null) {
    conditions.push(`u.banned = $${paramIndex}`);
    params.push(banned);
    paramIndex++;
  }

  if (filters.isDemoted !== undefined && filters.isDemoted !== null) {
    conditions.push(`u.is_demoted = $${paramIndex}`);
    params.push(filters.isDemoted);
    paramIndex++;
  }

  if (search) {
    conditions.push(`(u.username ILIKE $${paramIndex} OR u.display_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) FROM users u';
  const countParams = [];
  let countParamIndex = 1;

  if (conditions.length > 0) {
    const countConditions = [];
    if (role) {
      countConditions.push(`u.role = $${countParamIndex}`);
      countParams.push(role);
      countParamIndex++;
    }
    if (banned !== undefined && banned !== null) {
      countConditions.push(`u.banned = $${countParamIndex}`);
      countParams.push(banned);
      countParamIndex++;
    }
    if (filters.isDemoted !== undefined && filters.isDemoted !== null) {
      countConditions.push(`u.is_demoted = $${countParamIndex}`);
      countParams.push(filters.isDemoted);
      countParamIndex++;
    }
    if (search) {
      countConditions.push(`(u.username ILIKE $${countParamIndex} OR u.display_name ILIKE $${countParamIndex} OR u.email ILIKE $${countParamIndex})`);
      countParams.push(`%${search}%`);
      countParamIndex++;
    }
    countQuery += ` WHERE ${countConditions.join(' AND ')}`;
  }

  const countResult = await pool.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].count);

  return {
    users: result.rows,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
}

/**
 * Get user by username
 */
export async function getUserByUsername(username) {
  const query = `
    SELECT 
      u.id,
      u.username,
      u.email,
      u.role,
      u.display_name as "displayName",
      u.bio,
      u.avatar_url as "avatarUrl",
      u.banned,
      u.ban_expiry as "banExpiry",
      u.ban_reason as "banReason",
      u.warnings,
      u.is_demoted as "isDemoted",
      u.created_at as "createdAt",
      u.updated_at as "updatedAt",
      COUNT(DISTINCT v.id) as "videoCount",
      COUNT(DISTINCT sub_followers.id) as "followerCount",
      COUNT(DISTINCT sub_following.id) as "followingCount"
    FROM users u
    LEFT JOIN videos v ON u.id = v.uploader_id AND v.status = 'active'
    LEFT JOIN subscriptions sub_followers ON u.id = sub_followers.following_id
    LEFT JOIN subscriptions sub_following ON u.id = sub_following.follower_id
    WHERE u.username = $1
    GROUP BY u.id
  `;

  const result = await pool.query(query, [username]);
  return result.rows[0] || null;
}

/**
 * Get user by ID
 */
export async function getUserById(userId) {
  const query = `
    SELECT 
      u.id,
      u.username,
      u.email,
      u.role,
      u.display_name as "displayName",
      u.bio,
      u.avatar_url as "avatarUrl",
      u.banned,
      u.ban_expiry as "banExpiry",
      u.ban_reason as "banReason",
      u.warnings,
      u.is_demoted as "isDemoted",
      u.created_at as "createdAt",
      u.updated_at as "updatedAt",
      COUNT(DISTINCT v.id) as "videoCount",
      COUNT(DISTINCT sub_followers.id) as "followerCount",
      COUNT(DISTINCT sub_following.id) as "followingCount"
    FROM users u
    LEFT JOIN videos v ON u.id = v.uploader_id AND v.status = 'active'
    LEFT JOIN subscriptions sub_followers ON u.id = sub_followers.following_id
    LEFT JOIN subscriptions sub_following ON u.id = sub_following.follower_id
    WHERE u.id = $1
    GROUP BY u.id
  `;

  const result = await pool.query(query, [userId]);
  return result.rows[0] || null;
}

/**
 * Ban a user (temporary or permanent)
 */
export async function banUser(username, reason, bannedById, expiryDate = null) {
  const query = `
    UPDATE users
    SET banned = true, ban_reason = $1, ban_expiry = $2, updated_at = CURRENT_TIMESTAMP
    WHERE username = $3
    RETURNING id, username, email, role, display_name as "displayName", banned, ban_expiry as "banExpiry", ban_reason as "banReason", warnings
  `;

  const values = [reason, expiryDate, username];
  const result = await pool.query(query, values);

  return result.rows[0];
}

/**
 * Unban a user
 */
export async function unbanUser(username) {
  const query = `
    UPDATE users
    SET banned = false, ban_reason = NULL, ban_expiry = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE username = $1
    RETURNING id, username, email, role, display_name as "displayName", banned, ban_expiry as "banExpiry", ban_reason as "banReason", warnings
  `;

  const result = await pool.query(query, [username]);
  return result.rows[0];
}

/**
 * Warn a user (increment warning count)
 */
export async function warnUser(username, reason, warnedById) {
  const query = `
    UPDATE users
    SET warnings = warnings + 1, updated_at = CURRENT_TIMESTAMP
    WHERE username = $1
    RETURNING id, username, email, role, display_name as "displayName", banned, ban_expiry as "banExpiry", ban_reason as "banReason", warnings
  `;

  const result = await pool.query(query, [username]);
  return result.rows[0];
}

/**
 * Clear warnings for a user
 */
export async function clearWarnings(username) {
  const query = `
    UPDATE users
    SET warnings = 0, updated_at = CURRENT_TIMESTAMP
    WHERE username = $1
    RETURNING id, username, email, role, display_name as "displayName", banned, ban_expiry as "banExpiry", ban_reason as "banReason", warnings
  `;

  const result = await pool.query(query, [username]);
  return result.rows[0];
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId, updates) {
  const { displayName, bio, avatarUrl, email } = updates;

  const query = `
    UPDATE users
    SET 
      display_name = COALESCE($1, display_name),
      bio = COALESCE($2, bio),
      avatar_url = COALESCE($3, avatar_url),
      email = COALESCE($4, email),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING id, username, email, role, display_name as "displayName", bio, avatar_url as "avatarUrl", banned, warnings, created_at as "createdAt", updated_at as "updatedAt"
  `;

  const values = [displayName, bio, avatarUrl, email, userId];
  const result = await pool.query(query, values);

  return result.rows[0];
}

/**
 * Get staff statistics
 */
export async function getStaffStats(userId) {
  const query = `
    WITH report_stats AS (
      SELECT 
        COUNT(DISTINCT CASE WHEN vr.resolved_by = $1 THEN vr.id END) +
        COUNT(DISTINCT CASE WHEN ur.resolved_by = $1 THEN ur.id END) +
        COUNT(DISTINCT CASE WHEN cr.resolved_by = $1 THEN cr.id END) as reports_processed
      FROM users u
      LEFT JOIN video_reports vr ON vr.resolved_by = u.id
      LEFT JOIN user_reports ur ON ur.resolved_by = u.id
      LEFT JOIN comment_reports cr ON cr.resolved_by = u.id
      WHERE u.id = $1
    ),
    user_actions AS (
      SELECT
        COUNT(DISTINCT u.id) FILTER (WHERE u.warnings > 0) as users_warned,
        COUNT(DISTINCT u.id) FILTER (WHERE u.banned = true) as users_banned
      FROM users u
    ),
    activity AS (
      SELECT
        EXTRACT(DAY FROM (CURRENT_TIMESTAMP - MIN(created_at))) as days_active,
        MAX(updated_at) as last_activity
      FROM users
      WHERE id = $1
    )
    SELECT 
      COALESCE(rs.reports_processed, 0) as reports_processed,
      COALESCE(ua.users_warned, 0) as users_warned,
      COALESCE(ua.users_banned, 0) as users_banned,
      COALESCE(a.days_active, 0) as days_active,
      a.last_activity
    FROM report_stats rs
    CROSS JOIN user_actions ua
    CROSS JOIN activity a
  `;

  const result = await pool.query(query, [userId]);
  return result.rows[0] || {
    reports_processed: 0,
    users_warned: 0,
    users_banned: 0,
    days_active: 0,
    last_activity: null
  };
}

/**
 * Promote user to staff
 */
export async function promoteToStaff(username) {
  const query = `
    UPDATE users
    SET role = 'staff', is_demoted = false, updated_at = CURRENT_TIMESTAMP
    WHERE username = $1
    RETURNING id, username, email, role, display_name as "displayName", is_demoted as "isDemoted"
  `;

  const result = await pool.query(query, [username]);
  return result.rows[0];
}

/**
 * Demote staff member
 */
export async function demoteStaff(username) {
  const query = `
    UPDATE users
    SET is_demoted = true, updated_at = CURRENT_TIMESTAMP
    WHERE username = $1 AND role = 'staff'
    RETURNING id, username, email, role, display_name as "displayName", is_demoted as "isDemoted"
  `;

  const result = await pool.query(query, [username]);
  return result.rows[0];
}

/**
 * Get staff members with optional filters
 */
export async function getStaffMembers(filters = {}) {
  // Reuse getAllUsers but force role='staff'
  return getAllUsers({ ...filters, role: 'staff' });
}

/**
 * Search users by username or display name
 */
export async function searchUsers(query, limit = 10, offset = 0) {
  const searchPattern = `%${query}%`;
  
  const sql = `
    SELECT 
      u.id, 
      u.username, 
      u.display_name, 
      u.avatar_url, 
      u.bio, 
      u.role, 
      u.created_at,
      (SELECT COUNT(*) FROM subscriptions WHERE following_id = u.id) as followers_count
    FROM users u
    WHERE u.username ILIKE $1 OR u.display_name ILIKE $1
    ORDER BY followers_count DESC, u.created_at DESC
    LIMIT $2 OFFSET $3
  `;
  
  const result = await pool.query(sql, [searchPattern, limit, offset]);
  return result.rows;
}

/**
 * Count search users results
 */
export async function countSearchUsers(query) {
  const searchPattern = `%${query}%`;
  
  const sql = `
    SELECT COUNT(*) 
    FROM users 
    WHERE username ILIKE $1 OR display_name ILIKE $1
  `;
  
  const result = await pool.query(sql, [searchPattern]);
  return parseInt(result.rows[0].count);
}

export default {
  getAllUsers,
  getUserByUsername,
  getUserById,
  banUser,
  unbanUser,
  warnUser,
  clearWarnings,
  updateUserProfile,
  getStaffStats,
  promoteToStaff,
  demoteStaff,
  getStaffMembers,
  searchUsers,
  countSearchUsers
};
