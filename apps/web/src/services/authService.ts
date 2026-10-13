import { apiClient } from './api';
import { User, ApiResponse } from '../types';

export interface LoginPayload {
  email: string;
  password?: string;
  role?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const res = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', payload);
    return res.data.data;
  },

  async getMe(): Promise<User> {
    const res = await apiClient.get<ApiResponse<User>>('/auth/me');
    return res.data.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem('dims_token');
      localStorage.removeItem('dims_user');
    }
  },
};
