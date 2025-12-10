/**
 * Report Service
 * Business logic for handling reports (videos, users, comments)
 */

import * as VideoReportModel from '../models/VideoReport.js';
import pool from '../config/database.js';
import ApiError from '../utils/apiError.js';

/**
 * Create a video report
 */
export async function createVideoReport(data) {
  const { videoId, reportedById, reason, description } = data;
  
  // Check if video exists
  const videoQuery = 'SELECT id, uploader_id FROM videos WHERE id = $1';
  const videoResult = await pool.query(videoQuery, [videoId]);
  
  if (videoResult.rows.length === 0) {
    throw new ApiError(404, 'Video not found');
  }
  
  const video = videoResult.rows[0];
  
  // Prevent users from reporting their own videos
  if (video.uploader_id === reportedById) {
    throw new ApiError(400, 'You cannot report your own video');
  }
  
  // Check if user already reported this video
  const hasReported = await VideoReportModel.hasUserReportedVideo(videoId, reportedById);
  
  if (hasReported) {
    throw new ApiError(409, 'You have already reported this video');
  }
  
  // Validate reason
  const validReasons = ['spam', 'harassment', 'hate', 'violence', 'nudity', 'copyright', 'misleading', 'other'];
  if (!validReasons.includes(reason)) {
    throw new ApiError(400, 'Invalid report reason');
  }
  
  // Create the report
  const report = await VideoReportModel.createVideoReport({
    videoId,
    reportedById,
    reason,
    description
  });
  
  return report;
}

/**
 * Get video report by ID (staff/admin only)
 */
export async function getVideoReportById(reportId) {
  const report = await VideoReportModel.getVideoReportById(reportId);
  
  if (!report) {
    throw new ApiError(404, 'Report not found');
  }
  
  return report;
}

/**
 * Get all video reports with filters (staff/admin only)
 */
export async function getAllVideoReports(filters) {
  const result = await VideoReportModel.getAllVideoReports(filters);
  return result;
}

/**
 * Resolve a video report (staff/admin only)
 */
export async function resolveVideoReport(reportId, action, reviewedById, note) {
  // Get the report
  const report = await VideoReportModel.getVideoReportById(reportId);
  
  if (!report) {
    throw new ApiError(404, 'Report not found');
  }
  
  if (report.status === 'resolved') {
    throw new ApiError(400, 'Report already resolved');
  }
  
  // Validate action
  const validActions = ['dismiss', 'warn_user', 'ban_user', 'delete_content'];
  if (!validActions.includes(action)) {
    throw new ApiError(400, 'Invalid action');
  }
  
  // Update report status
  const updatedReport = await VideoReportModel.updateVideoReportStatus(
    reportId,
    'resolved',
    reviewedById,
    note || `Action taken: ${action}`
  );
  
  // Perform the action based on the decision
  if (action === 'delete_content') {
    // Delete the video
    await pool.query('DELETE FROM videos WHERE id = $1', [report.video_id]);
  } else if (action === 'ban_user') {
    // Ban the video uploader
    await pool.query(
      'UPDATE users SET banned = true, ban_reason = $1, banned_at = CURRENT_TIMESTAMP WHERE id = $2',
      [`Reported video violated guidelines: ${report.reason}`, report.video_uploader_id]
    );
  } else if (action === 'warn_user') {
    // Increment warning count
    await pool.query(
      'UPDATE users SET warnings = warnings + 1 WHERE id = $1',
      [report.video_uploader_id]
    );
  }
  // If 'dismiss', no additional action needed
  
  return updatedReport;
}

export default {
  createVideoReport,
  getVideoReportById,
  getAllVideoReports,
  resolveVideoReport
};
