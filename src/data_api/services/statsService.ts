import api from '@/data_api/lib/api';
import { logError } from '@/data_api/lib/logger';
import { AdminDashboardStats } from '@/data_api/models/stats.types';

type ApiResponse<T> = { data: T; message?: string; status?: number };

export const statsService = {
  getAdminDashboardStats: async (): Promise<AdminDashboardStats> => {
    try {
      const response = await api.get<ApiResponse<AdminDashboardStats>>('/admin/stats');
      return response.data;
    } catch (error) {
      logError('Get admin dashboard stats failed');
      throw error;
    }
  },
};
