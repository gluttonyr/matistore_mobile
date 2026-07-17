import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';

export default function RootLayout() {
  useFrameworkReady();
  const queryClient = new QueryClient();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />

          {/* Les tabs (PagerView) — animation fade pour ne pas voir de slide */}
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />

          {/* ── Screens poussés PAR-DESSUS les tabs ── */}
          {/* Ces routes sont au niveau racine pour échapper au PagerView */}
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
            name="config/slide-editor"
            options={{ animation: 'slide_from_right' }}
          />

          <Stack.Screen name="+not-found" />
        </Stack>

        <StatusBar style="light" />
        <Toast />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}