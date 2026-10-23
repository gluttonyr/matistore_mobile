
import '@/components/hideScrollbars';
import '@/components/webAlert';
import { UpdateAvailableModal } from '@/components/updateAvailableNodal';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useVersionCheck } from '@/hooks/useVersionChech';
import { useWideWeb } from '@/hooks/useWideWeb';
import { Colors } from '@/constants/colors';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import Toast from 'react-native-toast-message';

// Web only: dark navigation theme, so no light background shows around centered screens.
const webTheme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: Colors.darkBg, card: Colors.darkBg } };
function WebTheme({ children }: { children: ReactNode }) {
  return Platform.OS === 'web' ? <ThemeProvider value={webTheme}>{children}</ThemeProvider> : <>{children}</>;
}

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
  const wide = useWideWeb();
  const pushedScreen = { animation: 'slide_from_right' as const };

  return (
    <GestureHandlerRootView style={wide ? { flex: 1, backgroundColor: Colors.darkBg } : { flex: 1 }}>
      <KeyboardProvider>
        <QueryClientProvider client={queryClientRef.current}>
            <WebTheme>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />

              {/* Les tabs (PagerView) — animation fade pour ne pas voir de slide */}
              <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />

              {/* ── Screens poussés PAR-DESSUS les tabs ── */}
              <Stack.Screen
                name="user_chats/[id]"
                options={pushedScreen}
              />
              <Stack.Screen
                name="admin_chats/[id]"
                options={pushedScreen}
              />
              <Stack.Screen
                name="admin_events/create"
                options={pushedScreen}
              />
              <Stack.Screen
                name="admin_events/edit"
                options={pushedScreen}
              />
              <Stack.Screen
                name="user_events/[id]"
                options={pushedScreen}
              />
              <Stack.Screen
                name="user_chats/deposit-withdrawal"
                options={pushedScreen}
              />
              <Stack.Screen
                name="user_transactions/index"
                options={pushedScreen}
              />
              <Stack.Screen
                name="user_notifications/index"
                options={pushedScreen}
              />
              <Stack.Screen
                name="admin_transactions/index"
                options={pushedScreen}
              />
              <Stack.Screen
                name="config/slide-editor"
                options={pushedScreen}
              />

              <Stack.Screen name="+not-found" />
            </Stack>
            </WebTheme>

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
    </GestureHandlerRootView>
  );
}
