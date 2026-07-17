import apiClient from './axios';
import { logError } from './logger';

type RequestMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';
type RequestConfig = Record<string, unknown>;

const api = {
  // Méthode générique pour les requêtes
  async request<T>(
    method: RequestMethod,
    url: string,
    data?: unknown,
    config: RequestConfig = {}
  ): Promise<T> {
    try {
      // Quand on envoie un FormData, on supprime le Content-Type par défaut
      // (application/json) pour laisser le browser définir multipart/form-data
      // avec le bon boundary automatiquement.
      const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
      const resolvedConfig = isFormData
        ? { headers: { 'Content-Type': undefined }, ...config }
        : config;

      const response = await apiClient.request<T>({
        method,
        url,
        data,
        ...resolvedConfig,
      });
      return response.data;
    } catch (error) {
      logError(`API Error: ${method.toUpperCase()} ${url}`, { error });
      throw error;
    }
  },

  // Méthodes HTTP typées
  get: <T,>(url: string, config: RequestConfig = {}) => {
    return api.request<T>('get', url, undefined, config);
  },

  post: <T,>(url: string, data?: unknown, config: RequestConfig = {}) => {
    return api.request<T>('post', url, data, config);
  },

  put: <T,>(url: string, data?: unknown, config: RequestConfig = {}) => {
    return api.request<T>('put', url, data, config);
  },

  delete: <T,>(url: string, config: RequestConfig = {}) => {
    return api.request<T>('delete', url, undefined, config);
  },

  patch: <T,>(url: string, data?: unknown, config: RequestConfig = {}) => {
    return api.request<T>('patch', url, data, config);
  },
};

export default api;
