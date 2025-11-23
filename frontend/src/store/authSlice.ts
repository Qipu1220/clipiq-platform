import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: string;  // UUID
  username: string;
  email: string;  // NEW: Required for registration
  role: 'admin' | 'staff' | 'user';
  password: string;
  banned?: boolean;
  banExpiry?: number;
  banReason?: string;  // NEW: Reason for ban
  warnings: number;
  displayName?: string;
  bio?: string;  // NEW: User biography
  avatarUrl?: string;
  createdAt?: number;
  updatedAt?: number;
}

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  maintenanceMode: boolean;
}

const initialState: AuthState = {
  currentUser: null,
  isAuthenticated: false,
  maintenanceMode: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.currentUser = null;
      state.isAuthenticated = false;
    },
    toggleMaintenanceMode: (state) => {
      state.maintenanceMode = !state.maintenanceMode;
    },
    updateDisplayName: (state, action: PayloadAction<string>) => {
      if (state.currentUser) {
        state.currentUser.displayName = action.payload;
      }
    },
    updateAvatar: (state, action: PayloadAction<string>) => {
      if (state.currentUser) {
        state.currentUser.avatarUrl = action.payload;
      }
    },
    updateBio: (state, action: PayloadAction<string>) => {
      if (state.currentUser) {
        state.currentUser.bio = action.payload;
      }
    },
  },
});

export const { login, logout, toggleMaintenanceMode, updateDisplayName, updateAvatar, updateBio } = authSlice.actions;
export default authSlice.reducer;