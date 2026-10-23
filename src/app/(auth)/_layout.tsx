import { Stack } from 'expo-router';
import { View } from 'react-native';

import { Colors } from '@/constants/colors';
import { useWideWeb } from '@/hooks/useWideWeb';

export default function AuthLayout() {
  const wide = useWideWeb();
  return (
    // Website on a computer: the sign-in / sign-up forms stay a readable width, centered.
    <View style={wide ? { flex: 1, alignItems: 'center', backgroundColor: Colors.darkBg } : { flex: 1 }}>
      <View style={wide ? { flex: 1, width: '100%', maxWidth: 520 } : { flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="welcome" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register-step1" />
          <Stack.Screen name="register-step2" />
        </Stack>
      </View>
    </View>
  );
}
