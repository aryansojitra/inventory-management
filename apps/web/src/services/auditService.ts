import { apiClient } from './api';
import { AuditLog, PaginatedResponse } from '../types';

export const auditService = {
  async getAuditLogs(params?: {
    action?: string;
    entityType?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<AuditLog>> {
    const res = await apiClient.get<PaginatedResponse<AuditLog>>('/audit-logs', { params });
    return res.data;
  },
};
