/**
 * Admin/User Management API Client
 * API calls for staff user management operations
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/v1';

// Types
export interface UserFilters {
  role?: 'admin' | 'staff' | 'user';
  banned?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UserStats {
  videos: number;
  followers: number;
  following: number;
}

export interface User {
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

export interface UsersResponse {
  users: User[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

/**
 * Get authentication headers with JWT token
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

/**
 * Get all users with optional filters
 */
export const getAllUsersApi = async (filters: UserFilters = {}): Promise<UsersResponse> => {
  const { role, banned, search, page = 1, limit = 100 } = filters;
  
  const params = new URLSearchParams();
  if (role) params.append('role', role);
  if (banned !== undefined) params.append('banned', banned.toString());
  if (search) params.append('search', search);
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  
  const response = await axios.get(
    `${API_BASE_URL}/staff/users?${params.toString()}`,
    getAuthHeaders()
  );
  
  return response.data.data;
};

/**
 * Ban a user
 */
export const banUserApi = async (username: string, reason: string, duration: number | null = null): Promise<User> => {
  const requestBody: { reason: string; duration?: number } = { reason };
  
  // Only include duration if it's a valid number
  if (duration !== null && duration > 0) {
    requestBody.duration = duration;
  }
  
  console.log('🚫 Banning user:', { username, requestBody });
  
  const response = await axios.put(
    `${API_BASE_URL}/staff/users/${username}/ban`,
    requestBody,
    getAuthHeaders()
  );
  
  return response.data.data;
};

/**
 * Unban a user
 */
export const unbanUserApi = async (username: string): Promise<User> => {
  const response = await axios.put(
    `${API_BASE_URL}/staff/users/${username}/unban`,
    {},
    getAuthHeaders()
  );
  
  return response.data.data;
};

/**
 * Warn a user
 */
export const warnUserApi = async (username: string, reason: string, duration: number = 7): Promise<User> => {
  const requestBody = {
    reason,
    duration: duration || 7 // Ensure duration is at least 7 if 0 or falsy
  };
  
  console.log('⚠️ Warning user:', { username, requestBody });
  
  const response = await axios.put(
    `${API_BASE_URL}/staff/users/${username}/warn`,
    requestBody,
    getAuthHeaders()
  );
  
  return response.data.data;
};

/**
 * Clear warnings for a user
 */
export const clearWarningsApi = async (username: string): Promise<User> => {
  const response = await axios.put(
    `${API_BASE_URL}/staff/users/${username}/clear-warnings`,
    {},
    getAuthHeaders()
  );
  
  return response.data.data;
};

/**
 * Get detailed video report information for staff review
 */
export const getVideoReportDetailsApi = async (videoId: string) => {
  const response = await axios.get(
    `${API_BASE_URL}/staff/video-report/${videoId}`,
    getAuthHeaders()
  );
  
  return response.data.data;
};

/**
 * Delete a video (staff only)
 */
export const deleteVideoApi = async (videoId: string): Promise<void> => {
  await axios.delete(
    `${API_BASE_URL}/staff/videos/${videoId}`,
    getAuthHeaders()
  );
};

export default {
  getAllUsersApi,
  banUserApi,
  unbanUserApi,
  warnUserApi,
  clearWarningsApi,
  getVideoReportDetailsApi,
  deleteVideoApi
};
