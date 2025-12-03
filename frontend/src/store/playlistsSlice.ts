import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Playlist {
  id: string;  // UUID
  userId: string;  // Owner UUID
  username: string;  // Denormalized
  name: string;
  description?: string;
  visibility: 'public' | 'unlisted' | 'private';
  videoIds: string[];  // Array of video UUIDs in order
  createdAt: number;
  updatedAt: number;
}

interface PlaylistsState {
  playlists: Playlist[];
}

const initialState: PlaylistsState = {
  playlists: [
    {
      id: 'playlist-user001-saved',
      userId: 'user-001',
      username: 'user001',
      name: 'Đã lưu',
      description: 'Video đã lưu của tôi',
      visibility: 'private',
      videoIds: ['video-2', 'video-3', 'video-6', 'video-9'],
      createdAt: Date.now() - 86400000 * 10,
      updatedAt: Date.now() - 86400000 * 1,
    },
    {
      id: 'playlist-user001-webdev',
      userId: 'user-001',
      username: 'user001',
      name: 'Web Development',
      description: 'Tutorials về phát triển web',
      visibility: 'public',
      videoIds: ['video-1', 'video-3'],
      createdAt: Date.now() - 86400000 * 8,
      updatedAt: Date.now() - 86400000 * 2,
    },
  ],
};

const playlistsSlice = createSlice({
  name: 'playlists',
  initialState,
  reducers: {
    createPlaylist: (state, action: PayloadAction<Omit<Playlist, 'id' | 'createdAt' | 'updatedAt'>>) => {
      const playlist: Playlist = {
        ...action.payload,
        id: `playlist-${Date.now()}-${Math.random()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      state.playlists.push(playlist);
    },
    updatePlaylist: (state, action: PayloadAction<{ id: string; name?: string; description?: string; visibility?: 'public' | 'unlisted' | 'private' }>) => {
      const playlist = state.playlists.find(p => p.id === action.payload.id);
      if (playlist) {
        if (action.payload.name) playlist.name = action.payload.name;
        if (action.payload.description !== undefined) playlist.description = action.payload.description;
        if (action.payload.visibility) playlist.visibility = action.payload.visibility;
        playlist.updatedAt = Date.now();
      }
    },
    deletePlaylist: (state, action: PayloadAction<string>) => {
      state.playlists = state.playlists.filter(p => p.id !== action.payload);
    },
    addVideoToPlaylist: (state, action: PayloadAction<{ playlistId: string; videoId: string }>) => {
      const playlist = state.playlists.find(p => p.id === action.payload.playlistId);
      if (playlist && !playlist.videoIds.includes(action.payload.videoId)) {
        playlist.videoIds.push(action.payload.videoId);
        playlist.updatedAt = Date.now();
      }
    },
    removeVideoFromPlaylist: (state, action: PayloadAction<{ playlistId: string; videoId: string }>) => {
      const playlist = state.playlists.find(p => p.id === action.payload.playlistId);
      if (playlist) {
        playlist.videoIds = playlist.videoIds.filter(id => id !== action.payload.videoId);
        playlist.updatedAt = Date.now();
      }
    },
    reorderPlaylistVideos: (state, action: PayloadAction<{ playlistId: string; videoIds: string[] }>) => {
      const playlist = state.playlists.find(p => p.id === action.payload.playlistId);
      if (playlist) {
        playlist.videoIds = action.payload.videoIds;
        playlist.updatedAt = Date.now();
      }
    },
  },
});

export const {
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  reorderPlaylistVideos,
} = playlistsSlice.actions;

export default playlistsSlice.reducer;
