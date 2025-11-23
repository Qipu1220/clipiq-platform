import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ViewHistoryEntry {
  id: string;  // UUID
  userId: string;  // UUID
  videoId: string;  // UUID
  watchDuration?: number;  // Seconds watched
  completed: boolean;  // Watched to end
  createdAt: number;  // Timestamp
}

interface ViewHistoryState {
  history: ViewHistoryEntry[];
}

const initialState: ViewHistoryState = {
  history: [],
};

const viewHistorySlice = createSlice({
  name: 'viewHistory',
  initialState,
  reducers: {
    addToHistory: (state, action: PayloadAction<{ userId: string; videoId: string }>) => {
      // Check if already exists
      const existing = state.history.find(
        h => h.userId === action.payload.userId && h.videoId === action.payload.videoId
      );
      
      if (existing) {
        // Update timestamp (move to top)
        existing.createdAt = Date.now();
      } else {
        // Add new entry
        const entry: ViewHistoryEntry = {
          id: `history-${Date.now()}-${Math.random()}`,
          userId: action.payload.userId,
          videoId: action.payload.videoId,
          completed: false,
          createdAt: Date.now(),
        };
        state.history.unshift(entry);
      }
    },
    updateWatchProgress: (state, action: PayloadAction<{ 
      userId: string; 
      videoId: string; 
      watchDuration: number; 
      completed: boolean 
    }>) => {
      const entry = state.history.find(
        h => h.userId === action.payload.userId && h.videoId === action.payload.videoId
      );
      if (entry) {
        entry.watchDuration = action.payload.watchDuration;
        entry.completed = action.payload.completed;
      }
    },
    removeFromHistory: (state, action: PayloadAction<string>) => {
      state.history = state.history.filter(h => h.id !== action.payload);
    },
    clearHistory: (state, action: PayloadAction<string>) => {
      // Clear history for specific user
      state.history = state.history.filter(h => h.userId !== action.payload);
    },
  },
});

export const {
  addToHistory,
  updateWatchProgress,
  removeFromHistory,
  clearHistory,
} = viewHistorySlice.actions;

export default viewHistorySlice.reducer;
