import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchVideosApi,
  fetchVideoByIdApi,
  searchVideosApi,
  getTrendingVideosApi,
  fetchLikedVideosApi,
  fetchSavedVideosApi,
  likeVideoApi,
  unlikeVideoApi,
  getCommentsApi,
  addCommentApi,
  deleteCommentApi,
  toggleSaveVideoApi,
  Video,
  VideoResponse,
  Comment,
} from '../api/videos';
import { getPersonalFeed, getTrendingFeed, FeedVideo } from '../api/feed';

export interface VideosState {
  videos: Video[];
  userVideos: Video[];
  likedVideos: Video[];
  savedVideos: Video[];
  trendingVideos: Video[];
  searchResults: Video[];
  selectedVideo: Video | null;
  focusedVideoId: string | null;
  isProfileNavigation: boolean; // Flag to prevent fetch when navigating from profile
  currentVideoComments: Comment[];
  pendingLikes: Record<string, boolean>; // Track pending like operations by video ID
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
  likedVideos: [],
  savedVideos: [],
  trendingVideos: [],
  searchResults: [],
  selectedVideo: null,
  focusedVideoId: null,
  isProfileNavigation: false,
  currentVideoComments: [],
  pendingLikes: {},
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

export const fetchPersonalFeedThunk = createAsyncThunk(
  'videos/fetchPersonalFeed',
  async (limit: number = 20, { rejectWithValue, getState }) => {
    // Check if we're in profile navigation mode - skip fetch if so
    const state = getState() as { videos: VideosState };
    if (state.videos.isProfileNavigation) {
      console.log('[Feed] Skipping fetch - profile navigation in progress');
      return { videos: state.videos.videos, pagination: state.videos.pagination, skipped: true };
    }
    
    try {
      console.log('[Feed] Fetching personal feed, limit:', limit);
      const response = await getPersonalFeed(limit);
      console.log('[Feed] Personal feed response:', response);

      // Transform FeedVideo to Video format
      const videos = response.data.items.map((item: FeedVideo) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        thumbnailUrl: item.thumbnail_url,
        videoUrl: item.video_url,
        duration: item.duration,
        views: item.views,
        uploadDate: item.upload_date,
        uploaderUsername: item.uploader_username,
        uploaderDisplayName: item.uploader_display_name,
        uploaderAvatarUrl: item.uploader_avatar,
        uploaderAvatar: item.uploader_avatar,
        likes: parseInt(item.likes_count) || 0,
        comments: parseInt(item.comments_count) || 0,
        source: item.source,
        impressionId: item.impression_id,
        position: item.position,
        isLiked: false,
        isSaved: false,
        processing_status: item.status === 'active' ? 'ready' : 'processing'
      }));

      return { videos, pagination: { page: 1, hasMore: false, total: response.data.total } };
    } catch (error: any) {
      console.error('[Feed] Error fetching personal feed:', error);
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch personal feed');
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



export const fetchLikedVideosThunk = createAsyncThunk(
  'videos/fetchLikedVideos',
  async (params: { page?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const response = await fetchLikedVideosApi(params.page || 1, params.limit || 20);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch liked videos');
    }
  }
);

export const fetchSavedVideosThunk = createAsyncThunk(
  'videos/fetchSavedVideos',
  async (params: { page?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const response = await fetchSavedVideosApi(params.page || 1, params.limit || 20);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch saved videos');
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
  async ({ videoId, isLiked }: { videoId: string; isLiked: boolean }, { dispatch, rejectWithValue, getState }) => {
    try {
      // Call API first, THEN update Redux state
      if (isLiked) {
        await unlikeVideoApi(videoId);
        dispatch(videosSlice.actions.unlikeVideo(videoId));
      } else {
        await likeVideoApi(videoId);
        dispatch(videosSlice.actions.likeVideo(videoId));
      }
      return { videoId, isLiked: !isLiked };
    } catch (error: any) {
      // No need to revert since we haven't updated state yet
      return rejectWithValue(error.response?.data?.message || 'Failed to toggle like');
    }
  },
  {
    condition: ({ videoId }, { getState }) => {
      const state = getState() as any;
      const pendingRequests = state.videos.pendingLikes || {};
      // Prevent duplicate requests for same video
      return !pendingRequests[videoId];
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





export const toggleSaveVideoThunk = createAsyncThunk(
  'videos/toggleSaveVideo',
  async (videoId: string, { rejectWithValue }) => {
    try {
      const response = await toggleSaveVideoApi(videoId);
      return { videoId, isSaved: response.data.isSaved };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to toggle save video');
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

export const deleteCommentThunk = createAsyncThunk(
  'videos/deleteComment',
  async ({ videoId, commentId }: { videoId: string; commentId: string }, { rejectWithValue }) => {
    try {
      await deleteCommentApi(videoId, commentId);
      return { videoId, commentId };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete comment');
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
      const userVideo = state.userVideos.find((v) => v.id === videoId);
      if (userVideo) {
        userVideo.isLiked = true;
        userVideo.likes = (userVideo.likes || 0) + 1;
      }
      const likedVideo = state.likedVideos.find((v) => v.id === videoId);
      if (likedVideo) {
        likedVideo.isLiked = true;
        likedVideo.likes = (likedVideo.likes || 0) + 1;
      }
      const savedVideo = state.savedVideos.find((v) => v.id === videoId);
      if (savedVideo) {
        savedVideo.isLiked = true;
        savedVideo.likes = (savedVideo.likes || 0) + 1;
      }
      const searchVideo = state.searchResults.find((v) => v.id === videoId);
      if (searchVideo) {
        searchVideo.isLiked = true;
        searchVideo.likes = (searchVideo.likes || 0) + 1;
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
      const userVideo = state.userVideos.find((v) => v.id === videoId);
      if (userVideo) {
        userVideo.isLiked = false;
        userVideo.likes = Math.max(0, (userVideo.likes || 0) - 1);
      }
      const likedVideo = state.likedVideos.find((v) => v.id === videoId);
      if (likedVideo) {
        likedVideo.isLiked = false;
        likedVideo.likes = Math.max(0, (likedVideo.likes || 0) - 1);
      }
      const savedVideo = state.savedVideos.find((v) => v.id === videoId);
      if (savedVideo) {
        savedVideo.isLiked = false;
        savedVideo.likes = Math.max(0, (savedVideo.likes || 0) - 1);
      }
      const searchVideo = state.searchResults.find((v) => v.id === videoId);
      if (searchVideo) {
        searchVideo.isLiked = false;
        searchVideo.likes = Math.max(0, (searchVideo.likes || 0) - 1);
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
    setVideos: (state, action: PayloadAction<Video[]>) => {
      state.videos = action.payload;
      // When videos are set from profile, mark as profile navigation
      state.isProfileNavigation = true;
    },
    setFocusedVideoId: (state, action: PayloadAction<string | null>) => {
      state.focusedVideoId = action.payload;
      // When focusedVideoId is set, mark as profile navigation
      // When cleared, keep profile navigation until explicitly reset
      if (action.payload) {
        state.isProfileNavigation = true;
      }
    },
    setProfileNavigation: (state, action: PayloadAction<boolean>) => {
      state.isProfileNavigation = action.payload;
    },
    addVideo: (state, action: PayloadAction<Video>) => {
      // Remove existing instance if any to prevent duplicates
      state.videos = state.videos.filter(v => v.id !== action.payload.id);
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

    // Fetch Personal Feed
    builder
      .addCase(fetchPersonalFeedThunk.pending, (state) => {
        // Don't set loading if profile navigation (will be skipped anyway)
        if (!state.isProfileNavigation) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchPersonalFeedThunk.fulfilled, (state, action) => {
        state.loading = false;
        console.log('[Feed] fetchPersonalFeedThunk fulfilled:', action.payload);

        // If skipped (profile navigation), don't update videos
        if (action.payload.skipped) {
          console.log('[Feed] Fetch was skipped, keeping current videos');
          return;
        }

        // Double-check: if profile navigation started after fetch began, don't overwrite
        if (state.isProfileNavigation) {
          console.log('[Feed] Profile navigation active, skipping video update to preserve focused video');
          return;
        }

        state.videos = action.payload.videos || [];
        state.pagination = action.payload.pagination || {
          page: 1,
          hasMore: false,
          total: 0
        };
      })
      .addCase(fetchPersonalFeedThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        console.error('[Feed] fetchPersonalFeedThunk rejected:', action.payload);
      });

    // Fetch User Videos
    builder
      .addCase(fetchUserVideosThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.userVideos = [];
      })
      .addCase(fetchUserVideosThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.userVideos = action.payload.videos || [];
      })
      .addCase(fetchUserVideosThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch Liked Videos
      .addCase(fetchLikedVideosThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchLikedVideosThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.likedVideos = action.payload.videos || [];
      })
      .addCase(fetchLikedVideosThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch Saved Videos
      .addCase(fetchSavedVideosThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSavedVideosThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.savedVideos = action.payload.videos || [];
      })
      .addCase(fetchSavedVideosThunk.rejected, (state, action) => {
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
      })

      // Delete Comment
      .addCase(deleteCommentThunk.fulfilled, (state, action) => {
        const { videoId, commentId } = action.payload;
        state.currentVideoComments = state.currentVideoComments.filter(c => c.id !== commentId);

        // Update comment count in video lists
        const video = state.videos.find(v => v.id === videoId);
        if (video) video.comments = Math.max(0, video.comments - 1);

        const trendingVideo = state.trendingVideos.find(v => v.id === videoId);
        if (trendingVideo) trendingVideo.comments = Math.max(0, trendingVideo.comments - 1);

        if (state.selectedVideo?.id === videoId) {
          state.selectedVideo.comments = Math.max(0, state.selectedVideo.comments - 1);
        }
      })

      // Toggle Save Video
      .addCase(toggleSaveVideoThunk.fulfilled, (state, action) => {
        const { videoId, isSaved } = action.payload;

        // Update in main list
        const video = state.videos.find(v => v.id === videoId);
        if (video) video.isSaved = isSaved;

        // Update in trending list
        const trendingVideo = state.trendingVideos.find(v => v.id === videoId);
        if (trendingVideo) trendingVideo.isSaved = isSaved;

        // Update in search results
        const searchVideo = state.searchResults.find(v => v.id === videoId);
        if (searchVideo) searchVideo.isSaved = isSaved;

        // Update selected video
        if (state.selectedVideo?.id === videoId) {
          state.selectedVideo.isSaved = isSaved;
        }

        // Update in user videos
        const userVideo = state.userVideos.find(v => v.id === videoId);
        if (userVideo) userVideo.isSaved = isSaved;

        // Update in liked videos
        const likedVideo = state.likedVideos.find(v => v.id === videoId);
        if (likedVideo) likedVideo.isSaved = isSaved;

        // Update saved videos list specifically
        if (isSaved) {
          // If saved, we might want to add it to savedVideos if not present? 
          // But we don't have the full video object usually unless we fetch.
          // However, if we are in the savedVideos tab, we probably want to remove it if unsaved.
        } else {
          // If unsaved, remove from savedVideos list
          state.savedVideos = state.savedVideos.filter(v => v.id !== videoId);
        }
      });

    // Toggle Like Video - Track pending state
    builder
      .addCase(toggleLikeVideoThunk.pending, (state, action) => {
        const videoId = action.meta.arg.videoId;
        state.pendingLikes[videoId] = true;
      })
      .addCase(toggleLikeVideoThunk.fulfilled, (state, action) => {
        const videoId = action.meta.arg.videoId;
        delete state.pendingLikes[videoId];
      })
      .addCase(toggleLikeVideoThunk.rejected, (state, action) => {
        const videoId = action.meta.arg.videoId;
        delete state.pendingLikes[videoId];
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
  setVideos,
  setFocusedVideoId,
  setProfileNavigation,
} = videosSlice.actions;

export default videosSlice.reducer;
