import { notificationService } from '@/data_api/services/notificationService';
import { useAuth } from '@/hooks/useAuth';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Demande la permission de notification, récupère le token Expo Push et
 * l'enregistre côté backend. À appeler une fois dans chaque shell authentifié
 * (tabs utilisateur ET admin) : sans build natif (Expo Go), l'appel échoue
 * silencieusement (module non disponible), ce qui est normal et sans danger.
 */
export function usePushNotificationRegistration(): void {
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    (async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted' || cancelled) return;

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
        if (cancelled) return;

        await notificationService.registerToken(pushToken.data);
      } catch (error) {
        // Attendu tant qu'on n'a pas de build natif (Expo Go) : on ne bloque rien.
        console.warn('Push notification registration skipped/failed:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);
}

// ─── Handler global (affichage au premier plan) ────────────────────────────────
// Doit être exécuté une seule fois, au chargement du module (pas dans un composant).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Tap sur une notification (app en arrière-plan ou fermée) : redirige vers
// le détail de l'événement concerné, si l'info est présente.
Notifications.addNotificationResponseReceivedListener((response) => {
  const data = response.notification.request.content.data as { type?: string; trackingId?: string } | undefined;
  if (data?.type === 'event' && data.trackingId) {
    router.push({ pathname: '/user_events/[id]', params: { id: data.trackingId } });
  }
});
