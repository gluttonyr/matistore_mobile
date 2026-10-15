import api from '@/data_api/lib/api';
import { logError } from '@/data_api/lib/logger';
import { PushDevice } from '@/data_api/models/pushDevice.types';

export const pushDeviceService = {
  getByUser: async (): Promise<PushDevice[]> => {
    try {
      return await api.get<PushDevice[]>('/push-devices');
    } catch (error) {
      logError('Get push devices failed');
      throw error;
    }
  },

  register: async (payload: { token: string; platform: 'android' | 'ios'; deviceId?: string; active?: boolean }): Promise<PushDevice> => {
    try {
      return await api.post<PushDevice>('/push-devices/register', payload);
    } catch (error) {
      logError('Register push device failed');
      throw error;
    }
  },

  update: async (id: string, payload: Partial<PushDevice>): Promise<PushDevice> => {
    try {
      return await api.put<PushDevice>(`/push-devices/${id}`, payload);
    } catch (error) {
      logError('Update push device failed');
      throw error;
    }
  },

  

  remove: async (id: string): Promise<void> => {
    try {
      await api.delete(`/push-devices/${id}`);
    } catch (error) {
      logError('Delete push device failed');
      throw error;
    }
  },
  deactivate: async (token: string): Promise<void> => {
    try {
      await api.post('/push-devices/deactivate', { token });
    } catch (error) {
      logError('Delete push device failed');
      throw error;
    }
  },
};
