import { authService } from '@/data_api/services/authService';
import { authStorage } from '@/storage/authStorage';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import Toast from 'react-native-toast-message';

let configured = false;

export function useGoogleAuth() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (configured) return;

    const webClientId = Constants.expoConfig?.extra?.googleWebClientId;

    console.log('[GoogleAuth] Configuration Google:', {
      webClientIdPresent: !!webClientId,
      webClientId: webClientId
        ? `${webClientId.substring(0, 15)}...`
        : 'UNDEFINED',
    });

    GoogleSignin.configure({
      webClientId,
    });

    configured = true;
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);

    try {
      console.log('[GoogleAuth] Vérification de Google Play Services...');

      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      console.log('[GoogleAuth] Google Play Services OK');
      console.log('[GoogleAuth] Lancement de Google Sign-In...');

      const response = await GoogleSignin.signIn();

      console.log('[GoogleAuth] Google Sign-In terminé');

      if (!isSuccessResponse(response)) {
        console.log('[GoogleAuth] Connexion Google annulée');

        Toast.show({
          type: 'info',
          text1: 'Connexion annulée',
          text2: 'La connexion avec Google a été annulée.',
        });

        return;
      }

      console.log('[GoogleAuth] Réponse Google reçue');

      const idToken = response.data.idToken;

      console.log(
        '[GoogleAuth] ID Token reçu :',
        !!idToken,
      );

      if (!idToken) {
        console.error('[GoogleAuth] ❌ Google n’a pas retourné de ID Token');

        Toast.show({
          type: 'error',
          text1: 'Connexion Google',
          text2: "Google n'a pas fourni le jeton nécessaire.",
        });

        return;
      }

      console.log('[GoogleAuth] Envoi du token au serveur...');

      const res = await authService.verifyGoogleToken(idToken);

      console.log('[GoogleAuth] Réponse du serveur reçue :', res);

      if (!res) {
        Toast.show({
          type: 'error',
          text1: 'Connexion Google',
          text2: 'Le serveur n’a pas pu valider votre connexion.',
        });

        return;
      }

      if (!res.isNewUser && res.access_token) {
        await authStorage.setToken(res.access_token);
        await authStorage.setUser(res.user);

        queryClient.setQueryData(['user'], res.user);

        Toast.show({
          type: 'success',
          text1: 'Connexion réussie',
          text2: 'Vous êtes maintenant connecté à votre compte.',
        });

        router.replace('/(tabs)/home');

      } else if (res.isNewUser) {

        const { prenom, nom, email, googleId } = res.user;

        router.push({
          pathname: '/(auth)/register-step2',
          params: {
            prenom,
            nom,
            email,
            googleId,
          },
        });

      } else {

        Toast.show({
          type: 'error',
          text1: 'Connexion Google',
          text2: 'La connexion n’a pas pu être finalisée.',
        });
      }

    } catch (err: any) {

      console.error('========== GOOGLE SIGN-IN ERROR ==========');

      console.error('[GoogleAuth] Erreur complète :', err);
      console.error('[GoogleAuth] Code :', err?.code);
      console.error('[GoogleAuth] Message :', err?.message);
      console.error('[GoogleAuth] Name :', err?.name);

      console.error('==========================================');

      // Connexion déjà en cours
      if (
        isErrorWithCode(err) &&
        err.code === statusCodes.IN_PROGRESS
      ) {
        console.log('[GoogleAuth] Une connexion Google est déjà en cours.');
        return;
      }

      // Utilisateur qui ferme/annule volontairement Google
      if (
        isErrorWithCode(err) &&
        err.code === statusCodes.SIGN_IN_CANCELLED
      ) {
        Toast.show({
          type: 'info',
          text1: 'Connexion annulée',
          text2: 'La connexion avec Google a été annulée.',
        });

        return;
      }

      // Google Play Services indisponible
      if (
        isErrorWithCode(err) &&
        err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE
      ) {
        Toast.show({
          type: 'error',
          text1: 'Google indisponible',
          text2: 'Google Play Services n’est pas disponible sur cet appareil.',
        });

        return;
      }

      // Erreur de configuration OAuth
      if (isErrorWithCode(err) && err.code === 'DEVELOPER_ERROR') {
  Toast.show({
    type: 'error',
    text1: 'Configuration Google',
    text2: 'La configuration Google de cette application est incorrecte.',
  });

  return;
}

      // Autre erreur
      Toast.show({
        type: 'error',
        text1: 'Connexion Google',
        text2: `Impossible de se connecter avec Google (${err?.code ?? 'erreur inconnue'}).`,
      });

    } finally {
      setLoading(false);
    }
  };

  return {
    signInWithGoogle,
    loading,
  };
}