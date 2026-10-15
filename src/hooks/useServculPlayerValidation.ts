import { servculService } from '@/data_api/services/servculService';
import { ServculPlayer } from '@/data_api/models/servcul.types';
import { useEffect, useRef, useState } from 'react';

const VALIDATION_DELAY_MS = 500;

type PlayerValidationState = {
  player: ServculPlayer | null;
  checking: boolean;
  error: string | null;
};

export function useServculPlayerValidation(accountId: string): PlayerValidationState {
  const [state, setState] = useState<PlayerValidationState>({
    player: null,
    checking: false,
    error: null,
  });
  const latestIdRef = useRef(accountId.trim());
  latestIdRef.current = accountId.trim();

  useEffect(() => {
    const userId = accountId.trim();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();

    setState({ player: null, checking: false, error: null });
    if (!userId) return () => controller.abort();
    if (!/^\d+$/.test(userId)) {
      setState({ player: null, checking: false, error: 'L’ID doit contenir uniquement des chiffres.' });
      return () => controller.abort();
    }

    timeout = setTimeout(() => {
      setState({ player: null, checking: true, error: null });
      if (__DEV__) console.info('[Servcul player lookup] request', { userId });
      void servculService.findPlayer(userId, controller.signal)
        .then((player) => {
          if (controller.signal.aborted || latestIdRef.current !== userId) return;
          if (__DEV__) console.info('[Servcul player lookup] response', { userId, player });
          setState({
            player,
            checking: false,
            error: player ? null : 'Cet ID 1XBET est introuvable.',
          });
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || latestIdRef.current !== userId) return;
          if (__DEV__) {
            const response = (error as { response?: { status?: number; data?: unknown } })?.response;
            const payload = response?.data;
            const responseSummary = payload && typeof payload === 'object'
              ? {
                message: 'message' in payload ? payload.message : null,
                upstreamStatus: 'upstreamStatus' in payload ? payload.upstreamStatus : null,
                fields: Object.keys(payload),
              }
              : payload ?? null;
            console.warn('[Servcul player lookup] failed', {
              userId,
              status: response?.status ?? null,
              response: responseSummary,
              message: error instanceof Error ? error.message : String(error),
            });
          }
          setState({
            player: null,
            checking: false,
            error: 'Impossible de vérifier cet ID. Vérifiez votre connexion et réessayez.',
          });
        });
    }, VALIDATION_DELAY_MS);

    return () => {
      if (timeout) clearTimeout(timeout);
      controller.abort();
    };
  }, [accountId]);

  return state;
}
