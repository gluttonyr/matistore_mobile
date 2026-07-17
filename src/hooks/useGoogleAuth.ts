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

/**
 * Connexion Google partagée entre l'écran de connexion et celui
 * d'inscription : le comportement est identique quel que soit l'écran
 * d'origine — si le compte existe déjà, on connecte directement l'utilisateur
 * (pas de nouvelle inscription) ; sinon on l'envoie finaliser son compte
 * (mot de passe + téléphone) sur register-step2.
 */
export function useGoogleAuth() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (configured) return;
    GoogleSignin.configure({
      webClientId: Constants.expoConfig?.extra?.googleWebClientId,
    });
    configured = true;
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return; // annulé par l'utilisateur

      const idToken = response.data.idToken;
      if (!idToken) {
        Toast.show({
          type: 'error',
          text1: 'Erreur',
          text2: "Google n'a pas renvoyé de jeton d'identification. Veuillez réessayer.",
        });
        return;
      }

      const res = await authService.verifyGoogleToken(idToken);
      if (!res) {
        Toast.show({
          type: 'error',
          text1: 'Erreur',
          text2: 'Une erreur est survenue lors de la connexion avec Google. Veuillez réessayer.',
        });
        return;
      }

      if (!res.isNewUser && res.access_token) {
        // Compte déjà existant : connexion classique, qu'on vienne de l'écran
        // de connexion ou de celui d'inscription.
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
        router.push({ pathname: '/(auth)/register-step2', params: { prenom, nom, email, googleId } });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Erreur',
          text2: 'Une erreur est survenue. Veuillez réessayer.',
        });
      }
    } catch (err) {
      if (isErrorWithCode(err) && err.code === statusCodes.IN_PROGRESS) {
        return; // une connexion est déjà en cours
      }
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Une erreur est survenue lors de la connexion avec Google. Veuillez réessayer.',
      });
    } finally {
      setLoading(false);
    }
  };

  return { signInWithGoogle, loading };
}
