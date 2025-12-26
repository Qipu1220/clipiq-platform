/**
 * CommentReport Model
 * Represents a report made by a user about a comment
 */

import pool from '../config/database.js';

/**
 * Create a new comment report
 */
export async function createCommentReport(data) {
  const { commentId, reportedById, reason, description } = data;
  
  const query = `
    INSERT INTO comment_reports (comment_id, reported_by_id, reason, evidence_url, status)
    VALUES ($1, $2, $3, $4, 'pending')
    RETURNING *
  `;
  
  const values = [commentId, reportedById, reason, description || null];
  const result = await pool.query(query, values);
  
  return result.rows[0];
}

/**
 * Get comment report by ID
 */
export async function getCommentReportById(reportId) {
  const query = `
    SELECT 
      cr.*,
      c.text as comment_text,
      c.user_id as comment_user_id,
      c.video_id as video_id,
      u_reporter.username as reporter_username,
      u_reporter.display_name as reporter_display_name,
      u_commenter.username as commenter_username,
      u_commenter.display_name as commenter_display_name,
      v.title as video_title
    FROM comment_reports cr
    LEFT JOIN comments c ON cr.comment_id = c.id
    LEFT JOIN users u_reporter ON cr.reported_by_id = u_reporter.id
    LEFT JOIN users u_commenter ON c.user_id = u_commenter.id
    LEFT JOIN videos v ON c.video_id = v.id
    WHERE cr.id = $1
  `;
  
  const result = await pool.query(query, [reportId]);
  return result.rows[0] || null;
}

/**
 * Get all comment reports (for staff/admin)
 */
export async function getAllCommentReports(filters = {}) {
  const { status, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT 
      cr.*,
      c.text as comment_text,
      c.video_id as video_id,
      u_reporter.username as reporter_username,
      u_reporter.display_name as reporter_display_name,
      u_commenter.username as commenter_username,
      u_commenter.display_name as commenter_display_name,
      v.title as video_title
    FROM comment_reports cr
    LEFT JOIN comments c ON cr.comment_id = c.id
    LEFT JOIN users u_reporter ON cr.reported_by_id = u_reporter.id
    LEFT JOIN users u_commenter ON c.user_id = u_commenter.id
    LEFT JOIN videos v ON c.video_id = v.id
  `;
  
  const conditions = [];
  const params = [];
  let paramIndex = 1;
  
  if (status) {
    conditions.push(`cr.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }
  
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  query += ` ORDER BY cr.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);
  
  const result = await pool.query(query, params);
  
  // Get total count
  let countQuery = 'SELECT COUNT(*) FROM comment_reports cr';
  const countParams = [];
  
  if (status) {
    countQuery += ' WHERE cr.status = $1';
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
 * Check if user already reported this comment (only checks pending reports)
 */
export async function hasUserReportedComment(commentId, userId) {
  const query = `
    SELECT id FROM comment_reports
    WHERE comment_id = $1 AND reported_by_id = $2
    AND status = 'pending'
    LIMIT 1
  `;
  
  const result = await pool.query(query, [commentId, userId]);
  return result.rows.length > 0;
}

/**
 * Update report status (for staff/admin)
 */
export async function updateCommentReportStatus(reportId, status, reviewedById, resolutionNote) {
  const query = `
    UPDATE comment_reports
    SET status = $1, reviewed_by_id = $2, reviewed_at = CURRENT_TIMESTAMP, resolution_note = $3
    WHERE id = $4
    RETURNING *
  `;
  
  const values = [status, reviewedById, resolutionNote, reportId];
  const result = await pool.query(query, values);
  
  return result.rows[0];
}

/**
 * Delete comment report
 */
export async function deleteCommentReport(reportId) {
  const query = 'DELETE FROM comment_reports WHERE id = $1';
  await pool.query(query, [reportId]);
}

/**
 * Get reports by comment ID (useful for checking comment report history)
 */
export async function getReportsByCommentId(commentId) {
  const query = `
    SELECT 
      cr.*,
      u_reporter.username as reporter_username,
      u_reporter.display_name as reporter_display_name
    FROM comment_reports cr
    LEFT JOIN users u_reporter ON cr.reported_by_id = u_reporter.id
    WHERE cr.comment_id = $1
    ORDER BY cr.created_at DESC
  `;
  
  const result = await pool.query(query, [commentId]);
  return result.rows;
}

export default {
  createCommentReport,
  getCommentReportById,
  getAllCommentReports,
  hasUserReportedComment,
  updateCommentReportStatus,
  deleteCommentReport,
  getReportsByCommentId
};
