import api from '@/data_api/lib/api';
import { logError } from '@/data_api/lib/logger';
import { Banniere, CreateBanniereDto, UpdateBanniereDto } from '@/data_api/models/banniere.types';

type ApiResponse<T> = { data: T; message?: string; status?: number };

export const banniereService = {
  getAll: async (): Promise<Banniere[]> => {
    try {
      const response = await api.get<ApiResponse<Banniere[]>>('/banners');
      return response.data;
    } catch (error) {
      logError('Get bannieres failed');
      throw error;
    }
  },

  getById: async (id: string): Promise<Banniere> => {
    try {
      const response = await api.get<ApiResponse<Banniere>>(`/banners/${id}`);
      return response.data;
    } catch (error) {
      logError('Get banniere failed');
      throw error;
    }
  },

  create: async (data: CreateBanniereDto, file?: { uri: string; name: string; type: string }): Promise<Banniere> => {
    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.type,
        } as any);
      }
      formData.append('data', JSON.stringify(data));
      formData.append('prefix', 'banner_');
      formData.append('folder', 'banners');

      const response = await api.post<ApiResponse<Banniere>>('/banners', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      } as any);
      return response.data;
    } catch (error) {
      logError('Create banniere failed');
      throw error;
    }
  },

  update: async (
    id: string,
    data: UpdateBanniereDto,
    file?: { uri: string; name: string; type: string },
  ): Promise<Banniere> => {
    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.type,
        } as any);
      }
      formData.append('data', JSON.stringify(data));
      formData.append('prefix', 'banner_');
      formData.append('folder', 'banners');

      const response = await api.put<ApiResponse<Banniere>>(`/banners/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      } as any);
      return response.data;
    } catch (error) {
      logError('Update banniere failed');
      throw error;
    }
  },

  remove: async (id: string): Promise<void> => {
    try {
      await api.delete(`/banners/${id}`);
    } catch (error) {
      logError('Delete banniere failed');
      throw error;
    }
  },

  reorder: async (trackingIds: string[]): Promise<Banniere[]> => {
    try {
      const response = await api.put<ApiResponse<Banniere[]>>('/banners/reorder', { trackingIds });
      return response.data;
    } catch (error) {
      logError('Reorder bannieres failed');
      throw error;
    }
  },
};
