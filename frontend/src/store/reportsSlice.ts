import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface VideoReport {
  id: string;
  videoId: string;
  videoTitle: string;
  reportedBy: string;
  reason: string;
  timestamp: number;
  status: 'pending' | 'resolved';
}

export interface UserReport {
  id: string;
  reportedUser: string;
  reportedBy: string;
  reason: string;
  timestamp: number;
  status: 'pending' | 'resolved';
}

export interface Appeal {
  id: string;
  username: string;
  reason: string;
  timestamp: number;
  status: 'pending' | 'approved' | 'denied';
}

interface ReportsState {
  videoReports: VideoReport[];
  userReports: UserReport[];
  appeals: Appeal[];
}

const initialState: ReportsState = {
  videoReports: [
    {
      id: 'vr1',
      videoId: '1',
      videoTitle: 'Getting Started with React',
      reportedBy: 'user002',
      reason: 'Misleading content',
      timestamp: Date.now() - 3600000,
      status: 'pending',
    },
  ],
  userReports: [
    {
      id: 'ur1',
      reportedUser: 'user002',
      reportedBy: 'user001',
      reason: 'Spam comments',
      timestamp: Date.now() - 7200000,
      status: 'pending',
    },
  ],
  appeals: [],
};

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    addVideoReport: (state, action: PayloadAction<VideoReport>) => {
      state.videoReports.push(action.payload);
    },
    addUserReport: (state, action: PayloadAction<UserReport>) => {
      state.userReports.push(action.payload);
    },
    addAppeal: (state, action: PayloadAction<Appeal>) => {
      state.appeals.push(action.payload);
    },
    resolveVideoReport: (state, action: PayloadAction<string>) => {
      const report = state.videoReports.find(r => r.id === action.payload);
      if (report) {
        report.status = 'resolved';
      }
    },
    resolveUserReport: (state, action: PayloadAction<string>) => {
      const report = state.userReports.find(r => r.id === action.payload);
      if (report) {
        report.status = 'resolved';
      }
    },
    updateAppealStatus: (state, action: PayloadAction<{ id: string; status: 'approved' | 'denied' }>) => {
      const appeal = state.appeals.find(a => a.id === action.payload.id);
      if (appeal) {
        appeal.status = action.payload.status;
      }
    },
  },
});

export const { addVideoReport, addUserReport, addAppeal, resolveVideoReport, resolveUserReport, updateAppealStatus } = reportsSlice.actions;
export default reportsSlice.reducer;
