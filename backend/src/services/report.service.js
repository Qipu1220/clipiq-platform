/**
 * Report Service
 * Business logic for handling reports (videos, users, comments)
 */

import * as VideoReportModel from '../models/VideoReport.js';
import * as UserReportModel from '../models/UserReport.js';
import * as CommentReportModel from '../models/CommentReport.js';
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
  
  // Check if user already has a pending report for this video
  const hasReported = await VideoReportModel.hasUserReportedVideo(videoId, reportedById);
  
  if (hasReported) {
    throw new ApiError(409, 'You already have a pending report for this video');
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
    // Delete the video (soft delete - set status to 'deleted')
    await pool.query("UPDATE videos SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [report.video_id]);
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

/**
 * Create a user report
 */
export async function createUserReport(data) {
  const { reportedUserId, reportedById, reason, description } = data;
  
  // Check if reported user exists
  const userQuery = 'SELECT id, username FROM users WHERE id = $1';
  const userResult = await pool.query(userQuery, [reportedUserId]);
  
  if (userResult.rows.length === 0) {
    throw new ApiError(404, 'User not found');
  }
  
  // Prevent users from reporting themselves
  if (reportedUserId === reportedById) {
    throw new ApiError(400, 'You cannot report yourself');
  }
  
  // Check if user already has a pending report for this user
  const hasReported = await UserReportModel.hasUserReportedUser(reportedUserId, reportedById);
  
  if (hasReported) {
    throw new ApiError(409, 'You already have a pending report for this user');
  }
  
  // Validate reason
  const validReasons = ['spam', 'harassment', 'hate', 'violence', 'nudity', 'impersonation', 'fake_account', 'other'];
  if (!validReasons.includes(reason)) {
    throw new ApiError(400, 'Invalid report reason');
  }
  
  // Create the report
  const report = await UserReportModel.createUserReport({
    reportedUserId,
    reportedById,
    reason,
    description
  });
  
  return report;
}

/**
 * Get user report by ID (staff/admin only)
 */
export async function getUserReportById(reportId) {
  const report = await UserReportModel.getUserReportById(reportId);
  
  if (!report) {
    throw new ApiError(404, 'Report not found');
  }
  
  return report;
}

/**
 * Get all user reports with filters (staff/admin only)
 */
export async function getAllUserReports(filters) {
  const result = await UserReportModel.getAllUserReports(filters);
  return result;
}

/**
 * Resolve a user report (staff/admin only)
 */
export async function resolveUserReport(reportId, action, reviewedById, note) {
  // Get the report
  const report = await UserReportModel.getUserReportById(reportId);
  
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
  const updatedReport = await UserReportModel.updateUserReportStatus(
    reportId,
    'resolved',
    reviewedById,
    note || `Action taken: ${action}`
  );
  
  // Perform the action based on the decision
  if (action === 'ban_user') {
    // Ban the reported user
    await pool.query(
      'UPDATE users SET banned = true, ban_reason = $1, banned_at = CURRENT_TIMESTAMP WHERE id = $2',
      [`User behavior violated guidelines: ${report.reason}`, report.reported_user_id]
    );
  } else if (action === 'warn_user') {
    // Increment warning count
    await pool.query(
      'UPDATE users SET warnings = warnings + 1 WHERE id = $1',
      [report.reported_user_id]
    );
  } else if (action === 'delete_content') {
    // Delete all videos by the reported user
    await pool.query('DELETE FROM videos WHERE uploader_id = $1', [report.reported_user_id]);
  }
  // If 'dismiss', no additional action needed
  
  return updatedReport;
}

/**
 * Create a comment report
 */
export async function createCommentReport(data) {
  const { commentId, reportedById, reason, description } = data;
  
  // Check if comment exists
  const commentQuery = 'SELECT id, user_id FROM comments WHERE id = $1';
  const commentResult = await pool.query(commentQuery, [commentId]);
  
  if (commentResult.rows.length === 0) {
    throw new ApiError(404, 'Comment not found');
  }
  
  const comment = commentResult.rows[0];
  
  // Prevent users from reporting their own comments
  if (comment.user_id === reportedById) {
    throw new ApiError(400, 'You cannot report your own comment');
  }
  
  // Check if user already has a pending report for this comment
  const hasReported = await CommentReportModel.hasUserReportedComment(commentId, reportedById);
  
  if (hasReported) {
    throw new ApiError(409, 'You already have a pending report for this comment');
  }
  
  // Validate reason
  const validReasons = ['spam', 'harassment', 'hate_speech', 'violence_threat', 'sexual_content', 'misinformation', 'impersonation', 'off_topic', 'other'];
  const reasonType = reason.split(':')[0].trim(); // Extract type from "type: details"
  
  if (!validReasons.includes(reasonType)) {
    throw new ApiError(400, 'Invalid report reason');
  }
  
  // Create the report
  const report = await CommentReportModel.createCommentReport({
    commentId,
    reportedById,
    reason,
    description
  });
  
  return report;
}

/**
 * Get comment report by ID (staff/admin only)
 */
export async function getCommentReportById(reportId) {
  const report = await CommentReportModel.getCommentReportById(reportId);
  
  if (!report) {
    throw new ApiError(404, 'Report not found');
  }
  
  return report;
}

/**
 * Get all comment reports with filters (staff/admin only)
 */
export async function getAllCommentReports(filters) {
  const result = await CommentReportModel.getAllCommentReports(filters);
  return result;
}

/**
 * Resolve a comment report (staff/admin only)
 */
export async function resolveCommentReport(reportId, action, reviewedById, note) {
  // Get the report
  const report = await CommentReportModel.getCommentReportById(reportId);
  
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
  const updatedReport = await CommentReportModel.updateCommentReportStatus(
    reportId,
    'resolved',
    reviewedById,
    note || `Action taken: ${action}`
  );
  
  // TODO: Execute the action (warn, ban, delete comment)
  // This will be implemented when we add staff/admin features
  
  return updatedReport;
}

/**
 * Get detailed video report information for staff review
 */
export async function getVideoReportDetailsService(videoId) {
  const details = await VideoReportModel.getVideoReportDetails(videoId);
  
  if (!details) {
    throw new ApiError(404, 'Video not found');
  }
  
  return details;
}

export default {
  createVideoReport,
  getVideoReportById,
  getAllVideoReports,
  resolveVideoReport,
  getVideoReportDetailsService,
  createUserReport,
  getUserReportById,
  getAllUserReports,
  resolveUserReport,
  createCommentReport,
  getCommentReportById,
  getAllCommentReports,
  resolveCommentReport
};
