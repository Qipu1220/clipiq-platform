import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchVideosApi,
  fetchVideoByIdApi,
  searchVideosApi,
  getTrendingVideosApi,
  likeVideoApi,
  unlikeVideoApi,
  getCommentsApi,
  addCommentApi,
  Video,
  VideoResponse,
  Comment,
} from '../api/videos';

export interface VideosState {
  videos: Video[];
  userVideos: Video[];
  trendingVideos: Video[];
  searchResults: Video[];
  selectedVideo: Video | null;
  currentVideoComments: Comment[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    hasMore: boolean;
    total: number;
  };
  searchLoading: boolean;
  searchError: string | null;
}

const initialState: VideosState = {
  videos: [],
  userVideos: [],
  trendingVideos: [],
  searchResults: [],
  selectedVideo: null,
  currentVideoComments: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    hasMore: true,
    total: 0,
  },
  searchLoading: false,
  searchError: null,
};

// Async Thunks
export const fetchVideosThunk = createAsyncThunk(
  'videos/fetchVideos',
  async (params: { page?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      console.log('🎬 fetchVideosThunk called with params:', params);
      const response = await fetchVideosApi(params.page || 1, params.limit || 10);
      console.log('🌐 API response:', response);
      return response.data; // This is {videos: [], pagination: {...}}
    } catch (error: any) {
      console.error('💥 fetchVideosThunk error:', error);
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch videos');
    }
  }
);

export const fetchUserVideosThunk = createAsyncThunk(
  'videos/fetchUserVideos',
  async (username: string, { rejectWithValue }) => {
    try {
      console.log('🎬 fetchUserVideosThunk called for username:', username);
      const response = await fetchVideosApi(1, 50, username); // Fetch up to 50 videos for user profile
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch user videos');
    }
  }
);

export const fetchVideoByIdThunk = createAsyncThunk(
  'videos/fetchVideoById',
  async (videoId: string, { rejectWithValue }) => {
    try {
      const response = await fetchVideoByIdApi(videoId);
      return response.data; // This is the Video object directly
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch video');
    }
  }
);

export const fetchTrendingVideosThunk = createAsyncThunk(
  'videos/fetchTrendingVideos',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getTrendingVideosApi();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch trending videos');
    }
  }
);

export const searchVideosThunk = createAsyncThunk(
  'videos/searchVideos',
  async (params: { query: string; page?: number }, { rejectWithValue }) => {
    try {
      const response = await searchVideosApi(params.query, params.page || 1);
      return response.data; // This is {videos: [], pagination: {...}}
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to search videos');
    }
  }
);

