/**
 * Service pour les utilisateurs (Admin)
 */

import api from '@/data_api/lib/api';
import { User } from '@/data_api/models/user.types';
import { logError } from '@/data_api/lib/logger';

type ApiResponse<T> = { data: T; message?: string; status?: number };

export const userService = {
  /**
   * Récupérer tous les utilisateurs (Admin)
   */
  getAll: async (): Promise<User[]> => {
    try {
      return await api.get<User[]>('/users');
    } catch (error) {
      logError('Get users failed');
      throw error;
    }
  },

  // initPayment: async (): Promise<any> => {
  //     try {
  //       const response = await api.post<any>('/users/initPayment');
  //       return response.data;
  //     } catch (error) {
  //       logError('Erreur lors d\'une vente '+error);
  //       throw error;
  //     }
  //   },

  // getAllByBadge: async (): Promise<User[]> => {
  //   try {


  //     const response = await api.get<any>(
  //     `/users/badge`
  //     );
  //     return response.data;
  //   } catch (error) {
  //     logError('Get users failed');
  //     throw error;
  //   }
  // },

  /**
   * Récupérer un utilisateur par ID (Admin)
   */
  getById: async (id: string): Promise<User> => {
    try {
      const response = await api.get<User>(`/users/${id}`);
      return response;
    } catch (error) {
      logError('Get user failed');
      throw error;
    }
  },

  /**
   * Activer le Two FA par ID (Admin)
   */
  // enableTwoFA: async (id: string): Promise<any> => {
  //   try {
  //     const response = await api.put<User>(`/users/active/2af/${id}`);
  //     return response;
  //   } catch (error) {
  //     logError('Enable two factor authentication failed');
  //     throw error;
  //   }
  // },

  /**
   * Supprimer un utilisateur (Admin)
   */
  // delete: async (id: string): Promise<{ message: string }> => {
  //   try {
  //     const response = await api.delete<{ message: string }>(`/users/${id}`);
  //     return response;
  //   } catch (error) {
  //     logError('Delete user failed');
  //     throw error;
  //   }
  // },

  /**
   * Suspendre un utilisateur (Admin)
   */
  // suspend: async (id: string, reason: string): Promise<User> => {
  //   try {
  //     const response = await api.post<User>(`/users/statut/${id}`, { reason });
  //     return response;
  //   } catch (error) {
  //     logError('Suspend user failed');
  //     throw error;
  //   }
  // },

  updateStatut: async (id: string): Promise<User> => {
    try {
      return await api.put<User>(`/users/statut/${id}`);
    } catch (error) {
      logError('Update user statut failed');
      throw error;
    }
  },

  /**
   * Restaurer un utilisateur suspendu (Admin)
   */
  restore: async (id: string): Promise<User> => {
    try {
      const response = await api.post<User>(`/users/${id}/restore`, {});
      return response;
    } catch (error) {
      logError('Restore user failed');
      throw error;
    }
  },

  /**
   * Mettre à jour le rôle d'un utilisateur (Admin)
   */
  updateRole: async (id: string, role: User['role']): Promise<User> => {
    try {
      const response = await api.put<User>(`/users/${id}/role`, { role });
      return response;
    } catch (error) {
      logError('Update user role failed');
      throw error;
    }
  },

  updateLiens: async (id: string, liens: string[]): Promise<User> => {
    try {
      const formData = new FormData();

formData.append('data', JSON.stringify({ liens }));
    
      const response = await api.put<User>(`/users/${id}`,formData);
      return response;
    } catch (error) {
      logError('Update user liens failed');
      throw error;
    }
  },

  update: async (id: string, user: FormData | Partial<User>): Promise<User> => {
    try {
      const config = typeof FormData !== 'undefined' && user instanceof FormData
        ? { headers: { 'Content-Type': 'multipart/form-data' } }
        : undefined;
      const response = await api.put<ApiResponse<User>>(`/users/${id}`, user, config);
      return response.data;
    } catch (error) {
      logError('Update user failed');
      throw error;
    }
  },

  updateParrain: async (code: string): Promise<User> => {
    try {
      return await api.put<User>(`/users/parrain/${code}`);
    } catch (error) {
      logError('Update user parrain failed');
      throw error;
    }
  },

  /**
   * Exporter les utilisateurs (Admin)
   */
  // export: async (format: 'csv' | 'pdf' = 'csv'): Promise<Blob> => {
  //   try {
  //     const response = await fetch(`${import.meta.env.VITE_API_URL}/users/export?format=${format}`, {
  //       headers: {
  //         'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
  //       },
  //     });
  //     return await response.blob();
  //   } catch (error) {
  //     logError('Export users failed');
  //     throw error;
  //   }
  // },

  /**
   * Obtenir les statistiques des utilisateurs (Admin)
   */
  getStats: async (): Promise<{
    totalUsers: number;
    totalByRole: Record<string, number>;
    activeUsers: number;
    suspendedUsers: number;
  }> => {
    try {
      return await api.get<{
        totalUsers: number;
        totalByRole: Record<string, number>;
        activeUsers: number;
        suspendedUsers: number;
      }>('/users/stats');
    } catch (error) {
      logError('Get user stats failed');
      throw error;
    }
  },
};
