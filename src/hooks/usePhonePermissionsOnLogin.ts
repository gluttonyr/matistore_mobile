import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/useAuth';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

const ASKED_KEY = 'phone-permissions-asked-v1';

export const PHONE_PERMISSIONS = [
  PermissionsAndroid.PERMISSIONS.CALL_PHONE,
  PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
];

/** True when MatiStore may launch the USSD code itself (call + SIM choice). */
export async function hasPhonePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const results = await Promise.all(PHONE_PERMISSIONS.map((p) => PermissionsAndroid.check(p)));
    return results.every(Boolean);
  } catch {
    return false;
  }
}

/**
 * Asks for the phone permissions once, right after the first login on this phone,
 * so the deposit never has to ask. Refusing is fine: deposits then open the dialer.
 */
export function usePhonePermissionsOnLogin(): void {
  const { isAuthenticated, authReady } = useAuth();

  useEffect(() => {
    if (Platform.OS !== 'android' || !authReady || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        if (await AsyncStorage.getItem(ASKED_KEY)) return;
        // Android shows one permission dialog at a time: let the notification one
        // (asked by usePushNotificationRegistration at the same moment) finish first.
        for (let i = 0; i < 60 && !cancelled; i++) {
          const { status } = await Notifications.getPermissionsAsync();
          if (status !== 'undetermined') break;
          await new Promise((r) => setTimeout(r, 500));
        }
        if (cancelled) return;
        if (!(await hasPhonePermissions())) {
          await PermissionsAndroid.requestMultiple(PHONE_PERMISSIONS);
        }
        await AsyncStorage.setItem(ASKED_KEY, '1');
      } catch (error) {
        console.warn('Phone permission request skipped:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [authReady, isAuthenticated]);
}
