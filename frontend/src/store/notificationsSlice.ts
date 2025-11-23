import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Notification {
  id: string;  // UUID
  type: 'new_video' | 'new_comment' | 'new_like' | 'new_subscriber' | 'system';  // NEW: Multiple types
  receiverId: string;  // NEW: User ID receiving notification
  actorId?: string;  // NEW: User ID who triggered notification
  actorUsername?: string;  // Denormalized
  videoId?: string;  // Optional video reference
  videoTitle?: string;  // Denormalized
  commentId?: string;  // NEW: Optional comment reference
  message?: string;  // NEW: Custom message for system notifications
  timestamp: number;
  read: boolean;
}

interface NotificationsState {
  notifications: Notification[];
  subscriptions: { [userId: string]: string[] }; // userId -> array of userIds they follow
}

const initialState: NotificationsState = {
  notifications: [],
  subscriptions: {},
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    subscribeToUser: (state, action: PayloadAction<{ followerId: string; followingId: string }>) => {
      const { followerId, followingId } = action.payload;
      if (!state.subscriptions[followerId]) {
        state.subscriptions[followerId] = [];
      }
      if (!state.subscriptions[followerId].includes(followingId)) {
        state.subscriptions[followerId].push(followingId);
      }
    },
    unsubscribeFromUser: (state, action: PayloadAction<{ followerId: string; followingId: string }>) => {
      const { followerId, followingId } = action.payload;
      if (state.subscriptions[followerId]) {
        state.subscriptions[followerId] = state.subscriptions[followerId].filter(u => u !== followingId);
      }
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
});

export const {
  subscribeToUser,
  unsubscribeFromUser,
  addNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;