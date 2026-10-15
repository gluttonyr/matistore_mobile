import api from '@/data_api/lib/api';
import { logError } from '@/data_api/lib/logger';
import { AdminDiscussionCategory, AdminDiscussionPage, Discussion, DiscussionType } from '@/data_api/models/discussion.types';

export const discussionService = {
  getAll: async (params: {
    page: number;
    limit: number;
    search: string;
    category: AdminDiscussionCategory;
  }): Promise<AdminDiscussionPage> => {
    try {
      const response = await api.get<any>('/discussions', { params });
      const page = response?.data;
      if (
        !page
        || !Array.isArray(page.items)
        || !page.counts
        || typeof page.counts.depot !== 'number'
        || typeof page.counts.retrait !== 'number'
        || typeof page.counts.all !== 'number'
        || typeof page.counts.unread !== 'number'
        || typeof page.counts.support !== 'number'
      ) {
        throw new Error(
          'Le serveur de discussions doit être mis à jour. Redémarrez le backend avec la pagination des discussions.',
        );
      }
      return page as AdminDiscussionPage;
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
  getAdminUserProfile: async (discussionId: string): Promise<NonNullable<Discussion['userProfile']>> => {
    const response = await api.get<any>(`/discussions/${discussionId}/profile`);
    return response.data;
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
