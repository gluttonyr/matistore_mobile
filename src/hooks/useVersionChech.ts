// hooks/useVersionCheck.ts
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { parametreService } from '@/data_api/services/parametreService';

const PARAMETRE_CODE = Platform.OS === 'ios' ? 'IOS_MIN_VERSION_CODE' : 'ANDROID_MIN_VERSION_CODE';

export function useVersionCheck() {
  const [visible, setVisible] = useState(false);
  const [checking, setChecking] = useState(true);

  const check = useCallback(async () => {
    // The website is always up to date: never show the store update dialog there.
    if (Platform.OS === 'web') {
      setVisible(false);
      setChecking(false);
      return;
    }
    setChecking(true);
    try {
      const parametre = await parametreService.getById(PARAMETRE_CODE);
      const minRequired = parametre?.valeur ?? 0;

      if (!minRequired || minRequired <= 0) {
        setVisible(false);
        return;
      }

      const currentBuild = Application.nativeBuildVersion
        ? parseInt(Application.nativeBuildVersion, 10)
        : 0;

      setVisible(currentBuild > 0 && currentBuild < minRequired);
    } catch {
      setVisible(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  // The update is mandatory: the dialog cannot be closed until the app is updated.
  return { visible, checking };
}