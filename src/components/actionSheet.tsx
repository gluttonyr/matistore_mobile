import { Colors } from '@/constants/colors';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export type ActionSheetOption = {
  key: string;
  text: string;
  icon?: React.ReactNode;
  style?: 'default' | 'destructive' | 'cancel';
  onPress?: () => void;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  options: ActionSheetOption[];
};

// Remplace Alert.alert(title, message, options) par une bottom-sheet
// stylée conforme au thème sombre de l'app (au lieu de la modale
// blanche par défaut d'iOS/Android).
export function ActionSheet({ visible, onClose, title, message, options }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 16 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const mainOptions = options.filter((o) => o.style !== 'cancel');
  const cancelOption = options.find((o) => o.style === 'cancel');

  const handlePress = (opt: ActionSheetOption) => {
    onClose();
    // Petit délai pour laisser la modale se fermer avant d'exécuter l'action
    // (évite les conflits avec la caméra/galerie qui s'ouvre juste après sur Android).
    setTimeout(() => opt.onPress?.(), Platform.OS === 'android' ? 250 : 50);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[st.overlay, { opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[st.sheet, { paddingBottom: Math.max(insets.bottom, 16), transform: [{ translateY }] }]}
        >
          <View style={st.handle} />

          {(title || message) && (
            <View style={st.headerWrap}>
              {title && <Text style={st.title}>{title}</Text>}
              {message && <Text style={st.message}>{message}</Text>}
            </View>
          )}

          <View style={st.optionsCard}>
            {mainOptions.map((opt, idx) => (
              <TouchableOpacity
                key={opt.key}
                style={[st.optionRow, idx < mainOptions.length - 1 && st.optionBorder]}
                activeOpacity={0.65}
                onPress={() => handlePress(opt)}
              >
                {opt.icon && <View style={st.optionIcon}>{opt.icon}</View>}
                <Text style={[st.optionText, opt.style === 'destructive' && st.optionTextDestructive]}>
                  {opt.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {cancelOption && (
            <TouchableOpacity style={st.cancelCard} activeOpacity={0.65} onPress={() => handlePress(cancelOption)}>
              <Text style={st.cancelText}>{cancelOption.text}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { paddingHorizontal: 12, paddingTop: 8 },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 10,
  },
  headerWrap: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  title: { color: Colors.white, fontSize: 14, fontWeight: '700', marginBottom: 3 },
  message: { color: Colors.textSecondary, fontSize: 12, textAlign: 'center', lineHeight: 17 },
  optionsCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    gap: 8,
  },
  optionBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  optionIcon: { marginRight: 2 },
  optionText: { color: Colors.white, fontSize: 15.5, fontWeight: '600' },
  optionTextDestructive: { color: '#ef4444' },
  cancelCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    paddingVertical: 15,
  },
  cancelText: { color: Colors.primaryGreen, fontSize: 15.5, fontWeight: '700' },
});