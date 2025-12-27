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

export interface SearchUsersResponse {
    success: boolean;
    data: {
        users: User[];
        pagination: {
            total: number;
            page: number;
            pages: number;
        };
    };
}

export const searchUsersApi = (query: string, page: number = 1) => {
    return apiClient.get<SearchUsersResponse>('/users/search', {
        params: { q: query, page }
    });
};
