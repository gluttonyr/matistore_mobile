import { Colors } from '@/constants/colors';
import { Check, Info, X } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import type { ToastConfig, ToastConfigParams } from 'react-native-toast-message';

// The app's toasts: a dark card with a coloured icon and a thin coloured edge.
const KINDS = {
  success: { color: Colors.primaryGreen, Icon: Check, iconColor: '#050505' },
  error: { color: '#FF7A7A', Icon: X, iconColor: '#050505' },
  info: { color: '#A78BFA', Icon: Info, iconColor: '#050505' },
} as const;

function AppToast({ kind, text1, text2 }: { kind: keyof typeof KINDS } & ToastConfigParams<unknown>) {
  const { color, Icon, iconColor } = KINDS[kind];
  return (
    <View style={[s.card, { borderColor: color + '66' }]} accessibilityRole="alert">
      <View style={[s.icon, { backgroundColor: color }]}>
        <Icon color={iconColor} size={16} strokeWidth={3} />
      </View>
      <View style={s.copy}>
        {!!text1 && <Text style={s.title} numberOfLines={2}>{text1}</Text>}
        {!!text2 && <Text style={s.body} numberOfLines={3}>{text2}</Text>}
      </View>
    </View>
  );
}

export const toastConfig: ToastConfig = {
  success: (p) => <AppToast kind="success" {...p} />,
  error: (p) => <AppToast kind="error" {...p} />,
  info: (p) => <AppToast kind="info" {...p} />,
};

const s = StyleSheet.create({
  card: {
    width: '92%', maxWidth: 480,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 18, borderWidth: 1,
    backgroundColor: '#1F1F1F',
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  icon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 2 },
  title: { color: Colors.white, fontSize: 14, fontWeight: '800' },
  body: { color: Colors.textSecondary, fontSize: 12, lineHeight: 17 },
});
