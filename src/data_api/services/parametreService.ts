// data_api/services/parametreService.ts
import api from "../lib/api";
import { logError } from "../lib/logger";
import { Parametre } from "../models/parametre.types";

interface ApiResponse<T> {
  data: T;
  message: string;
  status: number;
}

export const parametreService = {
  getAll: async (): Promise<Parametre[]> => {
    try {
      const response = await api.get<ApiResponse<Parametre[]>>('/parametres');
      return response.data;
    } catch (error) {
      logError('Get parametres failed');
      throw error;
    }
  },

  getById: async (id: string): Promise<Parametre> => {
    try {
      const response = await api.get<ApiResponse<Parametre>>(`/parametres/${id}`);
      return response.data;
    } catch (error) {
      logError('Get parametre failed');
      throw error;
    }
  },
};