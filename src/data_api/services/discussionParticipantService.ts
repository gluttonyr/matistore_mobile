import api from '@/lib/api';
import { logError } from '@/lib/logger';
import { DiscussionParticipant } from '@/models/discussion-participant.types';

export const discussionParticipantService = {
  getAll: async (): Promise<DiscussionParticipant[]> => {
    try {
      const response = await api.get<DiscussionParticipant[]>('/discussion-participants');
      return response;
    } catch (error) {
      logError('Get discussion participants failed');
      throw error;
    }
  },

  getById: async (id: string): Promise<DiscussionParticipant> => {
    try {
      const response = await api.get<DiscussionParticipant>(`/discussion-participants/${id}`);
      return response;
    } catch (error) {
      logError('Get discussion participant failed');
      throw error;
    }
  },
};
