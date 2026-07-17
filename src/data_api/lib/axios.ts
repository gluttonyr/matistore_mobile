import { authStorage } from '@/storage/authStorage';
import axios from 'axios';
import Constants from 'expo-constants';
import { logError } from './logger';

const apiUrl = Constants.expoConfig?.extra?.apiUrl;

console.log('API URL:', apiUrl);

const apiClient = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Ajout automatique du token
apiClient.interceptors.request.use(
  async (config) => {
   
    
    try {
      const token = await authStorage.getToken();
      
      console.log('TOKEN STORAGE:', token);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      console.log('AUTH HEADER:', config.headers.Authorization);

      return config;
    } catch (error:any) {
      logError('Request interceptor error', error);
      return Promise.reject(error);
    }
  },
  (error) => {
    logError('Request interceptor error', error);
    return Promise.reject(error);
  }
);

// Gestion globale des erreurs
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    try {
      // if (error.response?.status === 401) {
      //   await authStorage.removeToken();
      // }

      logError(`API Error [${error.response?.status ?? 'UNKNOWN'}]`, {
        url: error.config?.url,
        method: error.config?.method,
        message: error.message,
      });
    } catch (e:any) {
      logError('Response interceptor error', e);
    }

    return Promise.reject(error);
  }
);

export default apiClient;