import { apiClient } from './api';
import { Student, ApiResponse, PaginatedResponse } from '../types';

export const studentService = {
  async getStudents(params?: {
    search?: string;
    department?: string;
    activeOnly?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Student>> {
    const res = await apiClient.get<PaginatedResponse<Student>>('/students', { params });
    return res.data;
  },

  async getStudentById(id: string): Promise<Student> {
    const res = await apiClient.get<ApiResponse<Student>>(`/students/${id}`);
    return res.data.data;
  },

  async createStudent(student: Partial<Student>): Promise<Student> {
    const res = await apiClient.post<ApiResponse<Student>>('/students', student);
    return res.data.data;
  },

  async updateStudent(id: string, updates: Partial<Student>): Promise<Student> {
    const res = await apiClient.put<ApiResponse<Student>>(`/students/${id}`, updates);
    return res.data.data;
  },
};
