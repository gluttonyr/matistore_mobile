import api from '@/lib/api';
import { logError } from '@/lib/logger';
import { Parametre } from '@/models/parametre.types';

export const parametreService = {
  getAll: async (): Promise<Parametre[]> => {
    try {
      const response = await api.get<Parametre[]>('/parametres');
      return response;
    } catch (error) {
      logError('Get parametres failed');
      throw error;
    }
  },

  getById: async (id: string): Promise<Parametre> => {
    try {
      const response = await api.get<Parametre>(`/parametres/${id}`);
      return response;
    } catch (error) {
      logError('Get parametre failed');
      throw error;
    }
  },
};
