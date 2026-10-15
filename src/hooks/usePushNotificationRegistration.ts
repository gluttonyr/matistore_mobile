import { pushDeviceService } from '@/data_api/services/pushDeviceService';
import { UserRole } from '@/data_api/models/user.types';
import { useAuth } from '@/hooks/useAuth';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Demande la permission de notification, récupère le token Expo Push,
 * transmet les infos au pushDeviceService, et gère la navigation au tap
 * sur une notification.
 */
export function usePushNotificationRegistration(): void {
  const { token, user, isAuthenticated, authReady } = useAuth();
  const handledResponses = useRef(new Set<string>());

  // ─── Enregistrement du token push (inchangé) ─────────────────────────
  useEffect(() => {
    // N'associe le téléphone qu'après validation de la session et du profil.
    // Cela évite qu'une inscription démarrée pendant un changement de compte
    // ne conserve l'association du compte précédent.
    if (!authReady || !isAuthenticated || !token || !user?.trackingId) return;

    let cancelled = false;

    (async () => {
      try {
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();

        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted' || cancelled) {
          return;
        }

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;

        if (!projectId) {
          console.warn('Expo projectId introuvable');
          return;
        }

        const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });

        if (cancelled) return;

        const platform: 'android' | 'ios' =
          Platform.OS === 'ios' ? 'ios' : 'android';

        await pushDeviceService.register({
          token: pushToken.data,
          platform,
        });
      } catch (error) {
        console.warn('Push notification registration skipped/failed:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, isAuthenticated, token, user?.trackingId]);

  // ─── Navigation au tap sur une notification ──────────────────────────
  useEffect(() => {
    if (!authReady) return;

    const handleResponse = (response: Notifications.NotificationResponse) => {
      const request = response.notification.request;
      if (handledResponses.current.has(request.identifier)) return;
      handledResponses.current.add(request.identifier);

      const data = (request.content.data ?? {}) as {
        type?: string;
        trackingId?: string;
        discussionId?: string;
        discussionType?: string;
        discussionStatus?: string;
        userName?: string;
        recipientTrackingIds?: string[];
        recipientRoles?: UserRole[];
      };
      const notificationTitle = request.content.title ?? '';

      if (!isAuthenticated) {
        router.replace('/');
        Notifications.clearLastNotificationResponse();
        return;
      }

      if (data.type === 'event' && data.trackingId) {
        router.push({ pathname: '/user_events/[id]', params: { id: data.trackingId } });
      } else if ((data.type === 'message' || data.type === 'transaction') && data.discussionId) {
        // Les anciennes notifications sans destinataire ne doivent jamais
        // ouvrir une discussion sous le compte connecté actuellement.
        const targetsCurrentUser = data.recipientTrackingIds?.includes(user?.trackingId ?? '')
          || data.recipientRoles?.includes(user?.role ?? UserRole.USER);
        if (!targetsCurrentUser) {
          Notifications.clearLastNotificationResponse();
          return;
        }

        if (user?.role === UserRole.ADMIN) {
          const category: 'deposit' | 'withdrawal' | 'support' = data.discussionStatus === 'depot'
            ? 'deposit'
            : data.discussionStatus === 'retrait'
              ? 'withdrawal'
              : 'support';
          router.push({
            pathname: '/admin_chats/[id]',
            params: {
              id: data.discussionId,
              name: data.userName || notificationTitle || 'Discussion client',
              category,
            },
          });
        } else if (data.type === 'transaction' || data.discussionType === 'depot_retrait') {
          router.push({ pathname: '/user_chats/deposit-withdrawal', params: { id: data.discussionId } });
        } else {
          router.push({
            pathname: '/user_chats/[id]',
            params: { id: data.discussionId, name: notificationTitle || 'MatiStore Support' },
          });
        }
      } else if (data.type === 'ADMIN_BROADCAST') {
        if (user?.role === UserRole.ADMIN) router.replace('/(admin)/home');
        else router.push('/user_notifications');
      } else {
        router.replace(user?.role === UserRole.ADMIN ? '/(admin)/home' : '/(tabs)/home');
      }

      Notifications.clearLastNotificationResponse();
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    const initialResponse = Notifications.getLastNotificationResponse();
    if (initialResponse) handleResponse(initialResponse);

    return () => subscription.remove();
  }, [authReady, isAuthenticated, user]);
}

// ─────────────────────────────────────────────────────────────
// HANDLER GLOBAL (au niveau module, OK car ne dépend d'aucun hook)
// ─────────────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
