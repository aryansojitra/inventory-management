import { apiClient } from './api';
import { AppNotification, ApiResponse } from '../types';

export const notificationService = {
  async getNotifications(): Promise<AppNotification[]> {
    const res = await apiClient.get<ApiResponse<AppNotification[]>>('/notifications');
    return res.data.data;
  },

  async markAsRead(id: string): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await apiClient.patch('/notifications/read-all');
  },
};
