import api from '@/data_api/lib/api';
import { logError } from '@/data_api/lib/logger';
import { CreateOperateurDto, Operateur, UpdateOperateurDto } from '@/data_api/models/operateur.types';

export const operateurService = {
  getAll: async (): Promise<Operateur[]> => {
    try {
      const response = await api.get<any>('/operateurs');
      return response.data;
    } catch (error) {
      logError('Get operateurs failed');
      throw error;
    }
  },

  getById: async (id: string): Promise<Operateur> => {
    try {
      return await api.get<Operateur>(`/operateurs/${id}`);
    } catch (error) {
      logError('Get operateur failed');
      throw error;
    }
  },

  create: async (data: CreateOperateurDto): Promise<Operateur> => {
    try {
      return await api.post<Operateur>('/operateurs', data);
    } catch (error) {
      logError('Create operateur failed');
      throw error;
    }
  },

  update: async (id: string, data: UpdateOperateurDto): Promise<Operateur> => {
    try {
      return await api.put<Operateur>(`/operateurs/${id}`, data);
    } catch (error) {
      logError('Update operateur failed');
      throw error;
    }
  },

  remove: async (id: string): Promise<void> => {
    try {
      await api.delete(`/operateurs/${id}`);
    } catch (error) {
      logError('Delete operateur failed');
      throw error;
    }
  },
};
