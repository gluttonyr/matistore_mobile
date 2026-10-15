import api from '@/data_api/lib/api';
import { logError } from '@/data_api/lib/logger';
import type { AppNotification, AppNotificationPage } from '@/data_api/models/appNotification.types';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type ApiResponse<T> = { data: T; message?: string; status?: number };

export const notificationService = {
  registerToken: async (token: string, deviceId?: string): Promise<void> => {
    try {
      const platform = Platform.OS === 'android' ? 'android' : 'ios';
      await api.post('/push-devices/register', {
        token,
        platform,
        deviceId: deviceId ?? undefined,
        active: true,
      });
    } catch (error) {
      logError('Register push token failed');
      throw error;
    }
  },

  getMine: async (): Promise<AppNotification[]> => {
    try {
      const response = await api.get<ApiResponse<AppNotification[]>>('/app-notifications');
      return response.data;
    } catch (error) {
      logError('Get app notifications failed');
      throw error;
    }
  },

  getMinePage: async (options: { limit?: number; beforeId?: number } = {}): Promise<AppNotificationPage> => {
    try {
      const response = await api.get<ApiResponse<AppNotificationPage>>('/app-notifications', {
        params: { limit: options.limit ?? 20, ...(options.beforeId ? { beforeId: options.beforeId } : {}) },
      });
      return response.data;
    } catch (error) {
      logError('Get paginated app notifications failed');
      throw error;
    }
  },

  uploadImage: async (file: { uri: string; name: string; type: string }): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
      formData.append('prefix', 'broadcast');
      formData.append('folder', 'notifications');
      const response = await api.post<ApiResponse<string>>('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      } as any);
      const filename = response.data;
      const apiUrl = String(Constants.expoConfig?.extra?.apiUrl ?? '').replace(/\/$/, '');
      if (!apiUrl) throw new Error('API URL unavailable');
      return `${apiUrl}/uploads/notifications/${encodeURIComponent(filename)}`;
    } catch (error) {
      logError('Upload notification image failed');
      throw error;
    }
  },

  broadcastToAll: async (payload: { title: string; body: string; imageUrl?: string }): Promise<{
    recipientCount: number;
    attemptedCount: number;
    deliveredCount: number;
    failedCount: number;
    storedCount: number;
  }> => {
    try {
      const response = await api.post<ApiResponse<{
        recipientCount: number;
        attemptedCount: number;
        deliveredCount: number;
        failedCount: number;
        storedCount: number;
      }>>(
        '/app-notifications/broadcast',
        payload,
      );
      return response.data;
    } catch (error) {
      logError('Broadcast push notification failed');
      throw error;
    }
  },
};
