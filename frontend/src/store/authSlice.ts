import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  username: string;
  role: 'admin' | 'staff' | 'user';
  password: string;
  banned?: boolean;
  banExpiry?: number;
  warnings: number;
  displayName?: string;
  avatarUrl?: string;
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
  },
});

export const { login, logout, toggleMaintenanceMode, updateDisplayName, updateAvatar } = authSlice.actions;
export default authSlice.reducer;