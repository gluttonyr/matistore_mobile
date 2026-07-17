import api from '@/data_api/lib/api';
import { logError } from '@/data_api/lib/logger';
import { Discussion, DiscussionType } from '@/data_api/models/discussion.types';

export const discussionService = {
  getAll: async (): Promise<Discussion[]> => {
    try {
      const response = await api.get<any>('/discussions');
      return response.data;
    } catch (error) {
      logError('Get discussions failed');
      throw error;
    }
  },

  getById: async (id: string): Promise<Discussion> => {
    try {
      const response = await api.get<any>(`/discussions/${id}`);
      return response.data;
    } catch (error) {
      logError('Get discussion failed');
      throw error;
    }
  },
  getByUserId: async (userId: string): Promise<Discussion[]> => {
    try {
      console.log('Fetching discussions for user ID:', userId);
      const response = await api.get<any>(`/discussions/user/${userId}`);
      return response.data;
    } catch (error) {
      logError('Get discussions by user failed');
      throw error;
    } 
  },
  getByType: async (type: DiscussionType): Promise<Discussion[]> => {
    try {
      const response = await api.get<any>(`/discussions/type/${type}`);
      return response.data;
    } catch (error) {
      logError('Get discussions by type failed');
      throw error;
    }
  },

  getUnreadForAdmin: async (): Promise<Discussion[]> => {
    try {
      const response = await api.get<any>('/discussions/unread/admin');
      return response.data;
    } catch (error) {
      logError('Get unread discussions failed');
      throw error;
    }
  },

  getUnreadCount: async (): Promise<number> => {
    try {
      const response = await api.get<any>('/discussions/unread/count');
      return response.data;
    } catch (error) {
      logError('Get unread count failed');
      throw error;
    }
  },
};