export const toggleLikeVideoThunk = createAsyncThunk(
  'videos/toggleLike',
  async ({ videoId, isLiked }: { videoId: string; isLiked: boolean }, { dispatch, rejectWithValue }) => {
    try {
      // Optimistic update
      if (isLiked) {
        dispatch(videosSlice.actions.unlikeVideo(videoId));
        await unlikeVideoApi(videoId);
      } else {
        dispatch(videosSlice.actions.likeVideo(videoId));
        await likeVideoApi(videoId);
      }
      return { videoId, isLiked: !isLiked };
    } catch (error: any) {
      // Revert on failure
      if (isLiked) {
        dispatch(videosSlice.actions.likeVideo(videoId));
      } else {
        dispatch(videosSlice.actions.unlikeVideo(videoId));
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to toggle like');
    }
  }
);

export const fetchCommentsThunk = createAsyncThunk(
  'videos/fetchComments',
  async (videoId: string, { rejectWithValue }) => {
    try {
      const response = await getCommentsApi(videoId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch comments');
    }
  }
);

export const addCommentThunk = createAsyncThunk(
  'videos/addComment',
  async ({ videoId, text }: { videoId: string; text: string }, { rejectWithValue }) => {
    try {
      const response = await addCommentApi(videoId, text);
      return { videoId, comment: response.data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add comment');
    }
  }
);

const videosSlice = createSlice({
  name: 'videos',
  initialState,
  reducers: {
    setSelectedVideo: (state, action: PayloadAction<Video | null>) => {
      state.selectedVideo = action.payload;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.searchError = null;
    },
    likeVideo: (state, action: PayloadAction<string>) => {
      const videoId = action.payload;
      const video = state.videos.find((v) => v.id === videoId);
      if (video) {
        video.isLiked = true;
        video.likes = (video.likes || 0) + 1;
      }
      const trendingVideo = state.trendingVideos.find((v) => v.id === videoId);
      if (trendingVideo) {
        trendingVideo.isLiked = true;
        trendingVideo.likes = (trendingVideo.likes || 0) + 1;
      }
      if (state.selectedVideo?.id === videoId) {
        state.selectedVideo.isLiked = true;
        state.selectedVideo.likes = (state.selectedVideo.likes || 0) + 1;
      }
    },
    unlikeVideo: (state, action: PayloadAction<string>) => {
      const videoId = action.payload;
      const video = state.videos.find((v) => v.id === videoId);
      if (video) {
        video.isLiked = false;
        video.likes = Math.max(0, (video.likes || 0) - 1);
      }
      const trendingVideo = state.trendingVideos.find((v) => v.id === videoId);
      if (trendingVideo) {
        trendingVideo.isLiked = false;
        trendingVideo.likes = Math.max(0, (trendingVideo.likes || 0) - 1);
      }
      if (state.selectedVideo?.id === videoId) {
        state.selectedVideo.isLiked = false;
        state.selectedVideo.likes = Math.max(0, (state.selectedVideo.likes || 0) - 1);
      }
    },
    incrementViewCount: (state, action: PayloadAction<string>) => {
      const videoId = action.payload;
      const video = state.videos.find((v) => v.id === videoId);
      if (video) {
        video.views = (video.views || 0) + 1;
      }
      if (state.selectedVideo?.id === videoId) {
        state.selectedVideo.views = (state.selectedVideo.views || 0) + 1;
      }
    },
    addComment: (state, action: PayloadAction<{ videoId: string; count: number }>) => {
      const video = state.videos.find((v) => v.id === action.payload.videoId);
      if (video) {
        video.comments = action.payload.count;
      }
      if (state.selectedVideo?.id === action.payload.videoId) {
        state.selectedVideo.comments = action.payload.count;
      }
    },
    deleteVideo: (state, action: PayloadAction<string>) => {
      state.videos = state.videos.filter((v) => v.id !== action.payload);
      state.trendingVideos = state.trendingVideos.filter((v) => v.id !== action.payload);
      if (state.selectedVideo?.id === action.payload) {
        state.selectedVideo = null;
      }
    },
    addVideo: (state, action: PayloadAction<any>) => {
      state.videos.unshift(action.payload);
    },
  },
  extraReducers: (builder) => {
    // Fetch Videos
    builder
      .addCase(fetchVideosThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVideosThunk.fulfilled, (state, action) => {
        state.loading = false;
        console.log('📦 fetchVideosThunk fulfilled - action.payload:', action.payload);

        const newVideos = action.payload.videos || [];
        const page = action.payload.pagination?.page || 1;

        if (page === 1) {
          state.videos = newVideos;
        } else {
          // Append new videos, avoiding duplicates
          const existingIds = new Set(state.videos.map(v => v.id));
          const uniqueNewVideos = newVideos.filter(v => !existingIds.has(v.id));
          state.videos = [...state.videos, ...uniqueNewVideos];
        }

        state.pagination = {
          page: page,
          hasMore: action.payload.pagination?.hasMore || false,
          total: action.payload.pagination?.total || 0,
        };
      })
      .addCase(fetchVideosThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch User Videos
    builder
      .addCase(fetchUserVideosThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserVideosThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.userVideos = action.payload.videos || [];
      })
      .addCase(fetchUserVideosThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Video by ID
    builder
      .addCase(fetchVideoByIdThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVideoByIdThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedVideo = action.payload;
      })
      .addCase(fetchVideoByIdThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Trending Videos
    builder
      .addCase(fetchTrendingVideosThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTrendingVideosThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.trendingVideos = action.payload.videos || [];
      })
      .addCase(fetchTrendingVideosThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Search Videos
    builder
      .addCase(searchVideosThunk.pending, (state) => {
        state.searchLoading = true;
        state.searchError = null;
      })
      .addCase(searchVideosThunk.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload.videos || [];
      })
      .addCase(searchVideosThunk.rejected, (state, action) => {
        state.searchLoading = false;
        state.searchError = action.payload as string;
      })

      // Fetch Comments
      .addCase(fetchCommentsThunk.fulfilled, (state, action) => {
        state.currentVideoComments = action.payload;
      })

      // Add Comment
      .addCase(addCommentThunk.fulfilled, (state, action) => {
        state.currentVideoComments.unshift(action.payload.comment);

        // Update comment count in video lists
        const { videoId } = action.payload;
        const video = state.videos.find(v => v.id === videoId);
        if (video) video.comments++;

        const trendingVideo = state.trendingVideos.find(v => v.id === videoId);
        if (trendingVideo) trendingVideo.comments++;

        if (state.selectedVideo?.id === videoId) state.selectedVideo.comments++;
      });
  },
});

export const {
  setSelectedVideo,
  clearSearchResults,
  likeVideo,
  unlikeVideo,
  incrementViewCount,
  addComment,
  deleteVideo,
  addVideo,
} = videosSlice.actions;

export default videosSlice.reducer;
