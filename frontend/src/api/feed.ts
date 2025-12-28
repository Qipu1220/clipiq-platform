import apiClient from './client';
import { getSessionId } from '../utils/sessionManager';

export interface FeedVideo {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  video_url: string;
  duration: number;
  views: number;
  upload_date: string;
  status: string;
  uploader_id: string;
  uploader_username: string;
  uploader_display_name: string;
  uploader_avatar: string;
  likes_count: number;
  comments_count: number;
  impression_id: string;
  position: number;
  source: 'personal' | 'trending' | 'fresh';
}

export interface FeedResponse {
  success: boolean;
  data: {
    items: FeedVideo[];
    total: number;
    has_profile: boolean;
    session_id: string;
  };
}

/**
 * Get personalized feed (requires authentication)
 */
export const getPersonalFeed = async (limit: number = 20): Promise<FeedResponse> => {
  const sessionId = getSessionId();
  
  const response = await apiClient.get<FeedResponse>('/feed/personal', {
    params: {
      session_id: sessionId,
      limit
    }
  });
  
  return response.data;
};

/**
 * Get trending feed (no authentication required)
 */
export const getTrendingFeed = async (limit: number = 20): Promise<FeedResponse> => {
  const sessionId = getSessionId();
  
  const response = await apiClient.get<FeedResponse>('/feed/trending', {
    params: {
      session_id: sessionId,
      limit
    }
  });
  
  return response.data;
};
