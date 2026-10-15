// data_api/services/messageService.ts
import api from '@/data_api/lib/api';
import { logError } from '@/data_api/lib/logger';
import { Message, MessageType } from '@/data_api/models/message.types';

type ApiResponse<T> = { data: T; message?: string; status?: number };

export type SendMessagePayload = {
  contenu: string;
  discussionId: string;
  senderId: string;
  type: MessageType;
  image?: string;
};

export const messageService = {
  /**
   * Upload a file (image, audio, etc.) and return the URL.
   */
  uploadFile: async (file: { uri: string; name: string; type: string }): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);
      formData.append('prefix', 'message_');
      formData.append('folder', 'messages');

      const response = await api.post<{ data: string }>('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      } as any);

      return response.data; // le backend retourne { data: imageUrl, message: "", status: 200 }
    } catch (error) {
      logError('Upload file failed');
      throw error;
    }
  },

  /**
   * Send a message via HTTP (fallback when the socket is unavailable/disconnected).
   */
  send: async (payload: SendMessagePayload): Promise<Message> => {
    try {
      const response = await api.post<ApiResponse<Message>>('/messages', {
        contenu: payload.contenu,
        discussion: { trackingId: payload.discussionId },
        sender: { trackingId: payload.senderId },
        type: payload.type,
        image: payload.image,
      });
      return response.data;
    } catch (error) {
      logError('Send message failed');
      throw error;
    }
  },

  /**
   * Fetch message history for a discussion.
   */
  getByDiscussion: async (discussionId: string, before?: string, limit?: number): Promise<Message[]> => {
    try {
      const params = [
        before ? `before=${encodeURIComponent(before)}` : '',
        limit ? `limit=${limit}` : '',
      ].filter(Boolean).join('&');
      const query = params ? `?${params}` : '';
      const response = await api.get<ApiResponse<Message[]>>(`/messages/discussion/${discussionId}${query}`);
      return response.data;
    } catch (error) {
      logError('Get messages by discussion failed');
      throw error;
    }
  },

  getAll: async (): Promise<Message[]> => {
    try {
      const response = await api.get<ApiResponse<Message[]>>('/messages');
      return response.data;
    } catch (error) {
      logError('Get messages failed');
      throw error;
    }
  },

  getById: async (id: string): Promise<Message> => {
    try {
      const response = await api.get<ApiResponse<Message>>(`/messages/${id}`);
      return response.data;
    } catch (error) {
      logError('Get message failed');
      throw error;
    }
  },

  remove: async (id: string): Promise<void> => {
    try {
      await api.delete(`/messages/${id}`);
    } catch (error) {
      logError('Delete message failed');
      throw error;
    }
  },
};
