/**
 * Reports API
 * Handles report-related API calls
 */

import apiClient from './client';

/**
 * Report a video
 */
export const reportVideoApi = async (videoId: string, reason: string, description?: string) => {
  const response = await apiClient.post('/reports/videos', {
    videoId,
    reason,
    description
  });
  
  return response.data;
};

/**
 * Get all video reports (Staff/Admin only)
 */
export const getVideoReportsApi = async (status?: string, page: number = 1, limit: number = 20) => {
  const response = await apiClient.get('/reports/videos', {
    params: { status, page, limit }
  });
  
  return response.data;
};

/**
 * Get video report by ID (Staff/Admin only)
 */
export const getVideoReportByIdApi = async (reportId: string) => {
  const response = await apiClient.get(`/reports/videos/${reportId}`);
  
  return response.data;
};

/**
 * Resolve a video report (Staff/Admin only)
 */
export const resolveVideoReportApi = async (reportId: string, action: string, note?: string) => {
  const response = await apiClient.put(`/reports/videos/${reportId}/resolve`, {
    action,
    note
  });
  
  return response.data;
};

export default {
  reportVideoApi,
  getVideoReportsApi,
  getVideoReportByIdApi,
  resolveVideoReportApi
};
