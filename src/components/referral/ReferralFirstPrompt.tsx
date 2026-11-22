import { referralService } from '@/data_api/services/referralService';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { ReferralCodePrompt } from './ReferralCodePrompt';

/**
 * Asks "Un ami vous a invité ?" once per account: after the first login, or after the update for
 * existing accounts. Skipping or validating marks it seen on the server, so it never comes back.
 */
export function ReferralFirstPrompt() {
  const { isAuthenticated, authReady, user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!authReady || !isAuthenticated || !user?.trackingId) return;
    let cancelled = false;
    // Let the permission dialogs of the login go first.
    const t = setTimeout(() => {
      referralService.getMe()
        .then((me) => { if (!cancelled && !me.promptSeen && !me.parrain) setVisible(true); })
        .catch(() => { /* older server or offline: try next time */ });
    }, 2500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [authReady, isAuthenticated, user?.trackingId]);

  return <ReferralCodePrompt visible={visible} mode="first" onDone={() => setVisible(false)} />;
}
