import api from '@/data_api/lib/api';
import { getApiErrorMessage, logError } from '@/data_api/lib/logger';
import {
  AdminCaptureDto,
  AdminCaptureStatus,
  CreateTransactionDto,
  ResolveClaimDto,
  Transaction,
  TransactionPage,
  TransactionPageParams,
} from '@/data_api/models/transaction.types';

function requireTransactionPage(payload: unknown): TransactionPage {
  const page = payload as Partial<TransactionPage> | null;
  if (!page || !Array.isArray(page.items) || typeof page.hasMore !== 'boolean') {
    throw new Error('Le serveur des transactions doit être mis à jour pour prendre en charge la pagination.');
  }
  return page as TransactionPage;
}

export const transactionService = {
  getCaptureStatus: async (): Promise<AdminCaptureStatus> => {
    const response = await api.get<any>('/transactions/capture/status');
    return response.data;
  },
  setCaptureManualOverride: async (enabled: boolean): Promise<AdminCaptureStatus> => {
    const response = await api.post<any>('/transactions/capture/manual-override', { enabled });
    return response.data;
  },
  resolveCaptureReconciliation: async (id: string, decision: 'VALIDEE' | 'REJETEE', motif?: string): Promise<Transaction> => {
    const response = await api.post<any>(`/transactions/${id}/capture-reconcile`, {
      decision,
      ...(motif ? { motif } : {}),
    });
    return response.data;
  },
  validateManualWithdrawal: async (id: string): Promise<Transaction> => {
    const response = await api.post<any>(`/transactions/${id}/withdrawal/validate`);
    return response.data;
  },
  rejectUnvalidated: async (id: string): Promise<Transaction> => {
    const response = await api.post<any>(`/transactions/${id}/reject`, {});
    return response.data;
  },
  getAll: async (params: Pick<TransactionPageParams, 'page' | 'limit'> = { page: 1, limit: 25 }): Promise<TransactionPage> => {
    try {
      const response = await api.get<any>('/transactions', { params });
      return requireTransactionPage(response?.data);
    } catch (error) {
      logError('Get transactions failed');
      throw error;
    }
  },
  getAllForAdmin: async (params: TransactionPageParams): Promise<TransactionPage> => {
    try {
      const response = await api.get<any>('/transactions/admin', {
        params: {
          ...params,
          type: params.type === 'all' ? undefined : params.type,
          status: params.status === 'all' ? undefined : params.status,
        },
      });
      return requireTransactionPage(response?.data);
    } catch (error) {
      const apiError = error as { response?: { status?: number }; code?: string };
      logError('Get admin transactions failed', {
        status: apiError?.response?.status,
        code: apiError?.code,
        message: getApiErrorMessage(error),
      });
      throw error;
    }
  },
  getUpdatedSince: async (after: string): Promise<{ count: number; hasUpdates: boolean }> => {
    const response = await api.get<any>('/transactions/updated-since', { params: { after } });
    return response.data;
  },
  getById: async (id: string): Promise<Transaction> => {
    try {
      const response = await api.get<any>(`/transactions/${id}`);
      return response.data;
    } catch (error) {
      logError('Get transaction failed');
      throw error;
    }
  },
  create: async (data: CreateTransactionDto): Promise<Transaction> => {
    try {
      const response = await api.post<any>('/transactions', data);
      return response.data;
    } catch (error) {
      logError('Create transaction failed', { message: getApiErrorMessage(error) });
      throw error;
    }
  },
  processAdminCapture: async (data: AdminCaptureDto): Promise<{ matched: boolean; transactionId?: string }> => {
    try {
      const response = await api.post<any>('/transactions/admin-capture', data);
      return response.data;
    } catch (error) {
      logError('Process admin payment capture failed');
      throw error;
    }
  },
  cancel: async (id: string): Promise<Transaction> => {
    try {
      const response = await api.post<any>(`/transactions/${id}/cancel`);
      return response.data;
    } catch (error) {
      logError('Cancel transaction failed');
      throw error;
    }
  },
  claim: async (id: string): Promise<Transaction> => {
    try {
      const response = await api.post<any>(`/transactions/${id}/claim`);
      return response.data;
    } catch (error) {
      logError('Claim transaction failed', { message: getApiErrorMessage(error) });
      throw error;
    }
  },
  resolveClaim: async (id: string, data: ResolveClaimDto): Promise<Transaction> => {
    try {
      const response = await api.post<any>(`/transactions/${id}/claim/resolve`, data);
      return response.data;
    } catch (error) {
      logError('Resolve transaction claim failed', { message: getApiErrorMessage(error) });
      throw error;
    }
  },
};
