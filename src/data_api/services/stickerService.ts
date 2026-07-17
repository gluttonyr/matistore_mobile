import api from '@/data_api/lib/api';
import { logError } from '@/data_api/lib/logger';
import { CreateStickerDto, Sticker, UpdateStickerDto } from '@/data_api/models/sticker.types';

type ApiResponse<T> = { data: T; message?: string; status?: number };

export const stickerService = {
  getAll: async (): Promise<Sticker[]> => {
    try {
      const response = await api.get<ApiResponse<Sticker[]>>('/stickers');
      return response.data;
    } catch (error) {
      logError('Get stickers failed');
      throw error;
    }
  },

  getById: async (id: string): Promise<Sticker> => {
    try {
      const response = await api.get<ApiResponse<Sticker>>(`/stickers/${id}`);
      return response.data;
    } catch (error) {
      logError('Get sticker failed');
      throw error;
    }
  },

  create: async (data: CreateStickerDto, file?: { uri: string; name: string; type: string }): Promise<Sticker> => {
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
      formData.append('prefix', 'sticker_');
      formData.append('folder', 'stickers');

      const response = await api.post<ApiResponse<Sticker>>('/stickers', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      } as any);
      return response.data;
    } catch (error) {
      logError('Create sticker failed');
      throw error;
    }
  },

  update: async (
    id: string,
    data: UpdateStickerDto,
    file?: { uri: string; name: string; type: string },
  ): Promise<Sticker> => {
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
      formData.append('prefix', 'sticker_');
      formData.append('folder', 'stickers');

      const response = await api.put<ApiResponse<Sticker>>(`/stickers/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      } as any);
      return response.data;
    } catch (error) {
      logError('Update sticker failed');
      throw error;
    }
  },

  remove: async (id: string): Promise<void> => {
    try {
      await api.delete(`/stickers/${id}`);
    } catch (error) {
      logError('Delete sticker failed');
      throw error;
    }
  },
};
