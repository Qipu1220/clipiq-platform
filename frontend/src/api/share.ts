// API functions for video sharing
import axios, { AxiosInstance } from 'axios';

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

// Share types
export type ShareType = 
  | 'link'        // Copy link
  | 'facebook'    // Share to Facebook
  | 'twitter'     // Share to Twitter/X
  | 'whatsapp'    // Share to WhatsApp
  | 'telegram'    // Share to Telegram
  | 'reddit'      // Share to Reddit
  | 'linkedin'    // Share to LinkedIn
  | 'email'       // Share via email
  | 'embed'       // Embed code
  | 'qr'          // QR code
  | 'other';      // Other methods

export interface ShareResponse {
  success: boolean;
  message: string;
  data: {
    shareId: string;
    shareType: ShareType;
    sharesCount: number;
    sharedAt: string;
  };
}

export interface VideoSharesResponse {
  success: boolean;
  data: {
    videoId: string;
    videoTitle: string;
    totalShares: number;
    sharesByType: Array<{
      type: ShareType;
      count: number;
      lastShared: string;
    }>;
    recentShares: Array<{
      id: string;
      type: ShareType;
      sharedBy: string;
      displayName?: string;
      sharedAt: string;
    }>;
  };
}

export interface MySharesResponse {
  success: boolean;
  data: {
    videos: Array<any>; // Video type from videos.ts
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasMore: boolean;
    };
  };
}

export interface ShareAnalyticsResponse {
  success: boolean;
  data: {
    period: string;
    summary: {
      totalShares: number;
      videosShared: number;
      usersWhoShared: number;
      anonymousShares: number;
    };
    sharesByType: Array<{
      type: ShareType;
      count: number;
      percentage: number;
    }>;
    topSharedVideos: Array<{
      videoId: string;
      title: string;
      shareCount: number;
      uploader: string;
    }>;
  };
}

/**
 * Share a video
 * @param videoId - Video ID
 * @param shareType - Type of share (link, facebook, twitter, etc.)
 * @param token - Optional authentication token
 */
export const shareVideoApi = async (
  videoId: string,
  shareType: ShareType = 'link',
  token?: string
): Promise<ShareResponse> => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  
  const response = await apiClient.post<ShareResponse>(
    `/videos/${videoId}/share`,
    { share_type: shareType },
    { headers }
  );
  
  return response.data;
};

/**
 * Get share statistics for a video
 * @param videoId - Video ID
 */
export const getVideoSharesApi = async (
  videoId: string
): Promise<VideoSharesResponse> => {
  const response = await apiClient.get<VideoSharesResponse>(
    `/videos/${videoId}/shares`
  );
  return response.data;
};

/**
 * Get videos shared by current user
 * @param page - Page number
 * @param limit - Items per page
 * @param token - Authentication token (required)
 */
export const getMySharesApi = async (
  page: number = 1,
  limit: number = 20,
  token: string
): Promise<MySharesResponse> => {
  const response = await apiClient.get<MySharesResponse>(
    '/shares/my-shares',
    {
      params: { page, limit },
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.data;
};

/**
 * Get share analytics
 * @param period - Time period (24h, 7d, 30d, all)
 * @param token - Authentication token (required - admin)
 */
export const getShareAnalyticsApi = async (
  period: '24h' | '7d' | '30d' | 'all' = '7d',
  token: string
): Promise<ShareAnalyticsResponse> => {
  const response = await apiClient.get<ShareAnalyticsResponse>(
    '/shares/analytics',
    {
      params: { period },
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.data;
};

/**
 * Helper: Generate share URL for different platforms
 * @param videoId - Video ID
 * @param shareType - Platform to share to
 */
export const generateShareUrl = (
  videoId: string,
  shareType: ShareType
): string => {
  const baseUrl = window.location.origin;
  const videoUrl = `${baseUrl}/video/${videoId}`;
  const encodedUrl = encodeURIComponent(videoUrl);
  
  switch (shareType) {
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    
    case 'twitter':
      return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=Check%20out%20this%20video!`;
    
    case 'whatsapp':
      return `https://wa.me/?text=${encodedUrl}`;
    
    case 'telegram':
      return `https://t.me/share/url?url=${encodedUrl}`;
    
    case 'reddit':
      return `https://reddit.com/submit?url=${encodedUrl}`;
    
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    
    case 'email':
      return `mailto:?subject=Check%20out%20this%20video&body=${encodedUrl}`;
    
    case 'link':
    default:
      return videoUrl;
  }
};

/**
 * Helper: Copy link to clipboard and record share
 * @param videoId - Video ID
 * @param token - Optional authentication token
 */
export const copyVideoLink = async (
  videoId: string,
  token?: string
): Promise<{ success: boolean; url: string }> => {
  const videoUrl = generateShareUrl(videoId, 'link');
  
  try {
    // Copy to clipboard
    await navigator.clipboard.writeText(videoUrl);
    
    // Record share
    await shareVideoApi(videoId, 'link', token);
    
    return { success: true, url: videoUrl };
  } catch (error) {
    console.error('Failed to copy link:', error);
    throw error;
  }
};

export default {
  shareVideoApi,
  getVideoSharesApi,
  getMySharesApi,
  getShareAnalyticsApi,
  generateShareUrl,
  copyVideoLink
};
