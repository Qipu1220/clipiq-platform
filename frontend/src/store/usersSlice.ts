import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from './authSlice';

interface UsersState {
  allUsers: User[];
}

const initialState: UsersState = {
  allUsers: [
    { username: 'admin001', role: 'admin', password: '123456', warnings: 0 },
    { username: 'staff001', role: 'staff', password: '123456', warnings: 0 },
    { username: 'user001', role: 'user', password: '123456', warnings: 0 },
    { username: 'user002', role: 'user', password: '123456', warnings: 0 },
    { username: 'creator123', role: 'user', password: '123456', warnings: 0 },
  ],
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    addUser: (state, action: PayloadAction<User>) => {
      state.allUsers.push(action.payload);
    },
    deleteUser: (state, action: PayloadAction<string>) => {
      state.allUsers = state.allUsers.filter(u => u.username !== action.payload);
    },
    changePassword: (state, action: PayloadAction<{ username: string; newPassword: string }>) => {
      const user = state.allUsers.find(u => u.username === action.payload.username);
      if (user) {
        user.password = action.payload.newPassword;
      }
    },
    banUser: (state, action: PayloadAction<{ username: string; duration?: number }>) => {
      const user = state.allUsers.find(u => u.username === action.payload.username);
      if (user) {
        user.banned = true;
        if (action.payload.duration) {
          user.banExpiry = Date.now() + action.payload.duration * 24 * 60 * 60 * 1000;
        }
      }
    },
    unbanUser: (state, action: PayloadAction<string>) => {
      const user = state.allUsers.find(u => u.username === action.payload);
      if (user) {
        user.banned = false;
        user.banExpiry = undefined;
      }
    },
    warnUser: (state, action: PayloadAction<string>) => {
      const user = state.allUsers.find(u => u.username === action.payload);
      if (user) {
        user.warnings = (user.warnings || 0) + 1;
      }
    },
    clearWarnings: (state, action: PayloadAction<string>) => {
      const user = state.allUsers.find(u => u.username === action.payload);
      if (user) {
        user.warnings = 0;
      }
    },
    updateUserDisplayName: (state, action: PayloadAction<{ username: string; displayName: string }>) => {
      const user = state.allUsers.find(u => u.username === action.payload.username);
      if (user) {
        user.displayName = action.payload.displayName;
      }
    },
    updateUserAvatar: (state, action: PayloadAction<{ username: string; avatarUrl: string }>) => {
      const user = state.allUsers.find(u => u.username === action.payload.username);
      if (user) {
        user.avatarUrl = action.payload.avatarUrl;
      }
    },
    changeUserRole: (state, action: PayloadAction<{ username: string; role: 'admin' | 'staff' | 'user' }>) => {
      const user = state.allUsers.find(u => u.username === action.payload.username);
      if (user) {
        user.role = action.payload.role;
      }
    },
  },
});

export const { addUser, deleteUser, changePassword, banUser, unbanUser, warnUser, clearWarnings, updateUserDisplayName, updateUserAvatar, changeUserRole } = usersSlice.actions;
export default usersSlice.reducer;