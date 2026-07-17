import { authService } from '@/data_api/services/authService';
import { authStorage } from '@/storage/authStorage';
import { UserRole } from '@/data_api/models/user.types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  // Devient true une fois la résolution de session de démarrage terminée
  // (token + éventuelle validation réseau) : les écrans qui décident où
  // rediriger l'utilisateur (ex: le splash) doivent attendre ce signal
  // plutôt que de deviner via un délai fixe.
  const [authReady, setAuthReady] = useState(false);

  // 🧠 USER : entièrement piloté par l'effet de démarrage ci-dessous et les
  // mutations de login/register (via setQueryData) — pas de fetch auto ici.
  const { data: user } = useQuery({
    queryKey: ['user'],
    enabled: false,
    queryFn: () => authService.getProfile(),
  });

  // ─── Résolution de session au démarrage ────────────────────────────────
  // Objectif : ne pas redemander la connexion à chaque ouverture de l'app
  // pour un utilisateur normal. On garde son token + profil en cache, on
  // les affiche immédiatement, puis on valide le token en tâche de fond :
  //   - 401 (token invalide/expiré)      → on force la reconnexion
  //   - serveur injoignable (pas de 401) → on laisse passer avec le cache
  // Les comptes ADMIN, eux, doivent toujours se reconnecter manuellement :
  // une session admin persistée n'est jamais réutilisée au redémarrage.
  useEffect(() => {
    (async () => {
      const storedToken = await authStorage.getToken();
      const storedUser = await authStorage.getUser();

      if (!storedToken) {
        setAuthReady(true);
        return;
      }

      if (storedUser?.role === UserRole.ADMIN) {
        await authStorage.removeToken();
        await authStorage.removeUser();
        setAuthReady(true);
        return;
      }

      if (storedUser) {
        queryClient.setQueryData(['user'], storedUser);
      }
      setToken(storedToken);

      try {
        const profile = await authService.getProfile();
        if (profile.role === UserRole.ADMIN) {
          // Rôle admin découvert seulement maintenant (pas encore en cache
          // locale, ex: juste après cette mise à jour) : même règle.
          await authStorage.removeToken();
          await authStorage.removeUser();
          queryClient.clear();
          setToken(null);
        } else {
          queryClient.setQueryData(['user'], profile);
          await authStorage.setUser(profile);
        }
      } catch (error: any) {
        if (error?.response?.status === 401) {
          await authStorage.removeToken();
          await authStorage.removeUser();
          queryClient.clear();
          setToken(null);
        }
        // Sinon (serveur injoignable) : on laisse passer avec les données en cache.
      } finally {
        setAuthReady(true);
      }
    })();
  }, []);


  // 🔑 LOGIN
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

  // 🧾 REGISTER
  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: () => {
      router.replace('/login');
    },
  });

  // 🚪 LOGOUT
  const logout = async () => {
    await authStorage.removeToken();
    await authStorage.removeUser();

    queryClient.clear();
    setToken(null);

    router.replace('/login');
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