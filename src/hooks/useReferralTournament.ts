import type { ReferralTournament } from '@/data_api/models/referral.types';
import { referralService } from '@/data_api/services/referralService';
import { socketService } from '@/data_api/services/socketService';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

const POLL_MS = 15_000;

/**
 * The tournament, kept live while the screen is shown: the server pushes an event on each validated
 * deposit or parrain change (refetched shortly after), and a slow poll covers a lost socket.
 */
export function useReferralTournament() {
  const [data, setData] = useState<ReferralTournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      setData(await referralService.getTournament());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    const socket = socketService.getSocket();
    const onChange = () => {
      if (debounce.current) clearTimeout(debounce.current);
      // The server caches the ranking for 3 s.
      debounce.current = setTimeout(() => void refresh(), 3_200);
    };
    socket?.on('referralRankingChanged', onChange);
    socket?.on('referralRoundChanged', onChange);
    return () => {
      clearInterval(timer);
      if (debounce.current) clearTimeout(debounce.current);
      socket?.off('referralRankingChanged', onChange);
      socket?.off('referralRoundChanged', onChange);
    };
  }, [refresh]));

  return { data, loading, error, refresh };
}
