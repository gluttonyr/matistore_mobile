import { operateurService } from '@/data_api/services/operateurService';
import {
  configureAdminCapture,
  hasNotificationAccess,
  openNotificationSettings,
  reportCaptureStatus,
  stopCapture,
} from '@/modules/expo-notif-capture';
import Constants from 'expo-constants';
import { authStorage } from '@/storage/authStorage';
import { useEffect, useRef } from 'react';
import { Alert, AppState, Platform } from 'react-native';

export function useAdminNotificationCapture() {
  const permissionPrompted = useRef(false);
  const configurationErrorShown = useRef(false);
  const configuring = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let disposed = false;

    const configure = async () => {
      if (disposed || configuring.current) return;
      configuring.current = true;
      try {
        const [user, token] = await Promise.all([
          authStorage.getUser(),
          authStorage.getToken(),
        ]);
        if (user?.role !== 'ADMIN' || !token) {
          stopCapture();
          return;
        }

        const operators = await operateurService.getAll();
        const watches = operators
          .filter((operator) => operator.active
            && operator.notificationPatternAdmin)
          .map((operator) => ({
            packageName: operator.notificationPackageAdmin?.trim() ?? '',
            title: operator.notificationTitleAdmin?.trim() ?? '',
            pattern: operator.notificationPatternAdmin!,
            operateurNom: operator.nom,
          }));
        const apiBaseUrl = Constants.expoConfig?.extra?.apiUrl;
        if (typeof apiBaseUrl !== 'string' || !apiBaseUrl || watches.length === 0) {
          stopCapture();
          reportCaptureStatus(false, 'capture_not_configured');
          throw new Error('La configuration de capture des opérateurs est incomplète.');
        }

        const [currentUser, currentToken] = await Promise.all([
          authStorage.getUser(),
          authStorage.getToken(),
        ]);
        if (disposed) return;
        if (currentUser?.role !== 'ADMIN' || currentToken !== token) {
          stopCapture();
          return;
        }
        configureAdminCapture(apiBaseUrl, token, watches);
        const notificationAccess = hasNotificationAccess();
        if (!notificationAccess) {
          reportCaptureStatus(false, 'notification_access_required');
        } else {
          // The native listener may have connected before its token/config was saved.
          // Send the first healthy signal now instead of waiting for its 60s timer.
          reportCaptureStatus(true);
        }
        if (!notificationAccess && !permissionPrompted.current) {
          permissionPrompted.current = true;
          Alert.alert(
            'Accès aux notifications requis',
            'Pour vérifier automatiquement les dépôts, autorisez MatiStore à accéder aux notifications sur ce téléphone administrateur.',
            [
              { text: 'Plus tard', style: 'cancel' },
              { text: 'Ouvrir les réglages', onPress: openNotificationSettings },
            ],
          );
        }
      } catch (error) {
        reportCaptureStatus(false, 'capture_not_configured');
        if (!configurationErrorShown.current) {
          configurationErrorShown.current = true;
          Alert.alert(
            'Capture des notifications indisponible',
            error instanceof Error
              ? error.message
              : 'Impossible de configurer la capture automatique sur cet appareil.',
          );
        }
      } finally {
        configuring.current = false;
      }
    };

    void configure();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void configure();
    });
    return () => {
      disposed = true;
      subscription.remove();
    };
  }, []);
}
