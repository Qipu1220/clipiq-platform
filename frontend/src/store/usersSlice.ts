import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { User } from './authSlice';

interface UsersState {
  allUsers: User[];
  searchUserResults: User[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: UsersState = {
  allUsers: [
    // ... existing mock data ...
    {
      id: 'admin-001',
      username: 'admin001',
      email: 'admin@clipiq.com',
      role: 'admin',
      password: '123456',
      warnings: 0,
      createdAt: Date.now() - 86400000 * 365
    },
    // ... other mock data irrelevant for search state init ...
  ],
  searchUserResults: [], // Initialize search results
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

export const searchUsersThunk = createAsyncThunk(
  'users/searchUsers',
  async ({ query, page = 1 }: { query: string; page?: number }, { rejectWithValue }) => {
    try {
      const { searchUsersApi } = await import('../api/users');
      const response = await searchUsersApi(query, page);
      return response.data.data;
    } catch (error: any) {
      if (error.response && error.response.data) {
        return rejectWithValue(error.response.data);
      }
      return rejectWithValue({ message: 'Failed to search users' });
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
      // Fetch User By Username
      .addCase(fetchUserByUsernameThunk.pending, (state) => {
        // state.status = 'loading';
      })
      .addCase(fetchUserByUsernameThunk.fulfilled, (state, action) => {
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
      })

      // Search Users
      .addCase(searchUsersThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(searchUsersThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.searchUserResults = action.payload.users;
      })
      .addCase(searchUsersThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as any;
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