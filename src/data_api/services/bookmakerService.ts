import api from '@/data_api/lib/api';
import { logError } from '@/data_api/lib/logger';
import { Bookmaker } from '@/data_api/models/bookmaker.types';

export const bookmakerService = {
  getAll: async (): Promise<Bookmaker[]> => {
    try {
      const response = await api.get<{ data: Bookmaker[] }>('/bookmakers');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      logError('Get bookmakers failed');
      throw error;
    }
  },
};
