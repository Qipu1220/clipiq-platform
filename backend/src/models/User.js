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
      u.display_name,
      u.bio,
      u.avatar_url,
      u.banned,
      u.ban_expiry,
      u.ban_reason,
      u.warnings,
      u.created_at,
      u.updated_at,
      COUNT(DISTINCT v.id) as video_count,
      COUNT(DISTINCT sub_followers.id) as follower_count,
      COUNT(DISTINCT sub_following.id) as following_count
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
  
  if (banned !== undefined) {
    conditions.push(`u.banned = $${paramIndex}`);
    params.push(banned);
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
    if (banned !== undefined) {
      countConditions.push(`u.banned = $${countParamIndex}`);
      countParams.push(banned);
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
      u.*,
      COUNT(DISTINCT v.id) as video_count,
      COUNT(DISTINCT sub_followers.id) as follower_count,
      COUNT(DISTINCT sub_following.id) as following_count
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
      u.*,
      COUNT(DISTINCT v.id) as video_count,
      COUNT(DISTINCT sub_followers.id) as follower_count,
      COUNT(DISTINCT sub_following.id) as following_count
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
    RETURNING id, username, email, role, display_name, banned, ban_expiry, ban_reason, warnings
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
    RETURNING id, username, email, role, display_name, banned, ban_expiry, ban_reason, warnings
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
    RETURNING id, username, email, role, display_name, banned, ban_expiry, ban_reason, warnings
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
    RETURNING id, username, email, role, display_name, banned, ban_expiry, ban_reason, warnings
  `;
  
  const result = await pool.query(query, [username]);
  return result.rows[0];
}

/**
 * Update user profile
 */
export async function updateUserProfile(username, updates) {
  const { displayName, bio, avatarUrl } = updates;
  
  const query = `
    UPDATE users
    SET 
      display_name = COALESCE($1, display_name),
      bio = COALESCE($2, bio),
      avatar_url = COALESCE($3, avatar_url),
      updated_at = CURRENT_TIMESTAMP
    WHERE username = $4
    RETURNING id, username, email, role, display_name, bio, avatar_url, banned, warnings, created_at, updated_at
  `;
  
  const values = [displayName, bio, avatarUrl, username];
  const result = await pool.query(query, values);
  
  return result.rows[0];
}

export default {
  getAllUsers,
  getUserByUsername,
  getUserById,
  banUser,
  unbanUser,
  warnUser,
  clearWarnings,
  updateUserProfile
};
