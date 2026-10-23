import { Stack } from 'expo-router';
import { View } from 'react-native';

import WebBrandPanel from '@/components/WebBrandPanel';
import { Colors } from '@/constants/colors';
import { useWideWeb } from '@/hooks/useWideWeb';

export default function AuthLayout() {
  const wide = useWideWeb();
  const stack = (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register-step1" />
      <Stack.Screen name="register-step2" />
    </Stack>
  );
  if (!wide) return stack;
  // Website on a computer: MatiStore presentation on the left, the page (buttons / form) on the right.
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: Colors.darkBg }}>
      <WebBrandPanel />
      <View style={{ width: 560 }}>{stack}</View>
    </View>
  );
}
