
import { UpdateAvailableModal } from '@/components/updateAvailableNodal';
import { WebFrame } from '@/components/WebFrame';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useVersionCheck } from '@/hooks/useVersionChech';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import Toast from 'react-native-toast-message';

export default function RootLayout() {
  useFrameworkReady();
  // ⚠️ Un `new QueryClient()` à chaque render du RootLayout recrée le cache
  // React Query à chaque fois. Comme RootLayout ne se remonte normalement
  // qu'une fois, ce n'est pas grave en pratique, mais `useRef` évite tout
  // risque si jamais ce composant venait à re-render pour une autre raison.
  const queryClientRef = useRef<QueryClient | undefined>(undefined);
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient();
  }

  const { visible: updateVisible, remindLater, dismiss } = useVersionCheck();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <WebFrame>
      <KeyboardProvider>
        <QueryClientProvider client={queryClientRef.current}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />

              {/* Les tabs (PagerView) — animation fade pour ne pas voir de slide */}
              <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />

              {/* ── Screens poussés PAR-DESSUS les tabs ── */}
              <Stack.Screen
                name="user_chats/[id]"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="admin_chats/[id]"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="admin_events/create"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="admin_events/edit"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="user_events/[id]"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="user_chats/deposit-withdrawal"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="user_transactions/index"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="user_notifications/index"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="admin_transactions/index"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="config/slide-editor"
                options={{ animation: 'slide_from_right' }}
              />

              <Stack.Screen name="+not-found" />
            </Stack>

          <StatusBar style="light" />
          <Toast />

          {/* Placé au niveau racine : s'affiche par-dessus n'importe quel écran */}
          <UpdateAvailableModal
            visible={updateVisible}
            onClose={dismiss}
            onRemindLater={remindLater}
          />
        </QueryClientProvider>
      </KeyboardProvider>
      </WebFrame>
    </GestureHandlerRootView>
  );
}
