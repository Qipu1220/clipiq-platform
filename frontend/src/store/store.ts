import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import videosReducer from './videosSlice';
import usersReducer from './usersSlice';
import reportsReducer from './reportsSlice';
import notificationsReducer from './notificationsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    videos: videosReducer,
    users: usersReducer,
    reports: reportsReducer,
    notifications: notificationsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;