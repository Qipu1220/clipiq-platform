// API functions for explorer feature
import axios, { AxiosInstance, AxiosError } from 'axios';

// Get API URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

import { Video } from './videos';

export interface ExplorerResponse {
  success: boolean;
  data: {
    videos: Video[];
    pagination?: {
      total: number;
      page: number;
      pages: number;
      limit?: number;
      hasMore?: boolean;
    };
  };
}

/**
 * Fetch explorer/discovery videos with weighted scoring
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 20, max: 50)
 * @param sort - Sort type: 'weighted' (default), 'fresh', 'random'
 * @param options - Additional options
 * @param options.excludeWatched - Exclude videos user has watched (requires auth)
 * @param options.seed - Random seed for consistent pagination (omit for max variety)
 */
export const fetchExplorerVideosApi = async (
  page: number = 1, 
  limit: number = 20,
  sort: 'weighted' | 'fresh' | 'random' = 'weighted',
  options?: {
    excludeWatched?: boolean;
    seed?: number;
  }
): Promise<ExplorerResponse> => {
  const params: any = { page, limit, sort };
  
  if (options?.excludeWatched) {
    params.excludeWatched = 'true';
  }
  
  // If seed is provided, use it for consistent pagination
  // If omitted, backend will generate new random seed each time (max variety)
  if (options?.seed !== undefined) {
    params.seed = options.seed;
  }
  
  const response = await apiClient.get<ExplorerResponse>('/explorer', { params });
  return response.data;
};

/**
 * Fetch explorer statistics
 * Useful for debugging and analytics
 */
export const fetchExplorerStatsApi = async (): Promise<{
  success: boolean;
  data: {
    totalVideos: number;
    videos24h: number;
    videos7d: number;
    totalViews: number;
    avgViews: number;
  };
}> => {
  const response = await apiClient.get('/explorer/stats');
  return response.data;
};

export default {
  fetchExplorerVideosApi,
  fetchExplorerStatsApi
};
