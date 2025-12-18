import apiClient from './client';
import { User } from '../store/authSlice';

export interface UserResponse {
    success: boolean;
    data: User;
}

export const fetchUserByUsernameApi = (username: string) => {
    return apiClient.get<UserResponse>(`/users/${username}`);
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
