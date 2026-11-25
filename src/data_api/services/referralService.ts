import api from '@/data_api/lib/api';
import { logError } from '@/data_api/lib/logger';
import type {
  ReferralAdminOverview,
  ReferralAdminRound,
  ReferralMe,
  ReferralSettings,
  ReferralStats,
  ReferralTournament,
} from '@/data_api/models/referral.types';
import { appendFile } from '../lib/uploadFile';

async function run<T>(label: string, fn: () => Promise<{ data: T }>): Promise<T> {
  try {
    return (await fn()).data;
  } catch (error) {
    logError(label);
    throw error;
  }
}

export const referralService = {
  getMe: () => run<ReferralMe>('Get referral profile failed', () => api.get('/referral/me')),
  createCode: () => run<{ code: string }>('Create referral code failed', () => api.post('/referral/code', {})),
  lookup: (code: string) => run<{ code: string; name: string; image?: string | null }>('Lookup referral code failed', () =>
    api.get(`/referral/lookup?code=${encodeURIComponent(code)}`)),
  setParrain: (code: string) => run<{ parrain: { name: string; image?: string | null }; unchanged: boolean }>('Set parrain failed', () =>
    api.post('/referral/parrain', { code })),
  markPromptSeen: () => run<{ promptSeen: boolean }>('Mark referral prompt failed', () => api.post('/referral/prompt-seen', {})),
  getTournament: () => run<ReferralTournament>('Get referral tournament failed', () => api.get('/referral/tournament')),

  // ── Admin ──
  getAdminOverview: () => run<ReferralAdminOverview>('Get referral settings failed', () => api.get('/admin/referral/settings')),
  updateSettings: (settings: Partial<ReferralSettings>) => run<ReferralAdminOverview>('Update referral settings failed', () =>
    api.put('/admin/referral/settings', settings)),
  getRounds: () => run<ReferralAdminRound[]>('Get referral rounds failed', () => api.get('/admin/referral/rounds')),
  setRewarded: (winnerId: number, rewarded: boolean) => run<{ id: number; rewarded: boolean }>('Set referral reward failed', () =>
    api.post(`/admin/referral/winners/${winnerId}/rewarded`, { rewarded })),
  getStats: () => run<ReferralStats>('Get referral stats failed', () => api.get('/admin/referral/stats')),

  /** Prize picture → filename in the uploads folder "referral". */
  uploadPrizeImage: (file: { uri: string; name: string; type: string }) => run<string>('Upload prize image failed', async () => {
    const formData = new FormData();
    await appendFile(formData, 'file', { uri: file.uri, name: file.name, type: file.type });
    formData.append('prefix', 'prize');
    formData.append('folder', 'referral');
    return api.post('/uploads', formData, { headers: { 'Content-Type': 'multipart/form-data' } } as any);
  }),
};
