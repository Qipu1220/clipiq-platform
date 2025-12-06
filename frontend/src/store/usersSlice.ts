import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { User } from './authSlice';

interface UsersState {
  allUsers: User[];
}

const initialState: UsersState = {
  allUsers: [
    {
      id: 'admin-001',
      username: 'admin001',
      email: 'admin@clipiq.com',
      role: 'admin',
      password: '123456',
      warnings: 0,
      createdAt: Date.now() - 86400000 * 365
    },
    {
      id: 'staff-001',
      username: 'staff001',
      email: 'staff@clipiq.com',
      role: 'staff',
      password: '123456',
      warnings: 0,
      createdAt: Date.now() - 86400000 * 180
    },
    {
      id: 'user-001',
      username: 'user001',
      email: 'user001@example.com',
      role: 'user',
      password: '123456',
      warnings: 0,
      displayName: 'User One',
      bio: 'Just a regular user enjoying videos',
      createdAt: Date.now() - 86400000 * 90
    },
    {
      id: 'user-002',
      username: 'user002',
      email: 'user002@example.com',
      role: 'user',
      password: '123456',
      warnings: 0,
      createdAt: Date.now() - 86400000 * 60
    },
    {
      id: 'user-creator123',
      username: 'creator123',
      email: 'creator@example.com',
      role: 'user',
      password: '123456',
      warnings: 0,
      displayName: 'Content Creator',
      bio: 'Creating educational content about web development',
      createdAt: Date.now() - 86400000 * 120
    },
  ],
  status: 'idle',
  error: null,
};

// Async thunk to fetch user by username
export const fetchUserByUsernameThunk = createAsyncThunk(
  'users/fetchByUsername',
  async (username: string, { rejectWithValue }) => {
    try {
      const { fetchUserByUsernameApi } = await import('../api/users');
      const response = await fetchUserByUsernameApi(username);
      return response.data.data;
    } catch (error: any) {
      if (error.response && error.response.data) {
        return rejectWithValue(error.response.data);
      }
      return rejectWithValue({ message: 'Failed to fetch user' });
    }
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    addUser: (state, action: PayloadAction<User>) => {
      state.allUsers.push(action.payload);
    },
    deleteUser: (state, action: PayloadAction<string>) => {
      state.allUsers = state.allUsers.filter(u => u.id !== action.payload);
    },
    changePassword: (state, action: PayloadAction<{ userId: string; newPassword: string }>) => {
      const user = state.allUsers.find(u => u.id === action.payload.userId);
      if (user) {
        user.password = action.payload.newPassword;
      }
    },
    banUser: (state, action: PayloadAction<{ userId: string; duration?: number; reason?: string }>) => {
      const user = state.allUsers.find(u => u.id === action.payload.userId);
      if (user) {
        user.banned = true;
        user.banReason = action.payload.reason;
        if (action.payload.duration) {
          user.banExpiry = Date.now() + action.payload.duration * 24 * 60 * 60 * 1000;
        }
      }
    },
    unbanUser: (state, action: PayloadAction<string>) => {
      const user = state.allUsers.find(u => u.id === action.payload);
      if (user) {
        user.banned = false;
        user.banExpiry = undefined;
        user.banReason = undefined;
      }
    },
    warnUser: (state, action: PayloadAction<string>) => {
      const user = state.allUsers.find(u => u.id === action.payload);
      if (user) {
        user.warnings = (user.warnings || 0) + 1;
      }
    },
    clearWarnings: (state, action: PayloadAction<string>) => {
      const user = state.allUsers.find(u => u.id === action.payload);
      if (user) {
        user.warnings = 0;
      }
    },
    updateUserDisplayName: (state, action: PayloadAction<{ userId: string; displayName: string }>) => {
      const user = state.allUsers.find(u => u.id === action.payload.userId);
      if (user) {
        user.displayName = action.payload.displayName;
      }
    },
    updateUserAvatar: (state, action: PayloadAction<{ userId: string; avatarUrl: string }>) => {
      const user = state.allUsers.find(u => u.id === action.payload.userId);
      if (user) {
        user.avatarUrl = action.payload.avatarUrl;
      }
    },
    updateUserBio: (state, action: PayloadAction<{ userId: string; bio: string }>) => {
      const user = state.allUsers.find(u => u.id === action.payload.userId);
      if (user) {
        user.bio = action.payload.bio;
      }
    },
    changeUserRole: (state, action: PayloadAction<{ userId: string; role: 'admin' | 'staff' | 'user' }>) => {
      const user = state.allUsers.find(u => u.id === action.payload.userId);
      if (user) {
        user.role = action.payload.role;
      }
    },
    // Helper actions for username-based operations
    banUserByUsername: (state, action: PayloadAction<{ username: string; duration?: number; reason?: string }>) => {
      const user = state.allUsers.find(u => u.username === action.payload.username);
      if (user) {
        user.banned = true;
        user.banReason = action.payload.reason;
        if (action.payload.duration) {
          user.banExpiry = Date.now() + action.payload.duration * 24 * 60 * 60 * 1000;
        }
      }
    },
    unbanUserByUsername: (state, action: PayloadAction<string>) => {
      const user = state.allUsers.find(u => u.username === action.payload);
      if (user) {
        user.banned = false;
        user.banExpiry = undefined;
        user.banReason = undefined;
      }
    },
    warnUserByUsername: (state, action: PayloadAction<string>) => {
      const user = state.allUsers.find(u => u.username === action.payload);
      if (user) {
        user.warnings = (user.warnings || 0) + 1;
      }
    },
    clearWarningsByUsername: (state, action: PayloadAction<string>) => {
      const user = state.allUsers.find(u => u.username === action.payload);
      if (user) {
        user.warnings = 0;
      }
    },
    deleteUserByUsername: (state, action: PayloadAction<string>) => {
      state.allUsers = state.allUsers.filter(u => u.username !== action.payload);
    },
    updateUserRole: (state, action: PayloadAction<{ username: string; role: 'admin' | 'staff' | 'user' }>) => {
      const user = state.allUsers.find(u => u.username === action.payload.username);
      if (user) {
        user.role = action.payload.role;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserByUsernameThunk.pending, (state) => {
        // state.status = 'loading';
      })
      .addCase(fetchUserByUsernameThunk.fulfilled, (state, action) => {
        // Check if user already exists
        const index = state.allUsers.findIndex(u => u.username === action.payload.username);
        if (index !== -1) {
          state.allUsers[index] = { ...state.allUsers[index], ...action.payload };
        } else {
          state.allUsers.push(action.payload);
        }
      })
      .addCase(fetchUserByUsernameThunk.rejected, (state, action) => {
        // state.status = 'failed';
        // state.error = action.payload as any;
      });
  },
});

export const {
  addUser,
  deleteUser,
  changePassword,
  banUser,
  unbanUser,
  warnUser,
  clearWarnings,
  updateUserDisplayName,
  updateUserAvatar,
  updateUserBio,
  changeUserRole,
  banUserByUsername,
  unbanUserByUsername,
  warnUserByUsername,
  clearWarningsByUsername,
  deleteUserByUsername,
  updateUserRole
} = usersSlice.actions;
export default usersSlice.reducer;