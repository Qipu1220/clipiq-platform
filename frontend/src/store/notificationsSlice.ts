import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  followUserApi,
  unfollowUserApi,
  getFollowingIdsApi,
  getFollowingApi,
  getFollowCountsApi
} from '../api/subscriptions';

export interface Notification {
  id: string;  // UUID
  type: 'new_video' | 'new_comment' | 'new_like' | 'new_subscriber' | 'system';
  receiverId: string;
  actorId?: string;
  actorUsername?: string;
  videoId?: string;
  videoTitle?: string;
  commentId?: string;
  message?: string;
  timestamp: number;
  read: boolean;
}

interface NotificationsState {
  notifications: Notification[];
  followingIds: string[]; // Array of user IDs that current user follows
  followingUsernames: string[]; // Array of usernames for backwards compatibility
  subscriptions: { [userId: string]: string[] }; // Legacy format: userId -> array of usernames they follow
  followCounts: {
    followingCount: number;
    followersCount: number;
  };
  subscriptionLoading: boolean;
  subscriptionError: string | null;
}

const initialState: NotificationsState = {
  notifications: [],
  followingIds: [],
  followingUsernames: [],
  subscriptions: {}, // Legacy format for backwards compatibility
  followCounts: {
    followingCount: 0,
    followersCount: 0
  },
  subscriptionLoading: false,
  subscriptionError: null,
};

// Async thunks for subscription API calls

export const fetchFollowingIdsThunk = createAsyncThunk(
  'notifications/fetchFollowingIds',
  async (_, { rejectWithValue }) => {
    try {
      const result = await getFollowingIdsApi();
      return result.followingIds;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch following');
    }
  }
);

// Fetch full following list (with usernames) for backwards compatibility
export const fetchFollowingThunk = createAsyncThunk(
  'notifications/fetchFollowing',
  async (_, { rejectWithValue }) => {
    try {
      const result = await getFollowingApi();
      return result.following;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch following');
    }
  }
);

export const fetchFollowCountsThunk = createAsyncThunk(
  'notifications/fetchFollowCounts',
  async (_, { rejectWithValue }) => {
    try {
      const result = await getFollowCountsApi();
      return result;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch counts');
    }
  }
);

export const followUserThunk = createAsyncThunk(
  'notifications/followUser',
  async ({ userId, username }: { userId: string; username: string }, { rejectWithValue }) => {
    try {
      await followUserApi(userId);
      return { userId, username };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to follow user');
    }
  }
);

export const unfollowUserThunk = createAsyncThunk(
  'notifications/unfollowUser',
  async ({ userId, username }: { userId: string; username: string }, { rejectWithValue }) => {
    try {
      await unfollowUserApi(userId);
      return { userId, username };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to unfollow user');
    }
  }
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // Keep local subscription actions for optimistic updates (legacy format)
    subscribeToUser: (state, action: PayloadAction<{ follower: string; following: string }>) => {
      const { follower, following } = action.payload;
      // Update legacy subscriptions object
      if (!state.subscriptions[follower]) {
        state.subscriptions[follower] = [];
      }
      if (!state.subscriptions[follower].includes(following)) {
        state.subscriptions[follower].push(following);
      }
      // Also update followingUsernames
      if (!state.followingUsernames.includes(following)) {
        state.followingUsernames.push(following);
        state.followCounts.followingCount += 1;
      }
    },
    unsubscribeFromUser: (state, action: PayloadAction<{ follower: string; following: string }>) => {
      const { follower, following } = action.payload;
      // Update legacy subscriptions object
      if (state.subscriptions[follower]) {
        state.subscriptions[follower] = state.subscriptions[follower].filter(u => u !== following);
      }
      // Also update followingUsernames
      state.followingUsernames = state.followingUsernames.filter(u => u !== following);
      state.followCounts.followingCount = Math.max(0, state.followCounts.followingCount - 1);
    },
    clearSubscriptionError: (state) => {
      state.subscriptionError = null;
    },
    // Set subscriptions directly (for initialization)
    setSubscriptions: (state, action: PayloadAction<{ username: string; following: string[] }>) => {
      const { username, following } = action.payload;
      state.subscriptions[username] = following;
      state.followingUsernames = following;
    },
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'read'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: `notif-${Date.now()}-${Math.random()}`,
        read: false,
      };
      state.notifications.unshift(notification);
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        notification.read = true;
      }
    },
    markAllAsRead: (state) => {
      state.notifications.forEach(n => n.read = true);
    },
    deleteNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    // Fetch following IDs
    builder
      .addCase(fetchFollowingIdsThunk.pending, (state) => {
        state.subscriptionLoading = true;
        state.subscriptionError = null;
      })
      .addCase(fetchFollowingIdsThunk.fulfilled, (state, action) => {
        state.subscriptionLoading = false;
        state.followingIds = action.payload;
      })
      .addCase(fetchFollowingIdsThunk.rejected, (state, action) => {
        state.subscriptionLoading = false;
        state.subscriptionError = action.payload as string;
      });

    // Fetch full following list
    builder
      .addCase(fetchFollowingThunk.fulfilled, (state, action) => {
        const following = action.payload;
        state.followingIds = following.map((u: any) => u.id);
        state.followingUsernames = following.map((u: any) => u.username);
      });

    // Fetch follow counts
    builder
      .addCase(fetchFollowCountsThunk.fulfilled, (state, action) => {
        state.followCounts = action.payload;
      });

    // Follow user
    builder
      .addCase(followUserThunk.pending, (state) => {
        state.subscriptionLoading = true;
      })
      .addCase(followUserThunk.fulfilled, (state, action) => {
        state.subscriptionLoading = false;
        const { userId, username } = action.payload;
        if (!state.followingIds.includes(userId)) {
          state.followingIds.push(userId);
        }
        if (!state.followingUsernames.includes(username)) {
          state.followingUsernames.push(username);
        }
        state.followCounts.followingCount += 1;
      })
      .addCase(followUserThunk.rejected, (state, action) => {
        state.subscriptionLoading = false;
        state.subscriptionError = action.payload as string;
      });

    // Unfollow user
    builder
      .addCase(unfollowUserThunk.pending, (state) => {
        state.subscriptionLoading = true;
      })
      .addCase(unfollowUserThunk.fulfilled, (state, action) => {
        state.subscriptionLoading = false;
        const { userId, username } = action.payload;
        state.followingIds = state.followingIds.filter(id => id !== userId);
        state.followingUsernames = state.followingUsernames.filter(u => u !== username);
        state.followCounts.followingCount = Math.max(0, state.followCounts.followingCount - 1);
      })
      .addCase(unfollowUserThunk.rejected, (state, action) => {
        state.subscriptionLoading = false;
        state.subscriptionError = action.payload as string;
      });
  },
});

export const {
  subscribeToUser,
  unsubscribeFromUser,
  clearSubscriptionError,
  setSubscriptions,
  addNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;