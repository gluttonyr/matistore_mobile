import { authService } from '@/data_api/services/authService';
import { authStorage } from '@/storage/authStorage';
import { UserRole } from '@/data_api/models/user.types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { pushDeviceService } from '@/data_api/services/pushDeviceService';
import { stopCapture } from '@/modules/expo-notif-capture';
import { socketService } from '@/data_api/services/socketService';

let profileValidationToken: string | null = null;
let profileValidation: ReturnType<typeof authService.getProfile> | null = null;

function getProfileOnce(token: string) {
  if (profileValidationToken !== token || !profileValidation) {
    profileValidationToken = token;
    profileValidation = authService.getProfile().catch((error) => {
      if (profileValidationToken === token) profileValidation = null;
      throw error;
    });
  }
  return profileValidation;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    enabled: false,
    queryFn: () => authService.getProfile(),
  });

  useEffect(() => {
    (async () => {
      const storedToken = await authStorage.getToken();
      const storedUser = await authStorage.getUser();

      if (!storedToken) {
        setAuthReady(true);
        return;
      }

      if (storedUser) queryClient.setQueryData(['user'], storedUser);
      setToken(storedToken);

      try {
        const profile = await getProfileOnce(storedToken);
        queryClient.setQueryData(['user'], profile);
        await authStorage.setUser(profile);
      } catch (error: any) {
        if (error?.response?.status === 401) {
          stopCapture();
          await authStorage.removeToken();
          await authStorage.removeUser();
          queryClient.clear();
          setToken(null);
        }
      } finally {
        setAuthReady(true);
      }
    })();
  }, []);

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: async (response) => {
      await authStorage.setToken(response.data.token);
      await authStorage.setUser(response.data.user);
      queryClient.setQueryData(['user'], response.data.user);
      setToken(response.data.token);
      router.replace('/');
    },
  });

  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: () => router.replace('/login'),
  });

  const logout = async () => {
    profileValidationToken = null;
    profileValidation = null;
    try { stopCapture(); } catch { /* le logout reste disponible même sans module natif */ }
    socketService.disconnect();
    // Les notifications livrées avant la déconnexion ne doivent pas pouvoir
    // ouvrir une discussion sous l'identité du prochain compte connecté.
    try {
      await Notifications.dismissAllNotificationsAsync();
      await Notifications.clearLastNotificationResponse();
    } catch {
      // La déconnexion locale reste prioritaire si le système de notifications échoue.
    }
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (projectId) {
        const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
        await pushDeviceService.deactivate(pushToken.data);
      }
    } catch {
      // La déconnexion locale reste prioritaire si le serveur push est indisponible.
    }

    await authStorage.removeToken();
    await authStorage.removeUser();
    queryClient.clear();
    setToken(null);
    router.replace('/');
  };

  return {
    user,
    token,
    isAuthenticated: !!token,
    authReady,
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutate,
    registerAsync: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    logout,
  };
}
