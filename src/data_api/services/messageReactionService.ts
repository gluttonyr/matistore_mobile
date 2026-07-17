import api from '@/lib/api';
import { logError } from '@/lib/logger';
import { MessageReaction } from '@/models/message-reaction.types';

export const messageReactionService = {
  getAll: async (): Promise<MessageReaction[]> => {
    try {
      const response = await api.get<MessageReaction[]>('/message-reactions');
      return response;
    } catch (error) {
      logError('Get message reactions failed');
      throw error;
    }
  },

  getById: async (id: string): Promise<MessageReaction> => {
    try {
      const response = await api.get<MessageReaction>(`/message-reactions/${id}`);
      return response;
    } catch (error) {
      logError('Get message reaction failed');
      throw error;
    }
  },
};
