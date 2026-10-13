import { apiClient } from './api';
import {
  IssueRecord,
  ReturnTransaction,
  RenewalRequest,
  ApiResponse,
  PaginatedResponse,
} from '../types';

export interface CreateIssuePayload {
  studentId: string;
  expectedReturnDate?: string;
  purpose?: string;
  notes?: string;
  lines: Array<{
    itemId: string;
    quantity: number;
    assetId?: string;
    dueDate?: string;
  }>;
}

export interface ProcessReturnPayload {
  issueId: string;
  notes?: string;
  items: Array<{
    lineId: string;
    quantityReturned: number;
    condition: 'good' | 'damaged' | 'lost';
    notes?: string;
  }>;
}

export const issueService = {
  // Issues
  async createIssue(payload: CreateIssuePayload): Promise<IssueRecord> {
    const res = await apiClient.post<ApiResponse<IssueRecord>>('/issues', payload);
    return res.data.data;
  },

  async getAllIssues(params?: {
    status?: string;
    studentId?: string;
    overdueOnly?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<IssueRecord>> {
    const res = await apiClient.get<PaginatedResponse<IssueRecord>>('/issues', { params });
    return res.data;
  },

  async getIssueById(id: string): Promise<IssueRecord> {
    const res = await apiClient.get<ApiResponse<IssueRecord>>(`/issues/${id}`);
    return res.data.data;
  },

  async getMyIssues(): Promise<IssueRecord[]> {
    const res = await apiClient.get<ApiResponse<IssueRecord[]>>('/issues/my');
    return res.data.data;
  },

  async getOverdueIssues(): Promise<IssueRecord[]> {
    const res = await apiClient.get<ApiResponse<IssueRecord[]>>('/issues/overdue');
    return res.data.data;
  },

  // Returns
  async processReturn(payload: ProcessReturnPayload): Promise<ReturnTransaction> {
    const res = await apiClient.post<ApiResponse<ReturnTransaction>>('/returns', payload);
    return res.data.data;
  },

  async getReturnHistory(params?: { page?: number; limit?: number }): Promise<PaginatedResponse<ReturnTransaction>> {
    const res = await apiClient.get<PaginatedResponse<ReturnTransaction>>('/returns', { params });
    return res.data;
  },

  // Renewals
  async requestRenewal(payload: {
    issueId: string;
    lineId: string;
    daysRequested?: number;
    reason: string;
  }): Promise<RenewalRequest> {
    const res = await apiClient.post<ApiResponse<RenewalRequest>>('/renewals/request', payload);
    return res.data.data;
  },

  async approveRenewal(id: string, notes?: string): Promise<RenewalRequest> {
    const res = await apiClient.patch<ApiResponse<RenewalRequest>>(`/renewals/${id}/approve`, { reviewNotes: notes });
    return res.data.data;
  },

  async rejectRenewal(id: string, notes: string): Promise<RenewalRequest> {
    const res = await apiClient.patch<ApiResponse<RenewalRequest>>(`/renewals/${id}/reject`, { reviewNotes: notes });
    return res.data.data;
  },

  async getAllRenewals(params?: { status?: string; page?: number; limit?: number }): Promise<PaginatedResponse<RenewalRequest>> {
    const res = await apiClient.get<PaginatedResponse<RenewalRequest>>('/renewals', { params });
    return res.data;
  },
};
