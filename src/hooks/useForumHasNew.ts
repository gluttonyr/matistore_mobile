import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { DiscussionType } from '@/data_api/models/discussion.types';
import type { Discussion } from '@/data_api/models/discussion.types';
import { discussionService } from '@/data_api/services/discussionService';
import { useAuth } from '@/hooks/useAuth';
import { forumStorage } from '@/storage/forumStorage';

export const FORUM_HAS_NEW_QUERY_KEY = ['forumHasNew'] as const;
export const FORUM_DISCUSSION_QUERY_KEY = ['forumDiscussionSummary'] as const;
const BADGE_STALE_TIME = 20_000;

export async function fetchForumDiscussionSummary(): Promise<Discussion | null> {
  const list = await discussionService.getByType(DiscussionType.FORUM);
  return list[0] ?? null;
}

/** Pastille indiquant si un message du forum est arrivé depuis sa dernière visite. */
export function useForumHasNew(refreshKey?: unknown) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const previousRefreshKey = useRef(refreshKey);
  const query = useQuery({
    queryKey: FORUM_HAS_NEW_QUERY_KEY,
    queryFn: async () => {
      const forum = await queryClient.fetchQuery({
        queryKey: FORUM_DISCUSSION_QUERY_KEY,
        queryFn: fetchForumDiscussionSummary,
        staleTime: BADGE_STALE_TIME,
        retry: false,
      });
      if (!forum?.lastMessageAt) return false;

      const lastSeen = await forumStorage.getLastSeenAt();
      return !lastSeen || new Date(forum.lastMessageAt) > new Date(lastSeen);
    },
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

  return { hasNew: query.data ?? false, refresh };
}
