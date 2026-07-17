import api from '@/data_api/lib/api';
import { logError } from '@/data_api/lib/logger';
import { Categorie, CreateCategorieDto, UpdateCategorieDto } from '@/data_api/models/categorie.types';

type ApiResponse<T> = { data: T; message?: string; status?: number };

export const categorieService = {
  getAll: async (): Promise<Categorie[]> => {
    try {
      const response = await api.get<ApiResponse<Categorie[]>>('/categories');
      return response.data;
    } catch (error) {
      logError('Get categories failed');
      throw error;
    }
  },

  getById: async (id: string): Promise<Categorie> => {
    try {
      const response = await api.get<ApiResponse<Categorie>>(`/categories/${id}`);
      return response.data;
    } catch (error) {
      logError('Get categorie failed');
      throw error;
    }
  },

  create: async (data: CreateCategorieDto): Promise<Categorie> => {
    try {
      const response = await api.post<ApiResponse<Categorie>>('/categories', data);
      return response.data;
    } catch (error) {
      logError('Create categorie failed');
      throw error;
    }
  },

  update: async (id: string, data: UpdateCategorieDto): Promise<Categorie> => {
    try {
      const response = await api.put<ApiResponse<Categorie>>(`/categories/${id}`, data);
      return response.data;
    } catch (error) {
      logError('Update categorie failed');
      throw error;
    }
  },

  remove: async (id: string): Promise<void> => {
    try {
      await api.delete(`/categories/${id}`);
    } catch (error) {
      logError('Delete categorie failed');
      throw error;
    }
  },
};
