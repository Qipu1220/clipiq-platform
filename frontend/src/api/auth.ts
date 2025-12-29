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
    user: {
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
  };
}

export interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  message: string;
  data: {
    user: UserInfoResponse['data'];
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

// Google Sign-In Request
export interface GoogleLoginRequest {
  idToken: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

// Google Sign-In - Send Firebase ID token to backend
export const googleLoginApi = async (data: GoogleLoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/google', data);
  return response.data;
};

// Get current user info
export const getCurrentUserApi = async (): Promise<UserInfoResponse> => {
  const response = await apiClient.get<UserInfoResponse>('/auth/me');
  return response.data;
};
// Update user profile
export const updateProfileApi = async (data: UpdateProfileRequest): Promise<UpdateProfileResponse> => {
  const response = await apiClient.patch<UpdateProfileResponse>('/auth/me', data);
  return response.data;
};

// Upload user avatar
export const uploadAvatarApi = async (avatar: string): Promise<UpdateProfileResponse> => {
  const response = await apiClient.patch<UpdateProfileResponse>('/auth/avatar', { avatar });
  return response.data;
};

// Get system status (maintenance mode)
export const getSystemStatusApi = async (): Promise<{ success: boolean; data: { maintenanceMode: boolean; serviceMaintenanceMode: boolean } }> => {
  const response = await apiClient.get('/auth/status');
  return response.data;
};
