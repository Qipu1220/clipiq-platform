/**
 * Reports API
 * Handles report-related API calls
 */

import apiClient from './client';

// Types
export interface VideoReport {
  id: string;
  video_id: string;
  reported_by_id: string;
  reason: string;
  evidence_url: string | null;
  status: 'pending' | 'reviewed' | 'resolved';
  reviewed_by_id: string | null;
  reviewed_at: string | null;
  resolution_note: string | null;
  created_at: string;
  video_title?: string;
  video_url?: string;
  reporter_username?: string;
  reporter_display_name?: string;
  uploader_username?: string;
  uploader_display_name?: string;
}

export interface UserReport {
  id: string;
  reported_user_id: string;
  reported_by_id: string;
  reason: string;
  evidence_url: string | null;
  status: 'pending' | 'reviewed' | 'resolved';
  reviewed_by_id: string | null;
  reviewed_at: string | null;
  resolution_note: string | null;
  created_at: string;
  reported_username?: string;
  reported_display_name?: string;
  reported_avatar_url?: string;
  reporter_username?: string;
  reporter_display_name?: string;
  reviewer_username?: string;
}

export interface VideoReportsResponse {
  success: boolean;
  data: {
    reports: VideoReport[];
    total: number;
    pagination: {
      page: number;
      pages: number;
      total: number;
    };
  };
}

export interface UserReportsResponse {
  success: boolean;
  data: {
    reports: UserReport[];
    total: number;
    pagination: {
      page: number;
      pages: number;
      total: number;
    };
  };
}

export interface SingleUserReportResponse {
  success: boolean;
  data: UserReport;
}

export interface SingleVideoReportResponse {
  success: boolean;
  data: VideoReport;
}

export interface ResolveReportResponse {
  success: boolean;
  data: {
    reportId: string;
    status: string;
    action: string;
  };
  message: string;
}

/**
 * Report a video (User)
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
export const getVideoReportsApi = async (
  status?: string, 
  page: number = 1, 
  limit: number = 20
): Promise<VideoReportsResponse> => {
  const response = await apiClient.get<VideoReportsResponse>('/reports/videos', {
    params: { status, page, limit }
  });
  
  return response.data;
};

/**
 * Get video report by ID (Staff/Admin only)
 */
export const getVideoReportByIdApi = async (reportId: string): Promise<SingleVideoReportResponse> => {
  const response = await apiClient.get<SingleVideoReportResponse>(`/reports/videos/${reportId}`);
  
  return response.data;
};

/**
 * Resolve a video report (Staff/Admin only)
 * @param reportId - UUID of the report
 * @param action - Action to take: 'dismiss' | 'warn_user' | 'ban_user' | 'delete_content'
 * @param note - Optional note explaining the resolution
 */
export const resolveVideoReportApi = async (
  reportId: string, 
  action: 'dismiss' | 'warn_user' | 'ban_user' | 'delete_content', 
  note?: string
): Promise<ResolveReportResponse> => {
  const response = await apiClient.put<ResolveReportResponse>(
    `/reports/videos/${reportId}/resolve`, 
    { action, note }
  );
  
  return response.data;
};

/**
 * Report a user (User)
 */
export const reportUserApi = async (username: string, reason: string, description?: string) => {
  const response = await apiClient.post('/reports/users', {
    username,
    reason,
    description
  });
  
  return response.data;
};

/**
 * Get all user reports (Staff/Admin only)
 */
export const getUserReportsApi = async (
  status?: string, 
  page: number = 1, 
  limit: number = 20
): Promise<UserReportsResponse> => {
  const response = await apiClient.get<UserReportsResponse>('/reports/users', {
    params: { status, page, limit }
  });
  
  return response.data;
};

/**
 * Get user report by ID (Staff/Admin only)
 */
export const getUserReportByIdApi = async (reportId: string): Promise<SingleUserReportResponse> => {
  const response = await apiClient.get<SingleUserReportResponse>(`/reports/users/${reportId}`);
  
  return response.data;
};

/**
 * Resolve a user report (Staff/Admin only)
 * @param reportId - UUID of the report
 * @param action - Action to take: 'dismiss' | 'warn_user' | 'ban_user' | 'delete_content'
 * @param note - Optional note explaining the resolution
 */
export const resolveUserReportApi = async (
  reportId: string, 
  action: 'dismiss' | 'warn_user' | 'ban_user' | 'delete_content', 
  note?: string
): Promise<ResolveReportResponse> => {
  const response = await apiClient.put<ResolveReportResponse>(
    `/reports/users/${reportId}/resolve`, 
    { action, note }
  );
  
  return response.data;
};

export default {
  reportVideoApi,
  getVideoReportsApi,
  getVideoReportByIdApi,
  resolveVideoReportApi,
  reportUserApi,
  getUserReportsApi,
  getUserReportByIdApi,
  resolveUserReportApi
};
