import { useCallback, useEffect, useState } from 'react';

import { DiscussionType } from '@/data_api/models/discussion.types';
import { discussionService } from '@/data_api/services/discussionService';
import { useAuth } from '@/hooks/useAuth';
import { forumStorage } from '@/storage/forumStorage';

/**
 * Indique juste s'il y a du nouveau dans le forum depuis la dernière visite
 * (pas de compteur exact : le forum est partagé par tout le monde, un
 * compteur par utilisateur nécessiterait un suivi de lecture dédié). Compare
 * `lastMessageAt` de la discussion forum à un horodatage "vu pour la
 * dernière fois" stocké localement, mis à jour quand l'écran forum s'ouvre.
 */
export function useForumHasNew(refreshKey?: unknown) {
  const { token } = useAuth();
  const [hasNew, setHasNew] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const list = await discussionService.getByType(DiscussionType.FORUM);
      const forum = list[0];
      if (!forum?.lastMessageAt) {
        setHasNew(false);
        return;
      }
      const lastSeen = await forumStorage.getLastSeenAt();
      setHasNew(!lastSeen || new Date(forum.lastMessageAt) > new Date(lastSeen));
    } catch {
      // Pas grave si le badge ne se met pas à jour ponctuellement.
    }
  }, [token]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, refreshKey]);

  return { hasNew, refresh };
}
