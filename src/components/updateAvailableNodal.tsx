// components/UpdateAvailableModal.tsx
import { Colors } from '@/constants/colors';
import { Rocket, X } from 'lucide-react-native';
import { Linking, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ⚠️ À adapter avec vos identifiants réels
const ANDROID_PACKAGE_NAME = 'com.matistore.app';
const IOS_APP_ID = '0000000000'; // ID numérique App Store (pas le bundle id)

function openStore() {
  if (Platform.OS === 'android') {
    Linking.openURL("market://details?id=com.urbain_diligence.matistore_mobile").catch(() =>
      Linking.openURL("https://play.google.com/store/apps/details?id=com.urbain_diligence.matistore_mobile")
    );
  } else {
    Linking.openURL(`itms-apps://itunes.apple.com/app/id${IOS_APP_ID}`).catch(() =>
      Linking.openURL(`https://apps.apple.com/app/id${IOS_APP_ID}`)
    );
  }
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onRemindLater: () => void;
};

export function UpdateAvailableModal({ visible, onClose, onRemindLater }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.overlay}>
        <View style={st.card}>
          <TouchableOpacity style={st.closeBtn} onPress={onClose} hitSlop={10}>
            <X color={Colors.textSecondary} size={18} />
          </TouchableOpacity>

          <View style={st.iconWrap}>
            <Rocket color={Colors.primaryGreen} size={28} />
          </View>

          <Text style={st.title}>Nouvelle version disponible</Text>
          <Text style={st.subtitle}>
            Une nouvelle version de l'application est disponible, avec des améliorations et
            corrections. Mettez à jour pour profiter de la meilleure expérience.
          </Text>

          <TouchableOpacity style={st.updateBtn} activeOpacity={0.85} onPress={openStore}>
            <Text style={st.updateBtnText}>Mettre à jour</Text>
          </TouchableOpacity>

          <TouchableOpacity style={st.laterBtn} activeOpacity={0.7} onPress={onRemindLater}>
            <Text style={st.laterBtnText}>Me rappeler plus tard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
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
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBg,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(125,255,42,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(125,255,42,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { color: Colors.white, fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 20 },
  updateBtn: {
    width: '100%',
    backgroundColor: Colors.primaryGreen,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
  },
  updateBtnText: { color: '#000', fontSize: 14, fontWeight: '800' },
  laterBtn: { paddingVertical: 6 },
  laterBtnText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
});