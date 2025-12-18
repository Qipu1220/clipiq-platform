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
 * Check if user already reported this video (only checks pending reports)
 */
export async function hasUserReportedVideo(videoId, userId) {
  const query = `
    SELECT id FROM video_reports
    WHERE video_id = $1 AND reported_by_id = $2 AND status = 'pending'
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
 * Get detailed video report information for staff review
 */
export async function getVideoReportDetails(videoId) {
  // Get video details with uploader info
  const videoQuery = `
    SELECT 
      v.*,
      u.username as uploader_username,
      u.display_name as uploader_display_name,
      u.avatar_url as uploader_avatar_url,
      u.email as uploader_email,
      u.role as uploader_role,
      u.banned as uploader_banned,
      u.warnings as uploader_warnings,
      u.created_at as uploader_joined_date,
      COUNT(DISTINCT l.id) as like_count,
      COUNT(DISTINCT c.id) as comment_count
    FROM videos v
    LEFT JOIN users u ON v.uploader_id = u.id
    LEFT JOIN likes l ON v.id = l.video_id
    LEFT JOIN comments c ON v.id = c.video_id
    WHERE v.id = $1
    GROUP BY v.id, u.id
  `;
  
  const videoResult = await pool.query(videoQuery, [videoId]);
  
  if (videoResult.rows.length === 0) {
    return null;
  }
  
  const video = videoResult.rows[0];
  
  // Get all reports for this video
  const reportsQuery = `
    SELECT 
      vr.*,
      u.username as reporter_username,
      u.display_name as reporter_display_name,
      u.avatar_url as reporter_avatar_url
    FROM video_reports vr
    LEFT JOIN users u ON vr.reported_by_id = u.id
    WHERE vr.video_id = $1
    ORDER BY vr.created_at DESC
  `;
  
  const reportsResult = await pool.query(reportsQuery, [videoId]);
  
  // Get comments for this video
  const commentsQuery = `
    SELECT 
      c.*,
      u.username,
      u.display_name,
      u.avatar_url
    FROM comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.video_id = $1
    ORDER BY c.created_at DESC
  `;
  
  const commentsResult = await pool.query(commentsQuery, [videoId]);
  
  return {
    video: {
      id: video.id,
      title: video.title,
      description: video.description,
      videoUrl: video.video_url,
      thumbnailUrl: video.thumbnail_url,
      views: video.views,
      likes: video.like_count,
      commentCount: video.comment_count,
      uploadDate: video.created_at,
      status: video.status
    },
    uploader: {
      id: video.uploader_id,
      username: video.uploader_username,
      displayName: video.uploader_display_name,
      avatarUrl: video.uploader_avatar_url,
      email: video.uploader_email,
      role: video.uploader_role,
      banned: video.uploader_banned,
      warnings: video.uploader_warnings,
      joinedDate: video.uploader_joined_date
    },
    reports: reportsResult.rows.map(r => ({
      id: r.id,
      reason: r.reason,
      evidenceUrl: r.evidence_url,
      status: r.status,
      createdAt: r.created_at,
      reporter: {
        username: r.reporter_username,
        displayName: r.reporter_display_name,
        avatarUrl: r.reporter_avatar_url
      }
    })),
    comments: commentsResult.rows.map(c => ({
      id: c.id,
      text: c.text,
      createdAt: c.created_at,
      user: {
        username: c.username,
        displayName: c.display_name,
        avatarUrl: c.avatar_url
      }
    })),
    reportCount: reportsResult.rows.length
  };
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
  deleteVideoReport,
  getVideoReportDetails
};
