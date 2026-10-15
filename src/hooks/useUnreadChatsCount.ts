import { useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

import { discussionService } from '@/data_api/services/discussionService';
import { useAuth } from '@/hooks/useAuth';

const UNREAD_COUNT_QUERY_KEY = ['unreadChatsCount'] as const;
const BADGE_STALE_TIME = 20_000;

/** Nombre de messages non lus (hors forum) pour l'utilisateur connecté. */
export function useUnreadChatsCount(refreshKey?: unknown) {
  const { token } = useAuth();
  const previousRefreshKey = useRef(refreshKey);
  const query = useQuery({
    queryKey: UNREAD_COUNT_QUERY_KEY,
    queryFn: discussionService.getUnreadCount,
    enabled: !!token,
    staleTime: BADGE_STALE_TIME,
    retry: false,
  });

  useEffect(() => {
    if (Object.is(previousRefreshKey.current, refreshKey)) return;
    previousRefreshKey.current = refreshKey;
    if (token && query.isStale && !query.isFetching) void query.refetch();
  }, [query.isFetching, query.isStale, query.refetch, refreshKey, token]);

  const refresh = useCallback(() => {
    if (token) void query.refetch();
  }, [query.refetch, token]);

  return { count: query.data ?? 0, refresh };
}
