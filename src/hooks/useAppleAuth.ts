import { authService } from '@/data_api/services/authService';
import { authStorage } from '@/storage/authStorage';
import { useQueryClient } from '@tanstack/react-query';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';

let pendingAppleIdentityToken: string | null = null;

export function consumePendingAppleIdentityToken(): string | null {
  const token = pendingAppleIdentityToken;
  pendingAppleIdentityToken = null;
  return token;
}

export function useAppleAuth() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const signInWithApple = async () => {
    if (Platform.OS !== 'ios') return;
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('Apple n’a pas fourni de jeton de connexion.');

      const result = await authService.verifyAppleToken(credential.identityToken);
      if (!result?.isNewUser && result?.access_token) {
        await authStorage.setToken(result.access_token);
        await authStorage.setUser(result.user);
        queryClient.setQueryData(['user'], result.user);
        Toast.show({ type: 'success', text1: 'Connexion réussie', text2: 'Vous êtes connecté avec Apple.' });
        router.replace(result.user?.role === 'ADMIN' ? '/(admin)/home' : '/(tabs)/home');
        return;
      }

      if (!result?.isNewUser || !result.appleId || !result.email) {
        throw new Error('Apple n’a pas transmis les informations nécessaires pour créer le compte.');
      }

      pendingAppleIdentityToken = credential.identityToken;
      const givenName = credential.fullName?.givenName?.trim();
      const familyName = credential.fullName?.familyName?.trim();
      router.push({
        pathname: '/(auth)/register-step2',
        params: {
          prenom: givenName || 'Utilisateur',
          nom: familyName || 'Apple',
          email: result.email,
          appleId: result.appleId,
          provider: 'apple',
        },
      });
    } catch (error: any) {
      if (error?.code === 'ERR_REQUEST_CANCELED') return;
      Toast.show({
        type: 'error',
        text1: 'Connexion Apple',
        text2: error?.response?.data?.message || error?.message || 'La connexion Apple a échoué.',
      });
    } finally {
      setLoading(false);
    }
  };

  return { signInWithApple, loading };
}
