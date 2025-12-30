import axios, { AxiosInstance, AxiosError } from 'axios';

// Get API URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh and ban status
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const originalRequest = error.config as any;

    // Handle account banned error (403 with ACCOUNT_BANNED code)
    if (error.response?.status === 403 && error.response?.data?.code === 'ACCOUNT_BANNED') {
      // Update user in localStorage with ban info
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const banData = error.response.data.data || {};

      user.banned = true;
      user.banReason = banData.banReason || error.response.data.message;
      user.banExpiry = banData.banExpiry;

      localStorage.setItem('user', JSON.stringify(user));

      // Reload the app to show the banned modal
      window.location.reload();
      return Promise.reject(error);
    }

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Try to refresh the token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        // Store new tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');

        // Redirect to login (this will be handled by the app)
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// Helper function to handle API errors
export const handleApiError = (error: any): string => {
  const responseData = error.response?.data;

  // Handle USER_BANNED specifically with detailed Vietnamese message
  if (responseData?.code === 'USER_BANNED') {
    const details = responseData.data || {};
    const reason = details.reason || 'Vi phạm quy định cộng đồng';
    const permanent = details.permanent;
    const expiry = details.expiry;

    let message = '🚫 Tài khoản của bạn đã bị cấm\n\n';
    message += `📋 Lý do: ${reason}\n`;

    if (permanent) {
      message += '⏱️ Thời hạn: Vĩnh viễn';
    } else if (expiry) {
      const expiryDate = new Date(expiry);
      message += `⏱️ Hết hạn: ${expiryDate.toLocaleDateString('vi-VN')} lúc ${expiryDate.toLocaleTimeString('vi-VN')}`;
    }

    return message;
  }

  // Handle ACCOUNT_BANNED (from refresh token check)
  if (responseData?.code === 'ACCOUNT_BANNED') {
    return '🚫 Tài khoản của bạn đã bị cấm. Vui lòng liên hệ hỗ trợ.';
  }

  // Handle other known error codes with Vietnamese messages
  if (responseData?.code === 'INVALID_CREDENTIALS') {
    return 'Tên đăng nhập hoặc mật khẩu không đúng';
  }

  if (responseData?.message) {
    return responseData.message;
  }

  if (error.message) {
    return error.message;
  }

  return 'Đã xảy ra lỗi không xác định';
};
