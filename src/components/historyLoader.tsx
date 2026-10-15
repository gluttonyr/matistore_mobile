// components/HistoryLoader.tsx
import { Colors } from '@/constants/colors';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export function HistoryLoader({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={st.wrap}>
      <ActivityIndicator size="small" color={Colors.primaryGreen} />
      <Text style={st.text}>Chargement des messages précédents…</Text>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  text: { color: Colors.textSecondary, fontSize: 12 },
});