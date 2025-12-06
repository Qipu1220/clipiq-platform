import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { loginApi, logoutApi, getCurrentUserApi, updateProfileApi, LoginRequest, UpdateProfileRequest } from '../api/auth';
import { handleApiError } from '../api/client';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'staff' | 'user';
  banned?: boolean;
  banExpiry?: string;
  banReason?: string;
  warnings: number;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  maintenanceMode: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  currentUser: null,
  isAuthenticated: false,
  maintenanceMode: false,
  loading: false,
  error: null,
};

// Async thunk for login
export const loginThunk = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await loginApi(credentials);

      // Store tokens in localStorage
      localStorage.setItem('accessToken', response.data.tokens.accessToken);
      localStorage.setItem('refreshToken', response.data.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      return response.data.user;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Async thunk for logout
export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await logoutApi();

      // Clear tokens from localStorage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    } catch (error: any) {
      // Even if API call fails, clear local storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Async thunk for getting current user
export const getCurrentUserThunk = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getCurrentUserApi();
      const user = response.data.user;
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Async thunk for updating profile
export const updateProfileThunk = createAsyncThunk(
  'auth/updateProfile',
  async (data: UpdateProfileRequest, { rejectWithValue }) => {
    try {
      const response = await updateProfileApi(data);
      // Update local storage
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...currentUser, ...response.data.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      return response.data.user;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Thunk to restore session from localStorage
export const restoreSessionThunk = createAsyncThunk(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('accessToken');
      const userStr = localStorage.getItem('user');

      if (!token || !userStr) {
        throw new Error('No session found');
      }

      const user = JSON.parse(userStr);

      // Validate token by fetching current user
      const response = await getCurrentUserApi();
      const fetchedUser = response.data.user;
      localStorage.setItem('user', JSON.stringify(fetchedUser));

      return fetchedUser;
    } catch (error: any) {
      // Clear invalid session
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      return rejectWithValue(handleApiError(error));
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
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
  extraReducers: (builder) => {
    // Login
    builder.addCase(loginThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loginThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.currentUser = action.payload;
      state.error = null;
    });
    builder.addCase(loginThunk.rejected, (state, action) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.currentUser = null;
      state.error = action.payload as string;
    });

    // Logout
    builder.addCase(logoutThunk.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(logoutThunk.fulfilled, (state) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.currentUser = null;
      state.error = null;
    });
    builder.addCase(logoutThunk.rejected, (state) => {
      // Still clear user even if API call failed
      state.loading = false;
      state.isAuthenticated = false;
      state.currentUser = null;
    });

    // Get current user
    builder.addCase(getCurrentUserThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(getCurrentUserThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.currentUser = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    });
    builder.addCase(getCurrentUserThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Update profile
    builder.addCase(updateProfileThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateProfileThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.currentUser = action.payload;
      state.error = null;
    });
    builder.addCase(updateProfileThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Restore session
    builder.addCase(restoreSessionThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(restoreSessionThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.currentUser = action.payload;
      state.error = null;
    });
    builder.addCase(restoreSessionThunk.rejected, (state) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.currentUser = null;
    });
  },
});

export const { clearError, toggleMaintenanceMode, updateDisplayName, updateAvatar, updateBio } = authSlice.actions;
export default authSlice.reducer;