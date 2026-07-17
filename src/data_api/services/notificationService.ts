import api from '@/data_api/lib/api';
import { logError } from '@/data_api/lib/logger';

export const notificationService = {
  registerToken: async (token: string): Promise<void> => {
    try {
      await api.post('/users/push-token', { token });
    } catch (error) {
      logError('Register push token failed');
      throw error;
    }
  },
};
