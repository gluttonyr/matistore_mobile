import api from '@/data_api/lib/api';
import { logError } from '@/data_api/lib/logger';
import { ServculPlayer } from '@/data_api/models/servcul.types';
import axios from 'axios';

interface BackendApiResponse<T> {
  data: T;
  message: string;
  status: number;
}

export const servculService = {
  findPlayer: async (
    userId: number | string,
    signal?: AbortSignal,
  ): Promise<ServculPlayer | null> => {
    try {
      const response = await api.get<BackendApiResponse<ServculPlayer | null>>(
        `/servcul/users/${encodeURIComponent(String(userId))}`,
        { signal },
      );
      return response.data;
    } catch (error) {
      if (!axios.isCancel(error)) logError('Servcul player lookup failed');
      throw error;
    }
  },
};
