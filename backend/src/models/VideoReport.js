/**
 * VideoReport Model
 * Represents a report made by a user about a video
 */

import pool from '../config/database.js';

/**
 * Create a new video report
 */
export async function createVideoReport(data) {
  const { videoId, reportedById, reason, description } = data;
  
  const query = `
    INSERT INTO video_reports (video_id, reported_by_id, reason, evidence_url, status)
    VALUES ($1, $2, $3, $4, 'pending')
    RETURNING *
  `;
  
  const values = [videoId, reportedById, reason, description || null];
  const result = await pool.query(query, values);
  
  return result.rows[0];
}

/**
 * Get video report by ID
 */
export async function getVideoReportById(reportId) {
  const query = `
    SELECT 
      vr.*,
      v.title as video_title,
      v.uploader_id as video_uploader_id,
      u_reporter.username as reporter_username,
      u_reporter.display_name as reporter_display_name,
      u_uploader.username as uploader_username,
      u_uploader.display_name as uploader_display_name
    FROM video_reports vr
    LEFT JOIN videos v ON vr.video_id = v.id
    LEFT JOIN users u_reporter ON vr.reported_by_id = u_reporter.id
    LEFT JOIN users u_uploader ON v.uploader_id = u_uploader.id
    WHERE vr.id = $1
  `;
  
  const result = await pool.query(query, [reportId]);
  return result.rows[0] || null;
}

/**
 * Get all video reports (for staff/admin)
 */
export async function getAllVideoReports(filters = {}) {
  const { status, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT 
      vr.*,
      v.title as video_title,
      v.video_url as video_url,
      u_reporter.username as reporter_username,
      u_reporter.display_name as reporter_display_name,
      u_uploader.username as uploader_username,
      u_uploader.display_name as uploader_display_name
    FROM video_reports vr
    LEFT JOIN videos v ON vr.video_id = v.id
    LEFT JOIN users u_reporter ON vr.reported_by_id = u_reporter.id
    LEFT JOIN users u_uploader ON v.uploader_id = u_uploader.id
  `;
  
  const conditions = [];
  const params = [];
  let paramIndex = 1;
  
  if (status) {
    conditions.push(`vr.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }
  
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  query += ` ORDER BY vr.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);
  
  const result = await pool.query(query, params);
  
  // Get total count
  let countQuery = 'SELECT COUNT(*) FROM video_reports vr';
  const countParams = [];
  
  if (status) {
    countQuery += ' WHERE vr.status = $1';
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
 * Check if user already reported this video
 */
export async function hasUserReportedVideo(videoId, userId) {
  const query = `
    SELECT id FROM video_reports
    WHERE video_id = $1 AND reported_by_id = $2
    LIMIT 1
  `;
  
  const result = await pool.query(query, [videoId, userId]);
  return result.rows.length > 0;
}

/**
 * Update report status (for staff/admin)
 */
export async function updateVideoReportStatus(reportId, status, reviewedById, resolutionNote) {
  const query = `
    UPDATE video_reports
    SET status = $1, reviewed_by_id = $2, reviewed_at = CURRENT_TIMESTAMP, resolution_note = $3
    WHERE id = $4
    RETURNING *
  `;
  
  const values = [status, reviewedById, resolutionNote, reportId];
  const result = await pool.query(query, values);
  
  return result.rows[0];
}

/**
 * Delete video report
 */
export async function deleteVideoReport(reportId) {
  const query = 'DELETE FROM video_reports WHERE id = $1';
  await pool.query(query, [reportId]);
}

export default {
  createVideoReport,
  getVideoReportById,
  getAllVideoReports,
  hasUserReportedVideo,
  updateVideoReportStatus,
  deleteVideoReport
};
