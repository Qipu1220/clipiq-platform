/**
 * UserReport Model
 * Represents a report made by a user about another user
=======
 * Repository for user report data access operations

 */

import pool from '../config/database.js';


/**
 * Create a new user report
 */
export async function createUserReport(data) {
  const { reportedUserId, reportedById, reason, description } = data;
  
  const query = `
    INSERT INTO user_reports (reported_user_id, reported_by_id, reason, evidence_url, status)
    VALUES ($1, $2, $3, $4, 'pending')
    RETURNING *
  `;
  
  const values = [reportedUserId, reportedById, reason, description || null];
  const result = await pool.query(query, values);
  
  return result.rows[0];
}

/**
 * Get user report by ID
 */
export async function getUserReportById(reportId) {
  const query = `
    SELECT 
      ur.*,
      u_reported.username as reported_username,
      u_reported.display_name as reported_display_name,
      u_reporter.username as reporter_username,
      u_reporter.display_name as reporter_display_name,
      u_reviewer.username as reviewer_username
    FROM user_reports ur
    LEFT JOIN users u_reported ON ur.reported_user_id = u_reported.id
    LEFT JOIN users u_reporter ON ur.reported_by_id = u_reporter.id
    LEFT JOIN users u_reviewer ON ur.reviewed_by_id = u_reviewer.id
    WHERE ur.id = $1
  `;
  
  const result = await pool.query(query, [reportId]);
  return result.rows[0] || null;
}

/**
 * Get all user reports (for staff/admin)
 */
export async function getAllUserReports(filters = {}) {
  const { status, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT 
      ur.*,
      u_reported.username as reported_username,
      u_reported.display_name as reported_display_name,
      u_reported.avatar_url as reported_avatar_url,
      u_reporter.username as reporter_username,
      u_reporter.display_name as reporter_display_name,
      u_reviewer.username as reviewer_username
    FROM user_reports ur
    LEFT JOIN users u_reported ON ur.reported_user_id = u_reported.id
    LEFT JOIN users u_reporter ON ur.reported_by_id = u_reporter.id
    LEFT JOIN users u_reviewer ON ur.reviewed_by_id = u_reviewer.id
  `;
  
  const conditions = [];
  const params = [];
  let paramIndex = 1;
  
  if (status) {
    conditions.push(`ur.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }
  
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  query += ` ORDER BY ur.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);
  
  const result = await pool.query(query, params);
  
  // Get total count
  let countQuery = 'SELECT COUNT(*) FROM user_reports ur';
  const countParams = [];
  
  if (status) {
    countQuery += ' WHERE ur.status = $1';
    countParams.push(status);
  }
  
  const countResult = await pool.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].count);
  
  return {
    reports: result.rows,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
}

/**
 * Check if user already reported another user (only checks pending reports)
 */
export async function hasUserReportedUser(reportedUserId, reportedById) {
  const query = `
    SELECT id FROM user_reports
    WHERE reported_user_id = $1 AND reported_by_id = $2 AND status = 'pending'
    LIMIT 1
  `;
  
  const result = await pool.query(query, [reportedUserId, reportedById]);
  return result.rows.length > 0;
}

/**
 * Update user report status (for staff/admin)
 */
export async function updateUserReportStatus(reportId, status, reviewedById, resolutionNote) {
  const query = `
    UPDATE user_reports
    SET 
      status = $1,
      reviewed_by_id = $2,
      reviewed_at = CURRENT_TIMESTAMP,
      resolution_note = $3
    WHERE id = $4
    RETURNING *
  `;
  
  const values = [status, reviewedById, resolutionNote, reportId];
  const result = await pool.query(query, values);
  
  return result.rows[0];
}

/**
 * Get reports by reported user (for checking user history)
 */
export async function getReportsByReportedUser(userId) {
  const query = `
    SELECT 
      ur.*,
      u_reporter.username as reporter_username
    FROM user_reports ur
    LEFT JOIN users u_reporter ON ur.reported_by_id = u_reporter.id
    WHERE ur.reported_user_id = $1
    ORDER BY ur.created_at DESC
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows;
}

/**
 * Get pending user reports (for admin dashboard)
 * @param {number} limit - Number of reports to return (default: 5)
 * @returns {Promise<Array>} Array of pending user reports
 */
export async function getPendingUserReports(limit = 5) {
  const query = `
    SELECT 
      ur.id,
      ur.reason,
      ur.created_at,
      u1.username as reported_user,
      u2.username as reported_by
    FROM user_reports ur
    LEFT JOIN users u1 ON ur.reported_user_id = u1.id
    LEFT JOIN users u2 ON ur.reported_by_id = u2.id
    WHERE ur.status = 'pending'
    ORDER BY ur.created_at DESC
    LIMIT $1
  `;
  const result = await pool.query(query, [limit]);
  return result.rows.map(row => ({
    id: row.id,
    type: 'user',
    reason: row.reason,
    createdAt: row.created_at,
    reportedUser: row.reported_user,
    reportedBy: row.reported_by
  }));
}

/**
 * Count pending user reports (for admin dashboard)
 * @returns {Promise<number>} Number of pending user reports
 */
export async function countPendingUserReports() {
  const query = `
    SELECT COUNT(*) as count
    FROM user_reports
    WHERE status = 'pending'
  `;
  const result = await pool.query(query);
  return parseInt(result.rows[0].count || 0);
}

export default {
  createUserReport,
  getUserReportById,
  getAllUserReports,
  hasUserReportedUser,
  updateUserReportStatus,
  getReportsByReportedUser,
  getPendingUserReports,
  countPendingUserReports
};
