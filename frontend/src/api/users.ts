import apiClient from './client';
import { User } from '../store/authSlice';

export interface UserResponse {
    success: boolean;
    data: User;
}

export interface StaffStats {
    reportsProcessed: number;
    usersWarned: number;
    usersBanned: number;
    daysActive: number;
    lastActivity: string | null;
}

export interface StaffStatsResponse {
    success: boolean;
    data: StaffStats;
}

export interface UpdateProfileData {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    email?: string;
}

export const fetchUserByUsernameApi = (username: string) => {
    return apiClient.get<UserResponse>(`/users/${username}`);
};

export const getCurrentUserProfileApi = () => {
    return apiClient.get<UserResponse>('/users/me');
};

export const getStaffStatsApi = () => {
    return apiClient.get<StaffStatsResponse>('/staff/profile/stats');
};

export const updateUserProfileApi = (username: string, data: UpdateProfileData) => {
    return apiClient.put<UserResponse>(`/users/${username}`, data);
};
