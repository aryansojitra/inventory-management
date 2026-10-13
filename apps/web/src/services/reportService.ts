import { apiClient } from './api';
import { DashboardSummary, ApiResponse } from '../types';

export const reportService = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await apiClient.get<ApiResponse<DashboardSummary>>('/reports/summary');
    return res.data.data;
  },

  async getOverdueReport(): Promise<unknown[]> {
    const res = await apiClient.get<ApiResponse<unknown[]>>('/reports/overdue');
    return res.data.data;
  },

  async getInventoryHealthReport(): Promise<unknown[]> {
    const res = await apiClient.get<ApiResponse<unknown[]>>('/reports/inventory-health');
    return res.data.data;
  },

  async getStudentBorrowingReport(): Promise<unknown[]> {
    const res = await apiClient.get<ApiResponse<unknown[]>>('/reports/student-borrowing');
    return res.data.data;
  },
};
