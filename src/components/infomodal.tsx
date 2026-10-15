import { Colors } from '@/constants/colors';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type InfoModalType = 'success' | 'error' | 'warning' | 'info';

type Props = {
  visible: boolean;
  onClose: () => void;
  type?: InfoModalType;
  title: string;
  message?: string;
  confirmText?: string;
  onConfirm?: () => void;
  /** Bouton secondaire optionnel (ex: "Réessayer", "Paramètres") */
  secondaryText?: string;
  onSecondary?: () => void;
};

const ICONS: Record<InfoModalType, any> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS_BY_TYPE: Record<InfoModalType, string> = {
  success: Colors.primaryGreen,
  error: '#ef4444',
  warning: '#f59e0b',
  info: Colors.primaryGreen,
};

// Remplace Alert.alert(title, message) par une modale centrée stylée
// (icône colorée selon le type + bouton(s) d'action).
export function InfoModal({
  visible,
  onClose,
  type = 'info',
  title,
  message,
  confirmText = 'OK',
  onConfirm,
  secondaryText,
  onSecondary,
}: Props) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 6 }),
      ]).start();
    } else {
      opacity.setValue(0);
      scale.setValue(0.9);
    }
  }, [visible]);

  const Icon = ICONS[type];
  const accent = COLORS_BY_TYPE[type];

  const handleConfirm = () => {
    onClose();
    onConfirm?.();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[st.overlay, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[st.card, { transform: [{ scale }] }]}>
          <View style={[st.iconWrap, { backgroundColor: `${accent}1A`, borderColor: `${accent}40` }]}>
            <Icon color={accent} size={30} strokeWidth={2.2} />
          </View>

          <Text style={st.title}>{title}</Text>
          {!!message && <Text style={st.message}>{message}</Text>}

          <View style={st.actions}>
            {secondaryText && (
              <TouchableOpacity
                style={st.secondaryBtn}
                activeOpacity={0.8}
                onPress={() => {
                  onClose();
                  onSecondary?.();
                }}
              >
                <Text style={st.secondaryText}>{secondaryText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[st.confirmBtn, { backgroundColor: accent }, secondaryText && { flex: 1 }]}
              activeOpacity={0.85}
              onPress={handleConfirm}
            >
              <Text style={st.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.secondaryBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { color: Colors.white, fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  message: { color: Colors.textSecondary, fontSize: 13.5, textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  actions: { flexDirection: 'row', gap: 10, width: '100%' },
  confirmBtn: { flex: 1, minHeight: 48, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#000', fontSize: 14.5, fontWeight: '800', textAlign: 'center', flexShrink: 1 },
  secondaryBtn: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryText: { color: Colors.white, fontSize: 14.5, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
});
