import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Video {
  id: string;  // UUID
  title: string;
  description: string;
  uploaderId: string;  // UUID reference to user
  uploaderUsername: string;  // Denormalized for display
  thumbnailUrl: string;
  videoUrl: string;
  duration?: number;  // NEW: Video duration in seconds
  views: number;
  likes: string[];
  status: 'active' | 'deleted' | 'flagged';  // NEW: Video status
  uploadDate: number;
  comments: Comment[];
}

export interface Comment {
  id: string;  // UUID
  userId: string;  // UUID
  username: string;
  text: string;
  parentId?: string;  // NEW: For nested replies
  edited?: boolean;  // NEW: Track if edited
  timestamp: number;
}

interface VideosState {
  videos: Video[];
}

const initialState: VideosState = {
  videos: [
    {
      id: 'video-1',
      title: 'Getting Started with React',
      description: 'Learn the basics of React in this comprehensive tutorial',
      uploaderId: 'user-creator123',
      uploaderUsername: 'creator123',
      thumbnailUrl: '',
      videoUrl: '',
      duration: 1245,  // 20:45
      views: 1250,
      likes: ['user-001'],
      status: 'active',
      uploadDate: Date.now() - 86400000 * 2,
      comments: [
        { 
          id: 'c1', 
          userId: 'user-001',
          username: 'user001', 
          text: 'Great tutorial!', 
          timestamp: Date.now() - 86400000 
        }
      ],
    },
    {
      id: 'video-2',
      title: 'Advanced TypeScript Techniques',
      description: 'Deep dive into advanced TypeScript patterns',
      uploaderId: 'user-002',
      uploaderUsername: 'user002',
      thumbnailUrl: '',
      videoUrl: '',
      duration: 2830,  // 47:10
      views: 890,
      likes: [],
      status: 'active',
      uploadDate: Date.now() - 86400000 * 5,
      comments: [],
    },
    {
      id: 'video-3',
      title: 'Building a Full Stack App',
      description: 'Complete guide to building modern web applications',
      uploaderId: 'user-creator123',
      uploaderUsername: 'creator123',
      thumbnailUrl: '',
      videoUrl: '',
      duration: 3600,  // 1:00:00
      views: 2100,
      likes: ['user-001', 'user-002'],
      status: 'active',
      uploadDate: Date.now() - 86400000 * 1,
      comments: [
        { 
          id: 'c2', 
          userId: 'user-002',
          username: 'user002', 
          text: 'Very helpful!', 
          timestamp: Date.now() - 3600000 
        }
      ],
    },
  ],
};

const videosSlice = createSlice({
  name: 'videos',
  initialState,
  reducers: {
    addVideo: (state, action: PayloadAction<Video>) => {
      state.videos.unshift(action.payload);
    },
    deleteVideo: (state, action: PayloadAction<string>) => {
      const video = state.videos.find(v => v.id === action.payload);
      if (video) {
        video.status = 'deleted';  // Soft delete
      }
    },
    updateVideoStatus: (state, action: PayloadAction<{ videoId: string; status: 'active' | 'deleted' | 'flagged' }>) => {
      const video = state.videos.find(v => v.id === action.payload.videoId);
      if (video) {
        video.status = action.payload.status;
      }
    },
    likeVideo: (state, action: PayloadAction<{ videoId: string; userId: string }>) => {
      const video = state.videos.find(v => v.id === action.payload.videoId);
      if (video) {
        if (video.likes.includes(action.payload.userId)) {
          video.likes = video.likes.filter(u => u !== action.payload.userId);
        } else {
          video.likes.push(action.payload.userId);
        }
      }
    },
    addComment: (state, action: PayloadAction<{ videoId: string; comment: Comment }>) => {
      const video = state.videos.find(v => v.id === action.payload.videoId);
      if (video) {
        video.comments.push(action.payload.comment);
      }
    },
    editComment: (state, action: PayloadAction<{ videoId: string; commentId: string; text: string }>) => {
      const video = state.videos.find(v => v.id === action.payload.videoId);
      if (video) {
        const comment = video.comments.find(c => c.id === action.payload.commentId);
        if (comment) {
          comment.text = action.payload.text;
          comment.edited = true;
        }
      }
    },
    deleteComment: (state, action: PayloadAction<{ videoId: string; commentId: string }>) => {
      const video = state.videos.find(v => v.id === action.payload.videoId);
      if (video) {
        video.comments = video.comments.filter(c => c.id !== action.payload.commentId);
      }
    },
    incrementViews: (state, action: PayloadAction<string>) => {
      const video = state.videos.find(v => v.id === action.payload);
      if (video) {
        video.views += 1;
      }
    },
  },
});

export const { 
  addVideo, 
  deleteVideo, 
  updateVideoStatus,
  likeVideo, 
  addComment, 
  editComment,
  deleteComment,
  incrementViews 
} = videosSlice.actions;
export default videosSlice.reducer;