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
      // Ne pas imprimer AxiosError : sa config peut contenir Authorization.
      const apiError = error as {
        code?: unknown;
        message?: unknown;
        response?: { status?: unknown; data?: { message?: unknown } };
      };
      const serverMessage = apiError?.response?.data?.message;
      logError(`API Error: ${method.toUpperCase()} ${url}`, {
        status: apiError?.response?.status,
        code: apiError?.code,
        message: Array.isArray(serverMessage)
          ? serverMessage.filter((part): part is string => typeof part === 'string').join('; ')
          : typeof serverMessage === 'string'
            ? serverMessage
            : typeof apiError?.message === 'string'
              ? apiError.message
              : undefined,
      });
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
