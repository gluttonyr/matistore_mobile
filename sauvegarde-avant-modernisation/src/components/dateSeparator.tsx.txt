import { Colors } from '@/constants/colors';
import { StyleSheet, Text, View } from 'react-native';

export function DateSeparator({ label }: { label: string }) {
  return (
    <View style={st.wrap}>
      <View style={st.pill}>
        <Text style={st.text}>{label}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  pill: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    // légère ombre pour bien la détacher du fond quand elle "flotte" au scroll
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  text: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
});