import { apiClient } from './api';
import { DashboardSummary, ApiResponse } from '../types';

export interface ProgrammeActivity {
  programme: string;
  totalIssues: number;
  activeIssues: number;
  uniqueStudents: number;
}

export interface LaboratoryActivity {
  _id: string;
  locationCode: string;
  department: string;
  building: string;
  room: string;
  cupboard: string;
  itemCount: number;
  assetCount: number;
  totalStock: number;
  availableQty: number;
  issuedQty: number;
  damagedQty: number;
  maintenanceQty: number;
}

export const reportService = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await apiClient.get<ApiResponse<DashboardSummary>>('/reports/summary');
    return res.data.data;
  },

  async getOverdueReport(): Promise<any[]> {
    const res = await apiClient.get<ApiResponse<any[]>>('/reports/overdue');
    return res.data.data;
  },

  async getInventoryHealthReport(): Promise<any[]> {
    const res = await apiClient.get<ApiResponse<any[]>>('/reports/inventory-health');
    return res.data.data;
  },

  async getStudentBorrowingReport(studentId?: string): Promise<any[]> {
    const res = await apiClient.get<ApiResponse<any[]>>('/reports/student-borrowing', {
      params: studentId ? { studentId } : undefined,
    });
    return res.data.data;
  },

  async getProgrammeActivity(): Promise<ProgrammeActivity[]> {
    const res = await apiClient.get<ApiResponse<ProgrammeActivity[]>>('/reports/programme-activity');
    return res.data.data;
  },

  async getLaboratoryActivity(): Promise<LaboratoryActivity[]> {
    const res = await apiClient.get<ApiResponse<LaboratoryActivity[]>>('/reports/laboratory-activity');
    return res.data.data;
  },

  async getConditionItems(): Promise<{ quantityBased: any[]; individualAssets: any[] }> {
    const res = await apiClient.get<ApiResponse<{ quantityBased: any[]; individualAssets: any[] }>>('/reports/condition-items');
    return res.data.data;
  },
};
