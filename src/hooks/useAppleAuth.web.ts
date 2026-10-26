import { authService } from '@/data_api/services/authService';
import { authStorage } from '@/storage/authStorage';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import Toast from 'react-native-toast-message';

// Web version of useAppleAuth: expo-apple-authentication is iOS only, so the identity token comes from
// Apple's JS popup ("Sign in with Apple JS"). What happens with the token mirrors useAppleAuth.ts.
const APPLE_JS = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/fr_FR/appleid.auth.js';

type AppleSignInResponse = {
  authorization: { id_token: string };
  user?: { name?: { firstName?: string; lastName?: string } }; // only sent on the very first sign-in
};
type AppleIDGlobal = {
  auth: {
    init: (config: { clientId: string; scope: string; redirectURI: string; usePopup: boolean }) => void;
    signIn: () => Promise<AppleSignInResponse>;
  };
};

let pendingAppleIdentityToken: string | null = null;

// Read without clearing: a failed sign-up attempt (e.g. phone already used) must be able to retry.
export function peekPendingAppleIdentityToken(): string | null {
  return pendingAppleIdentityToken;
}

export function consumePendingAppleIdentityToken(): string | null {
  const token = pendingAppleIdentityToken;
  pendingAppleIdentityToken = null;
  return token;
}

let appleJsPromise: Promise<AppleIDGlobal> | null = null;
function loadAppleJs(): Promise<AppleIDGlobal> {
  appleJsPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = APPLE_JS;
    script.onload = () => {
      const AppleID = (window as unknown as { AppleID: AppleIDGlobal }).AppleID;
      AppleID.auth.init({
        clientId: Constants.expoConfig?.extra?.appleServicesId,
        scope: 'name email',
        // Must be one of the Return URLs of the Services ID (https://app.matistore.tech).
        redirectURI: window.location.origin,
        usePopup: true,
      });
      resolve(AppleID);
    };
    script.onerror = () => {
      appleJsPromise = null;
      reject(new Error('Impossible de charger la connexion Apple.'));
    };
    document.head.appendChild(script);
  });
  return appleJsPromise;
}

export function useAppleAuth() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const signInWithApple = async () => {
    setLoading(true);
    try {
      const AppleID = await loadAppleJs();
      const credential = await AppleID.auth.signIn();
      const identityToken = credential.authorization?.id_token;
      if (!identityToken) throw new Error('Apple n’a pas fourni de jeton de connexion.');

      const result = await authService.verifyAppleToken(identityToken);
      if (!result?.isNewUser && result?.access_token) {
        await authStorage.setToken(result.access_token);
        await authStorage.setUser(result.user);
        queryClient.setQueryData(['user'], result.user);
        Toast.show({ type: 'success', text1: 'Connexion réussie', text2: 'Vous êtes connecté avec Apple.' });
        router.replace(result.user?.role === 'ADMIN' ? '/(admin)/admin-home' : '/(tabs)/home');
        return;
      }

      if (!result?.isNewUser || !result.appleId || !result.email) {
        throw new Error('Apple n’a pas transmis les informations nécessaires pour créer le compte.');
      }

      pendingAppleIdentityToken = identityToken;
      const givenName = credential.user?.name?.firstName?.trim();
      const familyName = credential.user?.name?.lastName?.trim();
      router.push({
        pathname: '/(auth)/register-step2',
        params: {
          prenom: givenName || '',
          nom: familyName || '',
          email: result.email,
          appleId: result.appleId,
          provider: 'apple',
        },
      });
    } catch (error: any) {
      // Apple JS rejects with { error: 'popup_closed_by_user' } when the window is closed.
      if (error?.error === 'popup_closed_by_user' || error?.error === 'user_cancelled_authorize') return;
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
