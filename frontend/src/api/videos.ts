import apiClient from './client';

export interface Video {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  views: number;
  likes: number; // likes count from backend
  comments: number;
  uploaderUsername: string;
  uploaderDisplayName?: string;
  uploaderAvatarUrl?: string;
  uploadDate: number;
  createdAt?: string;
  updatedAt?: string;
  isLiked?: boolean; // whether current user liked this video
}

export interface VideoResponse {
  success: boolean;
  data: {
    videos: Video[];
    pagination?: {
      total: number;
      page: number;
      pages: number;
    };
  };
}

export interface SingleVideoResponse {
  success: boolean;
  data: Video;
}

// Fetch videos (For You feed)
export const fetchVideosApi = async (page: number = 1, limit: number = 10, username?: string): Promise<VideoResponse> => {
  console.log(`🌍 fetchVideosApi called with page=${page}, limit=${limit}, username=${username}`);
  const response = await apiClient.get<VideoResponse>('/videos', {
    params: { page, limit, username }
  });
  console.log(`✅ fetchVideosApi response:`, response.data);
  return response.data;
};

// Fetch single video
export const fetchVideoByIdApi = async (videoId: string): Promise<SingleVideoResponse> => {
  const response = await apiClient.get<SingleVideoResponse>(`/videos/${videoId}`);
  return response.data;
};

// Search videos
export const searchVideosApi = async (query: string, page: number = 1): Promise<VideoResponse> => {
  const response = await apiClient.get<VideoResponse>('/videos/search', {
    params: { q: query, page }
  });
  return response.data;
};

// Get trending videos
export const getTrendingVideosApi = async (): Promise<VideoResponse> => {
  const response = await apiClient.get<VideoResponse>('/videos/trending');
  return response.data;
};

// Like video
export const likeVideoApi = async (videoId: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post<{ success: boolean; message: string }>(`/videos/${videoId}/like`);
  return response.data;
};

// Unlike video
export const unlikeVideoApi = async (videoId: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.delete<{ success: boolean; message: string }>(`/videos/${videoId}/like`);
  return response.data;
};

export interface Comment {
  id: string;
  text: string;
  userId: string;
  username: string;
  userDisplayName?: string;
  userAvatarUrl?: string;
  createdAt: string;
}

export interface CommentsResponse {
  success: boolean;
  data: Comment[];
}

export interface AddCommentResponse {
  success: boolean;
  data: Comment;
}

// Get comments
export const getCommentsApi = async (videoId: string, page: number = 1): Promise<CommentsResponse> => {
  const response = await apiClient.get<CommentsResponse>(`/videos/${videoId}/comments`, {
    params: { page }
  });
  return response.data;
};

// Add comment
export const addCommentApi = async (videoId: string, text: string): Promise<AddCommentResponse> => {
  const response = await apiClient.post<AddCommentResponse>(`/videos/${videoId}/comments`, { text });
  return response.data;
};

export default {
  fetchVideosApi,
  fetchVideoByIdApi,
  searchVideosApi,
  getTrendingVideosApi,
  likeVideoApi,
  unlikeVideoApi,
  getCommentsApi,
  addCommentApi
};
