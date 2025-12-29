import apiClient from './client';

export interface DashboardStats {
  users: {
    total: number;
    staff: number;
    admins: number;
    banned: number;
  };
  videos: {
    total: number;
    uploadedToday: number;
    totalViews: number;
    views24h: number;
  };
  reports: {
    pending: number;
  };
  appeals: {
    pending: number;
  };
  system: {
    maintenanceMode: boolean;
    serviceMaintenanceMode: boolean;
    storage: {
      used: number;
      max: number;
      usedFormatted: string;
      maxFormatted: string;
      percentage: string;
    };
    uptime: string;
  };
}

export interface SystemLog {
  id: string;
  action: string;
  user: string;
  details: string;
  timestamp: string;
}

export interface DashboardSummaryResponse {
  success: boolean;
  data: {
    stats: DashboardStats;
    topVideos?: Array<{
      id: string;
      title: string;
      views: number;
      thumbnailUrl?: string;
      createdAt: string;
      uploader: {
        username: string;
        displayName?: string;
        avatarUrl?: string;
      };
    }>;
    reports?: {
      userReports: Array<{
        id: string;
        type: string;
        reason: string;
        createdAt: string;
        reportedUser?: string;
        reportedBy?: string;
      }>;
      videoReports: Array<{
        id: string;
        type: string;
        reason: string;
        createdAt: string;
        reportedVideo?: string;
        reportedBy?: string;
      }>;
    };
    appeals?: Array<{
      id: string;
      reason: string;
      createdAt: string;
      user: {
        username: string;
        displayName?: string;
        avatarUrl?: string;
      };
    }>;
    systemLogs?: SystemLog[];
  };
}

/**
 * Fetch admin dashboard summary data
 */
export const fetchDashboardSummaryApi = async (): Promise<DashboardSummaryResponse> => {
  const response = await apiClient.get<DashboardSummaryResponse>('/admin/dashboard/summary');
  return response.data;
};

// ==================== STAFF API ====================

export interface UserStats {
  videos: number;
  followers: number;
  following: number;
}

export interface StaffUser {
  id: string;
  username: string;
  email: string;
  role: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  banned: boolean;
  banExpiry?: string | null;
  banReason?: string | null;
  warnings: number;
  stats: UserStats;
  createdAt: string;
  updatedAt: string;
}

