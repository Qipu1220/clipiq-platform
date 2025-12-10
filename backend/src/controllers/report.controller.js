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
  
  res.status(201).json(
    successResponse(
      { reportId: report.id },
      'Report submitted successfully'
    )
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
  
  res.json(
    successResponse({
      reports: result.reports,
      total: result.total,
      pagination: {
        page: result.page,
        pages: result.pages,
        total: result.total
      }
    })
  );
});

/**
 * GET /api/v1/reports/videos/:id - Get video report by ID (Staff/Admin only)
 */
export const getVideoReportById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const report = await ReportService.getVideoReportById(id);
  
  res.json(successResponse(report));
});

/**
 * PUT /api/v1/reports/videos/:id/resolve - Resolve a video report (Staff/Admin only)
 */
export const resolveVideoReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, note } = req.body;
  const reviewedById = req.user.userId; // Đúng field từ auth middleware
  
  const report = await ReportService.resolveVideoReport(id, action, reviewedById, note);
  
  res.json(
    successResponse(
      {
        reportId: report.id,
        status: report.status,
        action
      },
      'Report resolved successfully'
    )
  );
});

export default {
  reportVideo,
  getVideoReports,
  getVideoReportById,
  resolveVideoReport
};
