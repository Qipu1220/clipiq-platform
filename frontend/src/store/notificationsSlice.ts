import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Notification {
  id: string;
  type: 'new_video';
  uploaderUsername: string;
  videoId: string;
  videoTitle: string;
  timestamp: number;
  read: boolean;
}

interface NotificationsState {
  notifications: Notification[];
  subscriptions: { [username: string]: string[] }; // username -> array of usernames they follow
}

const initialState: NotificationsState = {
  notifications: [],
  subscriptions: {},
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    subscribeToUser: (state, action: PayloadAction<{ follower: string; following: string }>) => {
      const { follower, following } = action.payload;
      if (!state.subscriptions[follower]) {
        state.subscriptions[follower] = [];
      }
      if (!state.subscriptions[follower].includes(following)) {
        state.subscriptions[follower].push(following);
      }
    },
    unsubscribeFromUser: (state, action: PayloadAction<{ follower: string; following: string }>) => {
      const { follower, following } = action.payload;
      if (state.subscriptions[follower]) {
        state.subscriptions[follower] = state.subscriptions[follower].filter(u => u !== following);
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
