import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Video {
  id: string;
  title: string;
  description: string;
  uploader: string;
  thumbnailUrl: string;
  videoUrl: string;
  views: number;
  likes: string[];
  uploadDate: number;
  comments: Comment[];
}

export interface Comment {
  id: string;
  username: string;
  text: string;
  timestamp: number;
}

interface VideosState {
  videos: Video[];
}

const initialState: VideosState = {
  videos: [
    {
      id: '1',
      title: 'Getting Started with React',
      description: 'Learn the basics of React in this comprehensive tutorial',
      uploader: 'creator123',
      thumbnailUrl: '',
      videoUrl: '',
      views: 1250,
      likes: ['user001'],
      uploadDate: Date.now() - 86400000 * 2,
      comments: [
        { id: 'c1', username: 'user001', text: 'Great tutorial!', timestamp: Date.now() - 86400000 }
      ],
    },
    {
      id: '2',
      title: 'Advanced TypeScript Techniques',
      description: 'Deep dive into advanced TypeScript patterns',
      uploader: 'user002',
      thumbnailUrl: '',
      videoUrl: '',
      views: 890,
      likes: [],
      uploadDate: Date.now() - 86400000 * 5,
      comments: [],
    },
    {
      id: '3',
      title: 'Building a Full Stack App',
      description: 'Complete guide to building modern web applications',
      uploader: 'creator123',
      thumbnailUrl: '',
      videoUrl: '',
      views: 2100,
      likes: ['user001', 'user002'],
      uploadDate: Date.now() - 86400000 * 1,
      comments: [
        { id: 'c2', username: 'user002', text: 'Very helpful!', timestamp: Date.now() - 3600000 }
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
      state.videos = state.videos.filter(v => v.id !== action.payload);
    },
    likeVideo: (state, action: PayloadAction<{ videoId: string; username: string }>) => {
      const video = state.videos.find(v => v.id === action.payload.videoId);
      if (video) {
        if (video.likes.includes(action.payload.username)) {
          video.likes = video.likes.filter(u => u !== action.payload.username);
        } else {
          video.likes.push(action.payload.username);
        }
      }
    },
    addComment: (state, action: PayloadAction<{ videoId: string; comment: Comment }>) => {
      const video = state.videos.find(v => v.id === action.payload.videoId);
      if (video) {
        video.comments.push(action.payload.comment);
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

export const { addVideo, deleteVideo, likeVideo, addComment, incrementViews } = videosSlice.actions;
export default videosSlice.reducer;
