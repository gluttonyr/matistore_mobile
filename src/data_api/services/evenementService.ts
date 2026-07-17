import api from '@/data_api/lib/api';
import { logError } from '@/data_api/lib/logger';
import { CreateEvenementDto, Evenement, UpdateEvenementDto } from '@/data_api/models/evenement.types';

type ApiResponse<T> = { data: T; message?: string; status?: number };

export const evenementService = {
  getAll: async (): Promise<Evenement[]> => {
    try {
      const response = await api.get<ApiResponse<Evenement[]>>('/events');
      return response.data;
    } catch (error) {
      logError('Get evenements failed');
      throw error;
    }
  },

  getById: async (id: string): Promise<Evenement> => {
    try {
      const response = await api.get<ApiResponse<Evenement>>(`/events/${id}`);
      return response.data;
    } catch (error) {
      logError('Get evenement failed');
      throw error;
    }
  },

  create: async (data: CreateEvenementDto, file?: { uri: string; name: string; type: string }): Promise<Evenement> => {
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
      formData.append('prefix', 'event_');
      formData.append('folder', 'events');

      const response = await api.post<ApiResponse<Evenement>>('/events', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      } as any);
      return response.data;
    } catch (error) {
      logError('Create evenement failed');
      throw error;
    }
  },

  update: async (
    id: string,
    data: UpdateEvenementDto,
    file?: { uri: string; name: string; type: string },
  ): Promise<Evenement> => {
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
      formData.append('prefix', 'event_');
      formData.append('folder', 'events');

      const response = await api.put<ApiResponse<Evenement>>(`/events/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      } as any);
      return response.data;
    } catch (error) {
      logError('Update evenement failed');
      throw error;
    }
  },

  remove: async (id: string): Promise<void> => {
    try {
      await api.delete(`/events/${id}`);
    } catch (error) {
      logError('Delete evenement failed');
      throw error;
    }
  },
};
