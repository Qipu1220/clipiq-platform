import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface VideoReport {
  id: string;  // UUID
  videoId: string;  // UUID
  videoTitle: string;
  reportedBy: string;  // User ID
  reportedByUsername: string;  // Denormalized
  reason: string;
  evidenceUrl?: string;  // NEW: Optional evidence screenshot
  timestamp: number;
  status: 'pending' | 'reviewed' | 'resolved';  // NEW: Added 'reviewed' status
  reviewedBy?: string;  // NEW: Staff user ID who reviewed
  reviewedByUsername?: string;  // NEW: Denormalized
  reviewedAt?: number;  // NEW: Timestamp
  resolutionNote?: string;  // NEW: Staff notes
}

export interface UserReport {
  id: string;  // UUID
  reportedUserId: string;  // UUID
  reportedUsername: string;  // Denormalized
  reportedBy: string;  // User ID
  reportedByUsername: string;  // Denormalized
  reason: string;
  evidenceUrl?: string;  // NEW: Optional evidence
  timestamp: number;
  status: 'pending' | 'reviewed' | 'resolved';  // NEW: Added 'reviewed'
  reviewedBy?: string;  // NEW: Staff user ID
  reviewedByUsername?: string;  // NEW: Denormalized
  reviewedAt?: number;  // NEW: Timestamp
  resolutionNote?: string;  // NEW: Staff notes
}

export interface CommentReport {
  id: string;  // UUID
  commentId: string;
  commentText: string;
  commentUsername: string;
  videoId: string;
  videoTitle: string;
  reportedBy: string;  // User ID
  reportedByUsername: string;  // Denormalized
  reason: string;
  timestamp: number;
  status: 'pending' | 'reviewed' | 'resolved';
  reviewedBy?: string;
  reviewedByUsername?: string;
  reviewedAt?: number;
  resolutionNote?: string;
}

export interface Appeal {
  id: string;  // UUID
  userId: string;  // UUID
  username: string;  // Denormalized
  reason: string;
  timestamp: number;
  status: 'pending' | 'approved' | 'denied';
  reviewedBy?: string;  // NEW: Staff user ID
  reviewedByUsername?: string;  // NEW: Denormalized
  reviewedAt?: number;  // NEW: Timestamp
  resolutionNote?: string;  // NEW: Staff notes
}

interface ReportsState {
  videoReports: VideoReport[];
  userReports: UserReport[];
  commentReports: CommentReport[];
  appeals: Appeal[];
}

const initialState: ReportsState = {
  videoReports: [
    {
      id: 'vr1',
      videoId: 'video-1',
      videoTitle: 'Getting Started with React',
      reportedBy: 'user-002',
      reportedByUsername: 'user002',
      reason: 'Misleading content',
      timestamp: Date.now() - 3600000,
      status: 'pending',
    },
  ],
  userReports: [
    {
      id: 'ur1',
      reportedUserId: 'user-002',
      reportedUsername: 'user002',
      reportedBy: 'user-001',
      reportedByUsername: 'user001',
      reason: 'Spam comments',
      timestamp: Date.now() - 7200000,
      status: 'pending',
    },
  ],
  commentReports: [],
  appeals: [],
};

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    setVideoReports: (state, action: PayloadAction<VideoReport[]>) => {
      state.videoReports = action.payload;
    },
    addVideoReport: (state, action: PayloadAction<VideoReport>) => {
      state.videoReports.push(action.payload);
    },
    addUserReport: (state, action: PayloadAction<UserReport>) => {
      state.userReports.push(action.payload);
    },
    addCommentReport: (state, action: PayloadAction<CommentReport>) => {
      state.commentReports.push(action.payload);
    },
    addAppeal: (state, action: PayloadAction<Appeal>) => {
      state.appeals.push(action.payload);
    },
    resolveVideoReport: (state, action: PayloadAction<{ 
      id: string; 
      reviewedBy: string; 
      reviewedByUsername: string;
      resolutionNote?: string;
    }>) => {
      const report = state.videoReports.find(r => r.id === action.payload.id);
      if (report) {
        report.status = 'resolved';
        report.reviewedBy = action.payload.reviewedBy;
        report.reviewedByUsername = action.payload.reviewedByUsername;
        report.reviewedAt = Date.now();
        report.resolutionNote = action.payload.resolutionNote;
      }
    },
    resolveUserReport: (state, action: PayloadAction<{ 
      id: string; 
      reviewedBy: string;
      reviewedByUsername: string;
      resolutionNote?: string;
    }>) => {
      const report = state.userReports.find(r => r.id === action.payload.id);
      if (report) {
        report.status = 'resolved';
        report.reviewedBy = action.payload.reviewedBy;
        report.reviewedByUsername = action.payload.reviewedByUsername;
        report.reviewedAt = Date.now();
        report.resolutionNote = action.payload.resolutionNote;
      }
    },
    resolveCommentReport: (state, action: PayloadAction<{ 
      id: string; 
      reviewedBy: string;
      reviewedByUsername: string;
      resolutionNote?: string;
    }>) => {
      const report = state.commentReports.find(r => r.id === action.payload.id);
      if (report) {
        report.status = 'resolved';
        report.reviewedBy = action.payload.reviewedBy;
        report.reviewedByUsername = action.payload.reviewedByUsername;
        report.reviewedAt = Date.now();
        report.resolutionNote = action.payload.resolutionNote;
      }
    },
    updateAppealStatus: (state, action: PayloadAction<{ 
      id: string; 
      status: 'approved' | 'denied';
      reviewedBy: string;
      reviewedByUsername: string;
      resolutionNote?: string;
    }>) => {
      const appeal = state.appeals.find(a => a.id === action.payload.id);
      if (appeal) {
        appeal.status = action.payload.status;
        appeal.reviewedBy = action.payload.reviewedBy;
        appeal.reviewedByUsername = action.payload.reviewedByUsername;
        appeal.reviewedAt = Date.now();
        appeal.resolutionNote = action.payload.resolutionNote;
      }
    },
  },
});

export const { 
  setVideoReports,
  addVideoReport, 
  addUserReport, 
  addCommentReport,
  addAppeal, 
  resolveVideoReport, 
  resolveUserReport, 
  resolveCommentReport,
  updateAppealStatus 
} = reportsSlice.actions;
export default reportsSlice.reducer;