import apiClient from './client';

export interface LoginRequest {
  login: string; // email or username
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: string;
      username: string;
      email: string;
      role: 'admin' | 'staff' | 'user';
      displayName?: string;
      bio?: string;
      avatarUrl?: string;
      warnings: number;
      banned?: boolean;
      banExpiry?: string;
      banReason?: string;
      createdAt?: string;
      updatedAt?: string;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
}

export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface UserInfoResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    username: string;
    email: string;
    role: 'admin' | 'staff' | 'user';
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    warnings: number;
    banned: boolean;
    banExpiry?: string;
    banReason?: string;
    createdAt: string;
    updatedAt: string;
  };
}

// Login with username/email and password
export const loginApi = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
  return response.data;
};

// Logout (invalidate refresh token)
export const logoutApi = async (): Promise<void> => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (refreshToken) {
    await apiClient.post('/auth/logout', { refreshToken });
  }
};

// Refresh access token
export const refreshTokenApi = async (refreshToken: string): Promise<RefreshTokenResponse> => {
  const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh', { refreshToken });
  return response.data;
};

// Get current user info
export const getCurrentUserApi = async (): Promise<UserInfoResponse> => {
  const response = await apiClient.get<UserInfoResponse>('/auth/me');
  return response.data;
};