export interface StaffUsersResponse {
  users: StaffUser[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

/**
 * Get all users for staff management (Staff only)
 * Uses /staff/users endpoint
 */
export const getAllUsersApi = async (options?: {
  page?: number;
  limit?: number;
  role?: 'user' | 'staff' | 'admin';
  banned?: boolean;
  search?: string;
}): Promise<StaffUsersResponse> => {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', options.page.toString());
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.role) params.append('role', options.role);
  if (options?.banned !== undefined) params.append('banned', options.banned.toString());
  if (options?.search) params.append('search', options.search);

  const queryString = params.toString();
  const url = `/staff/users${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient.get(url);
  return response.data.data;
};

/**
 * Delete video by staff (soft delete)
 * @param videoId - Video ID to delete
 */
export const staffDeleteVideoApi = async (videoId: string): Promise<void> => {
  await apiClient.delete(`/staff/videos/${videoId}`);
};

/**
 * Ban user (Staff only) - Uses PUT /staff/users/:username/ban
 * @param username - Username to ban
 * @param reason - Reason for ban
 * @param duration - Duration in days (optional, null = permanent)
 */
export const staffBanUserApi = async (username: string, reason: string, duration?: number | null): Promise<StaffUser> => {
  const requestBody: { reason: string; duration?: number } = { reason };
  if (duration !== null && duration !== undefined && duration > 0) {
    requestBody.duration = duration;
  }
  const response = await apiClient.put(`/staff/users/${username}/ban`, requestBody);
  return response.data.data;
};

/**
 * Unban user (Staff only) - Uses PUT /staff/users/:username/unban
 * @param username - Username to unban
 */
export const staffUnbanUserApi = async (username: string): Promise<StaffUser> => {
  const response = await apiClient.put(`/staff/users/${username}/unban`, {});
  return response.data.data;
};

/**
 * Warn user (Staff only) - Uses PUT /staff/users/:username/warn
 * @param username - Username to warn
 * @param reason - Reason for warning
 * @param duration - Duration in days (default 7)
 */
export const staffWarnUserApi = async (username: string, reason: string, duration: number = 7): Promise<StaffUser> => {
  const response = await apiClient.put(`/staff/users/${username}/warn`, {
    reason,
    duration: duration || 7
  });
  return response.data.data;
};

/**
 * Clear warnings (Staff only) - Uses PUT /staff/users/:username/clear-warnings
 * @param username - Username to clear warnings
 */
export const staffClearWarningsApi = async (username: string): Promise<StaffUser> => {
  const response = await apiClient.put(`/staff/users/${username}/clear-warnings`, {});
  return response.data.data;
};

// ==================== ADMIN API ====================

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'staff' | 'user';
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  banned: boolean;
  banExpiry?: string;
  banReason?: string;
  warnings: number;
  isDemoted?: boolean;
  createdAt: string;
  updatedAt: string;
  videoCount: number;
}

export interface UsersListResponse {
  success: boolean;
  data: {
    users: User[];
    total: number;
  };
}

/**
 * Fetch all users (admin)
 */
export const fetchAllUsersApi = async (options?: {
  page?: number;
  limit?: number;
  role?: 'user' | 'staff' | 'admin';
  banned?: boolean;
  search?: string;
}): Promise<UsersListResponse> => {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', options.page.toString());
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.role) params.append('role', options.role);
  if (options?.banned !== undefined) params.append('banned', options.banned.toString());
  if (options?.search) params.append('search', options.search);

  const queryString = params.toString();
  const url = `/admin/users${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient.get<UsersListResponse>(url);
  // Backend returns { success: true, data: { users, total } }
  // So response.data is already the full object
  return response.data;
};

export interface StaffListResponse {
  success: boolean;
  data: {
    staff: User[];
  };
}

/**
 * Get all staff members with optional filter
 * @param isDemoted - Filter by is_demoted status (undefined = all)
 */
export const getStaffMembersApi = async (isDemoted?: boolean): Promise<StaffListResponse> => {
  const params = new URLSearchParams();
  if (isDemoted !== undefined) {
    params.append('isDemoted', isDemoted.toString());
  }
  const queryString = params.toString();
  const url = `/admin/staff${queryString ? `?${queryString}` : ''}`;
  const response = await apiClient.get<StaffListResponse>(url);
  return response.data;
};

export interface UserResponse {
  success: boolean;
  data: {
    user: User;
  };
}

/**
 * Promote user to staff or reactivate demoted staff
 * @param username - Username to promote
 */
export const promoteStaffApi = async (username: string): Promise<UserResponse> => {
  const response = await apiClient.post<UserResponse>(`/admin/staff/${username}/promote`);
  return response.data;
};

/**
 * Create new staff account
 * @param staffData - Staff account data
 */
export const createStaffApi = async (staffData: {
  username: string;
  password: string;
}): Promise<UserResponse> => {
  const response = await apiClient.post<UserResponse>('/admin/staff/create', staffData);
  return response.data;
};

/**
 * Demote staff (set is_demoted flag)
 * @param username - Username of staff to demote
 */
export const demoteStaffApi = async (username: string): Promise<UserResponse> => {
  const response = await apiClient.put<UserResponse>(`/admin/staff/${username}/demote`);
  return response.data;
};

/**
 * Delete staff account permanently (only if is_demoted = true)
 * @param username - Username of staff to delete
 */
export const deleteStaffAccountApi = async (username: string): Promise<void> => {
  await apiClient.delete(`/admin/staff/${username}`);
};

/**
 * Delete video (soft delete - set status to 'deleted')
 * @param videoId - Video ID to delete
 */
export const deleteVideoApi = async (videoId: string): Promise<void> => {
  await apiClient.delete(`/videos/${videoId}`);
};

/**
 * Get video report details for review (Staff/Admin only)
 * @param videoId - Video ID to get report details
 */
export const getVideoReportDetailsApi = async (videoId: string): Promise<any> => {
  const response = await apiClient.get(`/staff/video-report/${videoId}`);
  return response.data.data;
};

/**
 * Ban user account
 * @param username - Username to ban
 * @param reason - Reason for ban
 * @param durationDays - Duration in days (optional, null = permanent)
 */
export const banUserApi = async (username: string, reason: string, durationDays?: number): Promise<UserResponse> => {
  const response = await apiClient.post<UserResponse>(`/admin/users/${username}/ban`, {
    reason,
    durationDays: durationDays || null
  });
  return response.data;
};

/**
 * Unban user account
 * @param username - Username to unban
 */
export const unbanUserApi = async (username: string): Promise<UserResponse> => {
  const response = await apiClient.post<UserResponse>(`/admin/users/${username}/unban`);
  return response.data;
};

/**
 * Clear user warnings
 * @param username - Username to clear warnings
 */
export const clearWarningsApi = async (username: string): Promise<UserResponse> => {
  const response = await apiClient.post<UserResponse>(`/admin/users/${username}/clear-warnings`);
  return response.data;
};

/**
 * Warn user account
 * @param username - Username to warn
 * @param reason - Reason for warning
 * @param durationDays - Duration in days (optional, default based on warning count)
 */
export const warnUserApi = async (username: string, reason: string, durationDays?: number): Promise<UserResponse> => {
  const response = await apiClient.post<UserResponse>(`/admin/users/${username}/warn`, {
    reason,
    durationDays: durationDays || null
  });
  return response.data;
};

/**
 * Delete user account permanently
 * @param username - Username to delete
 */
export const deleteUserApi = async (username: string): Promise<UserResponse> => {
  const response = await apiClient.delete<UserResponse>(`/admin/users/${username}`);
  return response.data;
};

export interface SystemLogsResponse {
  success: boolean;
  data: {
    logs: SystemLog[];
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  };
}

/**
 * Fetch system logs with pagination
 * @param options - Query options
 */
export const fetchSystemLogsApi = async (options?: {
  page?: number;
  limit?: number;
  actionType?: string;
}): Promise<SystemLogsResponse> => {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', options.page.toString());
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.actionType) params.append('actionType', options.actionType);

  const queryString = params.toString();
  const url = `/admin/system-logs${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient.get<SystemLogsResponse>(url);
  return response.data;
};

export interface AnalyticsStats {
  totalViews: {
    current: number;
    previous: number;
    change: number; // percentage change
  };
  videosUploaded: {
    current: number;
    previous: number;
    change: number; // percentage change
  };
  activeUsers: {
    current: number;
    previous: number;
    change: number; // percentage change
  };
  averageWatchTime: {
    current: number; // in seconds
    previous: number; // in seconds
    change: number; // percentage change
  };
  engagementRate: {
    current: number; // percentage
    previous: number; // percentage
    change: number; // percentage change
  };
  topVideos: Array<{
    id: string;
    title: string;
    views: number;
    thumbnailUrl?: string;
    createdAt: string;
    uploader: {
      username: string;
      displayName?: string;
      avatarUrl?: string;
    };
  }>;
}

export interface AnalyticsResponse {
  success: boolean;
  data: AnalyticsStats;
}

/**
 * Fetch analytics statistics
 */
export const fetchAnalyticsApi = async (): Promise<AnalyticsResponse> => {
  const response = await apiClient.get<AnalyticsResponse>('/admin/analytics');
  return response.data;
};

export interface MaintenanceModeResponse {
  success: boolean;
  data: {
    maintenanceMode: boolean;
  };
}

/**
 * Toggle system maintenance mode
 * @param enabled - True to enable, false to disable
 */
export const toggleMaintenanceModeApi = async (enabled: boolean): Promise<MaintenanceModeResponse> => {
  const response = await apiClient.put<MaintenanceModeResponse>('/admin/settings/maintenance-mode', {
    enabled
  });
  return response.data;
};

/**
 * Toggle service maintenance mode
 * @param enabled - True to enable, false to disable
 */
export const toggleServiceMaintenanceModeApi = async (enabled: boolean): Promise<MaintenanceModeResponse> => {
  const response = await apiClient.put<MaintenanceModeResponse>('/admin/settings/service-maintenance-mode', {
    enabled
  });
  return response.data;
};

export interface GeneralSettings {
  siteName: string;
  maxUploadSizeMB: number;
  maxVideoDurationSeconds: number;
}

export interface GeneralSettingsResponse {
  success: boolean;
  data: GeneralSettings;
}

/**
 * Fetch general settings
 */
export const fetchGeneralSettingsApi = async (): Promise<GeneralSettingsResponse> => {
  const response = await apiClient.get<GeneralSettingsResponse>('/admin/settings/general');
  return response.data;
};

/**
 * Update general settings
 * @param settings - General settings object
 */
export const updateGeneralSettingsApi = async (settings: GeneralSettings): Promise<GeneralSettingsResponse> => {
  const response = await apiClient.put<GeneralSettingsResponse>('/admin/settings/general', settings);
  return response.data;
};

