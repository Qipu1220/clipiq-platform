/**
 * Report Controller
 * Handles report-related operations: video reports, user reports, appeals
 */

import * as ReportService from '../services/report.service.js';
import ApiError from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';

/**
 * POST /api/v1/reports/videos - Report a video
 */
export const reportVideo = asyncHandler(async (req, res) => {
  const { videoId, reason, description } = req.body;
  const reportedById = req.user.userId; // Đúng field từ auth middleware
  
  const report = await ReportService.createVideoReport({
    videoId,
    reportedById,
    reason,
    description
  });
  
  return successResponse(
    res.status(201),
    { reportId: report.id },
    'Report submitted successfully'
  );
});

/**
 * GET /api/v1/reports/videos - Get all video reports (Staff/Admin only)
 */
export const getVideoReports = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  
  const filters = {
    status,
    page: parseInt(page),
    limit: Math.min(parseInt(limit), 100)
  };
  
  const result = await ReportService.getAllVideoReports(filters);
  
  return successResponse(res, {
    reports: result.reports,
    total: result.total,
    pagination: {
      page: result.page,
      pages: result.pages,
      total: result.total
    }
  });
});

/**
 * GET /api/v1/reports/videos/:id - Get video report by ID (Staff/Admin only)
 */
export const getVideoReportById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const report = await ReportService.getVideoReportById(id);
  
  return successResponse(res, report);
});
/**
 * PUT /api/v1/reports/videos/:id/resolve - Resolve a video report (Staff/Admin only)
 */
export const resolveVideoReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, note } = req.body;
  const reviewedById = req.user.userId; // Đúng field từ auth middleware
  
  const report = await ReportService.resolveVideoReport(id, action, reviewedById, note);
  
  return successResponse(
    res,
    {
      reportId: report.id,
      status: report.status,
      action
    },
    'Report resolved successfully'
  );
});

/**
 * POST /api/v1/reports/users - Report a user
 */
export const reportUser = asyncHandler(async (req, res) => {
  const { username, reason, description } = req.body;
  const reportedById = req.user.userId;
  
  // Get reported user ID from username
  const userQuery = 'SELECT id FROM users WHERE username = $1';
  const { rows } = await import('../config/database.js').then(m => m.default.query(userQuery, [username]));
  
  if (rows.length === 0) {
    throw new ApiError(404, 'User not found');
  }
  
  const reportedUserId = rows[0].id;
  
  const report = await ReportService.createUserReport({
    reportedUserId,
    reportedById,
    reason,
    description
  });
  
  return successResponse(
    res.status(201),
    { reportId: report.id },
    'Report submitted successfully'
  );
});

/**
 * GET /api/v1/reports/users - Get all user reports (Staff/Admin only)
 */
export const getUserReports = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  
  const filters = {
    status,
    page: parseInt(page),
    limit: Math.min(parseInt(limit), 100)
  };
  
  const result = await ReportService.getAllUserReports(filters);
  
  return successResponse(res, {
    reports: result.reports,
    total: result.total,
    pagination: {
      page: result.page,
      pages: result.pages,
      total: result.total
    }
  });
});

/**
 * GET /api/v1/reports/users/:id - Get user report by ID (Staff/Admin only)
 */
export const getUserReportById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const report = await ReportService.getUserReportById(id);
  
  return successResponse(res, report);
});

/**
 * PUT /api/v1/reports/users/:id/resolve - Resolve a user report (Staff/Admin only)
 */
export const resolveUserReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, note } = req.body;
  const reviewedById = req.user.userId;
  
  const report = await ReportService.resolveUserReport(id, action, reviewedById, note);
  
  return successResponse(
    res,
    {
      reportId: report.id,
      status: report.status,
      action
    },
    'Report resolved successfully'
  );
});

/**
 * POST /api/v1/reports/comments - Report a comment
 */
export const reportComment = asyncHandler(async (req, res) => {
  const { commentId, reason, description } = req.body;
  const reportedById = req.user.userId;
  
  const report = await ReportService.createCommentReport({
    commentId,
    reportedById,
    reason,
    description
  });
  
  return successResponse(
    res.status(201),
    { reportId: report.id },
    'Comment report submitted successfully'
  );
});

/**
 * GET /api/v1/reports/comments - Get all comment reports (Staff/Admin only)
 */
export const getCommentReports = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  
  const filters = {
    status,
    page: parseInt(page),
    limit: Math.min(parseInt(limit), 100)
  };
  
  const result = await ReportService.getAllCommentReports(filters);
  
  return successResponse(res, {
    reports: result.reports,
    total: result.total,
    pagination: {
      page: result.page,
      pages: result.pages,
      total: result.total
    }
  });
});

/**
 * GET /api/v1/reports/comments/:id - Get comment report by ID (Staff/Admin only)
 */
export const getCommentReportById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const report = await ReportService.getCommentReportById(id);
  
  return successResponse(res, report);
});

/**
 * PUT /api/v1/reports/comments/:id/resolve - Resolve comment report (Staff/Admin only)
 */
export const resolveCommentReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, note } = req.body;
  const reviewedById = req.user.userId;
  
  const updatedReport = await ReportService.resolveCommentReport(
    id,
    action,
    reviewedById,
    note
  );
  
  return successResponse(
    res,
    updatedReport,
    'Comment report resolved successfully'
  );
});

export default {
  reportVideo,
  getVideoReports,
  getVideoReportById,
  resolveVideoReport,
  reportUser,
  getUserReports,
  getUserReportById,
  resolveUserReport,
  reportComment,
  getCommentReports,
  getCommentReportById,
  resolveCommentReport
};
