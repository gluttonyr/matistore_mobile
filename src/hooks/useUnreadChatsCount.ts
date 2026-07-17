import { useCallback, useEffect, useState } from 'react';

import { discussionService } from '@/data_api/services/discussionService';
import { useAuth } from '@/hooks/useAuth';

/**
 * Nombre de messages non lus (hors forum) pour l'utilisateur connecté — admin
 * ou non. `refreshKey` permet de forcer un nouveau fetch (ex: à chaque
 * changement d'onglet) sans dépendre d'un événement socket dédié.
 */
export function useUnreadChatsCount(refreshKey?: unknown) {
  const { token } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    if (!token) return;
    discussionService.getUnreadCount()
      .then(setCount)
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, refreshKey]);

  return { count, refresh };
}
