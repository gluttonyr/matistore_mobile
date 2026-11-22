import api from '@/data_api/lib/api';
import { logError } from '@/data_api/lib/logger';
import type { Coupon, CouponPage, CouponStatus } from '@/data_api/models/coupon.types';
import Constants from 'expo-constants';

async function run<T>(label: string, fn: () => Promise<{ data: T }>): Promise<T> {
  try {
    return (await fn()).data;
  } catch (error) {
    logError(label);
    throw error;
  }
}

export const couponService = {
  list: (before?: string, limit = 20) => run<CouponPage>('Get coupons failed', () =>
    api.get(`/coupons?limit=${limit}${before ? `&before=${encodeURIComponent(before)}` : ''}`)),
  home: () => run<{ today: boolean; items: Coupon[] }>('Get home coupons failed', () => api.get('/coupons/home')),
  get: (id: string) => run<Coupon>('Get coupon failed', () => api.get(`/coupons/${id}`)),

  // ── Admin ──
  create: (payload: { imageUrl: string; codes: { bookmaker: string; code: string }[]; odds?: string; note?: string; notify: boolean }) =>
    run<{ coupon: Coupon; notified: { storedCount: number } | null }>('Create coupon failed', () => api.post('/admin/coupons', payload)),
  setStatus: (id: string, status: CouponStatus) => run<Coupon>('Set coupon status failed', () =>
    api.patch(`/admin/coupons/${id}/status`, { status })),
  remove: (id: string) => run<{ deleted: boolean }>('Delete coupon failed', () => api.delete(`/admin/coupons/${id}`)),

  /** Screenshot → its public URL (uploads folder "coupons"). */
  uploadImage: async (file: { uri: string; name: string; type: string }): Promise<string> => {
    const formData = new FormData();
    formData.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
    formData.append('prefix', 'coupon');
    formData.append('folder', 'coupons');
    const filename = await run<string>('Upload coupon image failed', () =>
      api.post('/uploads', formData, { headers: { 'Content-Type': 'multipart/form-data' } } as any));
    const apiUrl = String(Constants.expoConfig?.extra?.apiUrl ?? '').replace(/\/$/, '');
    return `${apiUrl}/uploads/coupons/${encodeURIComponent(filename)}`;
  },
};
