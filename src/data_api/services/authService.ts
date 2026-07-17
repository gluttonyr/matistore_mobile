/**
 * Service d'authentification
 */

import api from '@/data_api/lib/api';
import apiClient from '@/data_api/lib/axios';
import { logError } from '@/data_api/lib/logger';
import { CreateUserDto, LoginRequest, User } from '@/data_api/models/user.types';
import { authStorage } from '@/storage/authStorage';

// Types pour les réponses API
interface ApiResponse<T> {
  data: T;
  message: string;
  status: number;
}

export const authService = {
  /**
   * Connexion utilisateur
   */
  login: async (credentials: LoginRequest): Promise<ApiResponse<any>> => {
    // try {
      console.log('[authService] Login request:', credentials.email);
      const response = await api.post<any>('/auth/login', credentials);
      console.log('[authService] Login response:', response);
      // console.log('[authService] Raw HTTP response:', response);
      
      // // Accès sécurisé à la réponse
      // const httpData = response;
      // console.log('[authService] HTTP response.data:', httpData);
      
      // if (!httpData) {
      //   throw new Error('No response data from server');
      // }

      // // Le backend peut retourner soit:
      // // 1. { data: user, token, message, status }
      // // 2. { user, token, access_token }
      // console.log(httpData)
      // const user = httpData.data || httpData.user;
      // const token = httpData.token || httpData.access_token;
      
      // console.log('[authService] Extracted user:', user);
      // console.log('[authService] Extracted token:', token);
      
      // if (!user) {
      //   throw new Error('No user data in response');
      // }
      
      // if (!token) {
      //   throw new Error('No token in response');
      // }

      // const result: LoginResponse = {
      //   user,
      //   token,
      //   access_token: token,
      // };
      // console.log('[authService] Final result:', result);
      return response; // Contient: { data: user, message, status, token? }
    // } catch (error) {
    //   console.error('[authService] Login error:', error);
    //   logError('Login failed: ' + (error instanceof Error ? error.message : String(error)));
    //   throw error;
    // }
  },



  // /**
  //  * Connexion utilisateur
  //  */
  // getQRCode: async (): Promise<any> => {
  //   // try {
      
    
  //     const response = await api.post<any>('/auth/2fa/setup');
     
  //     return response; // Contient: { data: user, message, status, token? }
    
  // },
  // verifyCode: async (code: string): Promise<any> => {
  //   // try {
      
    
  //     const response = await api.post<any>('/auth/2fa/verify', { code });
     
  //     return response; // Contient: { data: user, message, status, token? }
    
  // },

  /**
   * Inscription utilisateur
   */
  register: async (data: CreateUserDto): Promise<any> => {
    try {
     

      // Don't set Content-Type manually - Axios will handle it automatically with FormData
      const response = await apiClient.post<any>('/auth/register', data);
      const registerData = response.data; // Contient: { data: user, message, status, token? }
      
      return {
        user: registerData.data,
        token: registerData.token || '',
      };
    } catch (error) {
      logError('Registration failed');
      throw error;
    }
  },

  verifyGoogleToken: async (idToken: string): Promise<any> => {
    try {
      const response = await api.post<any>('/auth/verify-google-token', { idToken });
      return response.data; // Contient: { access_token, user, isNewUser }
    } catch (error) {
      logError('Google token verification failed');
      throw error;
    }},

  /**
   * Récupérer le profil courant
   */
  getProfile: async (): Promise<User> => {
    try {
      const token = await authStorage.getToken();
      console.log("le token est",token);
      console.log('========== GET PROFILE ==========');
      console.trace('getProfile appelé depuis :');
      const response = await api.get<any>('/users/profile');
      console.log('[authService] getProfile response:', response);
      return response.data;
    } catch (error) {
      logError('Get profile failed', { error });
      throw error;
    }
  },

  /**
   * Mettre à jour le profil
   */
  updateProfile: async (data: User): Promise<User> => {
    try {
      const response = await api.put<any>('/auth/profile', data);
      return response.data.data || response.data;
    } catch (error) {
      logError('Update profile failed');
      throw error;
    }
  },

  /**
   * Changer le mot de passe
   */
  // changePassword: async (data: ChangePasswordRequest): Promise<{ message: string }> => {
  //   try {
  //     const response = await api.post<any>('/auth/change-password', data);
  //     return response.data.data || response.data;
  //   } catch (error) {
  //     logError('Change password failed');
  //     throw error;
  //   }
  // },

  /**
   * Déconnexion
   */
  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout', {});
      localStorage.removeItem('authToken');
    } catch (error) {
      logError('Logout failed');
      throw error;
    }
  },

  /**
   * Rafraîchir le token
   */
  refreshToken: async (): Promise<{ token: string }> => {
    try {
      const response = await api.post<any>('/auth/refresh', {});
      return response.data.data || response.data;
    } catch (error) {
      logError('Refresh token failed');
      throw error;
    }
  },

  /**
   * Vérifier si authentifié
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('authToken');
  },
};
