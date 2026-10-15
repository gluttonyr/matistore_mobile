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

  // "Me rappeler plus tard" ferme juste le dialogue pour cette session-ci —
  // rien n'est persisté, donc à la prochaine fermeture totale + réouverture
  // de l'app, le check repart de zéro et le dialogue réapparaît si toujours
  // en dessous de la version minimale.
  const remindLater = useCallback(() => {
    setVisible(false);
  }, []);

  const dismiss = useCallback(() => setVisible(false), []);

  return { visible, checking, remindLater, dismiss };
}