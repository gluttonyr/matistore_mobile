// components/UpdateAvailableModal.tsx
import { PressableScale } from '@/components/ui/PressableScale';
import { Colors } from '@/constants/colors';
import * as Application from 'expo-application';
import { Download, Rocket, Ticket, Trophy, Zap } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Linking, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const IOS_APP_ID = '0000000000'; // ID numérique App Store (pas le bundle id)

// What's new in this version: edit this list before each release.
const WHATS_NEW = [
  { Icon: Zap, color: Colors.primaryGreen, bg: 'rgba(125,255,42,0.12)', text: 'Dépôt rapide en un geste' },
  { Icon: Trophy, color: '#FFC94D', bg: 'rgba(255,201,77,0.14)', text: 'Tournoi de parrainage avec des lots' },
  { Icon: Ticket, color: '#A78BFA', bg: 'rgba(167,139,250,0.14)', text: 'Coupons du jour à copier' },
];

function openStore() {
  if (Platform.OS === 'android') {
    Linking.openURL('market://details?id=com.urbain_diligence.matistore_mobile').catch(() =>
      Linking.openURL('https://play.google.com/store/apps/details?id=com.urbain_diligence.matistore_mobile')
    );
  } else {
    Linking.openURL(`itms-apps://itunes.apple.com/app/id${IOS_APP_ID}`).catch(() =>
      Linking.openURL(`https://apps.apple.com/app/id${IOS_APP_ID}`)
    );
  }
}

type Props = { visible: boolean };

// Bottom sheet over the dimmed app: rocket, what's new, "Mettre à jour".
// The update is mandatory: no "Plus tard", and neither the back button nor a tap
// outside closes it. It goes away only once the app is updated.
export function UpdateAvailableModal({ visible }: Props) {
  const insets = useSafeAreaInsets();
  const lift = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    const float = Animated.loop(Animated.sequence([
      Animated.timing(lift, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(lift, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    const turn = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }));
    float.start();
    turn.start();
    return () => { float.stop(); turn.stop(); };
  }, [visible, lift, spin]);

  const current = Application.nativeApplicationVersion;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => {}} statusBarTranslucent>
      <View style={st.overlay}>
        <View style={[st.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 18 }]}>
          <View style={st.handle} />

          <View style={st.hero}>
            <View style={st.heroGlow} />
            <Animated.View style={[st.orbit, { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]} />
            <View style={st.rocketBox}>
              <Animated.View style={{ transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) }] }}>
                <Rocket color="#050505" size={38} strokeWidth={2.2} />
              </Animated.View>
            </View>
          </View>

          {!!current && <Text style={st.version}>Vous avez la version {current}</Text>}
          <Text style={st.title}>Une nouvelle version est prête</Text>
          <Text style={st.subtitle}>
            Cette mise à jour est obligatoire pour continuer à utiliser Matistore et faire vos dépôts et retraits.
          </Text>

          <View style={st.list}>
            {WHATS_NEW.map(({ Icon, color, bg, text }) => (
              <View key={text} style={st.item}>
                <View style={[st.itemIcon, { backgroundColor: bg }]}><Icon color={color} size={17} /></View>
                <Text style={st.itemText}>{text}</Text>
              </View>
            ))}
          </View>

          <PressableScale style={st.updateBtn} onPress={openStore} accessibilityLabel="Mettre à jour maintenant">
            <Download color="#050505" size={19} strokeWidth={2.6} />
            <Text style={st.updateBtnText}>Mettre à jour maintenant</Text>
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: {
    width: '100%', maxWidth: 520, alignSelf: 'center',
    backgroundColor: '#0E0E0E',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    borderTopWidth: 1, borderColor: 'rgba(125,255,42,0.35)',
    paddingHorizontal: 22, paddingTop: 12,
    alignItems: 'center',
  },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#2A2A2A', marginBottom: 14 },
  hero: { width: 132, height: 132, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heroGlow: { position: 'absolute', width: 132, height: 132, borderRadius: 66, backgroundColor: 'rgba(125,255,42,0.10)' },
  orbit: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    borderWidth: 2, borderColor: 'transparent', borderTopColor: 'rgba(125,255,42,0.6)', borderRightColor: 'rgba(125,255,42,0.25)',
  },
  rocketBox: {
    width: 78, height: 78, borderRadius: 26, backgroundColor: Colors.primaryGreen,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primaryGreen, shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10,
  },
  version: {
    color: '#9BFF5C', fontSize: 12, fontWeight: '800',
    backgroundColor: 'rgba(125,255,42,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden', marginBottom: 10,
  },
  title: { color: Colors.white, fontSize: 23, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: Colors.textSecondary, fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 18, maxWidth: 320 },
  list: { width: '100%', gap: 8, marginBottom: 18 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#161616' },
  itemIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1, color: Colors.white, fontSize: 14, fontWeight: '600' },
  updateBtn: {
    width: '100%', height: 56, borderRadius: 17, backgroundColor: Colors.primaryGreen,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: Colors.primaryGreen, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  updateBtnText: { color: '#050505', fontSize: 16, fontWeight: '900' },
});
