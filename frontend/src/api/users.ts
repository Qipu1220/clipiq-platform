import apiClient from './client';
import { User } from '../store/authSlice';

export interface UserResponse {
    success: boolean;
    data: User;
}

export const fetchUserByUsernameApi = (username: string) => {
    return apiClient.get<UserResponse>(`/users/${username}`);
};
