import apiClient from './client';

// ==================== LIKE ====================

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

// Fetch liked videos
export const fetchLikedVideosApi = async (page: number = 1, limit: number = 10) => {
  const response = await apiClient.get('/videos/liked', {
    params: { page, limit }
  });
  return response.data;
};

// ==================== SAVE/BOOKMARK ====================

// Toggle save video
export const toggleSaveVideoApi = async (videoId: string): Promise<{ success: boolean; data: { isSaved: boolean }; message: string }> => {
  const response = await apiClient.post(`/videos/${videoId}/save`);
  return response.data;
};

// Fetch saved videos
export const fetchSavedVideosApi = async (page: number = 1, limit: number = 10) => {
  const response = await apiClient.get('/videos/saved', {
    params: { page, limit }
  });
  return response.data;
};

// ==================== COMMENT ====================

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

// Delete comment
export const deleteCommentApi = async (videoId: string, commentId: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.delete<{ success: boolean; message: string }>(`/videos/${videoId}/comments/${commentId}`);
  return response.data;
};

export default {
  // Like
  likeVideoApi,
  unlikeVideoApi,
  fetchLikedVideosApi,
  // Save
  toggleSaveVideoApi,
  fetchSavedVideosApi,
  // Comment
  getCommentsApi,
  addCommentApi,
  deleteCommentApi
};

