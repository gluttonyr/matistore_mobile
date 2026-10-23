import { authService } from '@/data_api/services/authService';
import { authStorage } from '@/storage/authStorage';
import { useQueryClient } from '@tanstack/react-query';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import Toast from 'react-native-toast-message';

// Web version of useGoogleAuth: @react-native-google-signin has no free web support, so the ID token comes
// from Google's web popup. What happens with the token mirrors useGoogleAuth.ts (same backend route).
export function useGoogleAuth() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: Constants.expoConfig?.extra?.googleWebClientId,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type !== 'success') {
      setLoading(false);
      if (response.type === 'error') {
        Toast.show({ type: 'error', text1: 'Connexion Google', text2: 'Impossible de se connecter avec Google.' });
      } else {
        Toast.show({ type: 'info', text1: 'Connexion annulée', text2: 'La connexion avec Google a été annulée.' });
      }
      return;
    }

    const idToken = response.params.id_token;
    if (!idToken) {
      setLoading(false);
      Toast.show({ type: 'error', text1: 'Connexion Google', text2: "Google n'a pas fourni le jeton nécessaire." });
      return;
    }

    (async () => {
      try {
        const res = await authService.verifyGoogleToken(idToken);
        if (!res) {
          Toast.show({ type: 'error', text1: 'Connexion Google', text2: 'Le serveur n’a pas pu valider votre connexion.' });
        } else if (!res.isNewUser && res.access_token) {
          await authStorage.setToken(res.access_token);
          await authStorage.setUser(res.user);
          queryClient.setQueryData(['user'], res.user);
          Toast.show({ type: 'success', text1: 'Connexion réussie', text2: 'Vous êtes maintenant connecté à votre compte.' });
          router.replace('/(tabs)/home');
        } else if (res.isNewUser) {
          const { prenom, nom, email, googleId } = res.user;
          router.push({ pathname: '/(auth)/register-step2', params: { prenom, nom, email, googleId } });
        } else {
          Toast.show({ type: 'error', text1: 'Connexion Google', text2: 'La connexion n’a pas pu être finalisée.' });
        }
      } catch {
        Toast.show({ type: 'error', text1: 'Connexion Google', text2: 'Impossible de se connecter avec Google.' });
      } finally {
        setLoading(false);
      }
    })();
  }, [response, queryClient]);

  const signInWithGoogle = async () => {
    if (!request) return;
    setLoading(true);
    await promptAsync();
  };

  return { signInWithGoogle, loading };
}
