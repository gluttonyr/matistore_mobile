import { UserAvatar } from '@/components/UserAvatar';
import { Colors } from '@/constants/colors';
import { referralService } from '@/data_api/services/referralService';
import { getApiErrorMessage } from '@/data_api/lib/logger';
import { X } from 'lucide-react-native';
import { Clipboard, Linking, Modal, Platform, Pressable, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';

export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.urbain_diligence.matistore_mobile';

export const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

/** Profile photo, or initials on a dark disc. */
export function PersonAvatar({ name, image, size, ring, ringWidth = 2 }: {
  name: string; image?: string | null; size: number; ring?: string; ringWidth?: number;
}) {
  const fallback = (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#1F1F1F', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#DADADA', fontWeight: '900', fontSize: Math.round(size * 0.34) }}>{initialsOf(name)}</Text>
    </View>
  );
  return (
    <View style={ring ? { borderRadius: size, borderWidth: ringWidth, borderColor: ring, padding: 1 } : undefined}>
      <UserAvatar image={image} size={size} fallback={fallback} />
    </View>
  );
}

export const inviteMessage = (code: string) =>
  `Rejoins-moi sur Matistore pour tes dépôts et retraits 1xBet instantanés ! `
  + `Saisis mon code de parrainage ${code} à l'inscription. Télécharge l'appli : ${PLAY_STORE_URL}`;

export async function copyReferralCode(code: string) {
  Clipboard.setString(code);
  Toast.show({ type: 'success', text1: 'Code copié', text2: code });
}

/** WhatsApp when installed, else the system share sheet. */
export async function shareReferralCode(code: string) {
  const message = inviteMessage(code);
  const whatsapp = `whatsapp://send?text=${encodeURIComponent(message)}`;
  try {
    if (Platform.OS !== 'web' && await Linking.canOpenURL(whatsapp)) {
      await Linking.openURL(whatsapp);
      return;
    }
    if (Platform.OS === 'web') {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
      return;
    }
    await Share.share({ message });
  } catch {
    await copyReferralCode(code);
  }
}

/** Gets the code (after a first deposit) and returns it, or explains why not. */
export async function obtainReferralCode(): Promise<string | null> {
  try {
    const { code } = await referralService.createCode();
    Toast.show({ type: 'success', text1: 'Votre code est prêt', text2: code });
    return code;
  } catch (error) {
    Toast.show({ type: 'info', text1: 'Code indisponible', text2: getApiErrorMessage(error) });
    return null;
  }
}

export function formatCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return [
    { v: pad(Math.floor(s / 86400)), l: 'j' },
    { v: pad(Math.floor((s % 86400) / 3600)), l: 'h' },
    { v: pad(Math.floor((s % 3600) / 60)), l: 'm' },
    { v: pad(s % 60), l: 's' },
  ];
}

export const ordinal = (rank: number) => (rank === 1 ? '1er' : `${rank}e`);

/** Bottom sheet "Comment ça marche ?" — only what clients need, never the anti-fraud rules. */
export function ReferralHelpSheet({ visible, onClose, depositsRequired, minAmount, winnersCount }: {
  visible: boolean; onClose: () => void; depositsRequired: number; minAmount: number; winnersCount: number;
}) {
  const steps = [
    { title: 'Obtiens ton code', text: 'Ton code de parrainage est disponible après ton premier dépôt.' },
    { title: 'Partage-le à tes amis', text: 'Ils saisissent ton code à leur inscription ou dans leur profil.' },
    {
      title: 'Ton ami fait ses dépôts',
      text: `Dès qu’il a fait ${depositsRequired} dépôt${depositsRequired > 1 ? 's' : ''} d’au moins ${minAmount.toLocaleString('fr-FR')} FCFA pendant le tour, tu gagnes un parrainage validé.`,
    },
    {
      title: `Les ${winnersCount} premiers gagnent`,
      text: `À la fin du tour, les ${winnersCount} parrains avec le plus de parrainages validés remportent les prix.`,
    },
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={help.backdrop} onPress={onClose} accessibilityLabel="Fermer l’aide" />
      <View style={help.sheet}>
        <View style={help.handle} />
        <View style={help.header}>
          <Text style={help.title}>Comment ça marche ?</Text>
          <TouchableOpacity style={help.close} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer">
            <X color={Colors.white} size={16} />
          </TouchableOpacity>
        </View>
        {steps.map((step, i) => (
          <View key={step.title} style={help.step}>
            <View style={help.num}><Text style={help.numText}>{i + 1}</Text></View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={help.stepTitle}>{step.title}</Text>
              <Text style={help.stepText}>{step.text}</Text>
            </View>
          </View>
        ))}
        <View style={help.note}>
          <Text style={help.noteText}>Chaque tour se termine à minuit. Au tour suivant, tout le monde repart à zéro.</Text>
        </View>
        <TouchableOpacity style={help.cta} onPress={onClose} activeOpacity={0.85}>
          <Text style={help.ctaText}>J’ai compris</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const help = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 28, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: '#0F0F0F', borderTopWidth: 1, borderColor: 'rgba(125,255,42,0.35)', gap: 14 },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#333' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: Colors.white, fontSize: 22, fontWeight: '900' },
  close: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#1C1C1C', alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row', gap: 12 },
  num: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(125,255,42,0.14)', alignItems: 'center', justifyContent: 'center' },
  numText: { color: Colors.primaryGreen, fontWeight: '900', fontSize: 14 },
  stepTitle: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  stepText: { color: '#BDBDBD', fontSize: 13, lineHeight: 19 },
  note: { padding: 12, borderRadius: 14, backgroundColor: 'rgba(125,255,42,0.08)', borderWidth: 1, borderColor: 'rgba(125,255,42,0.25)' },
  noteText: { color: '#DADADA', fontSize: 13, lineHeight: 19 },
  cta: { height: 52, borderRadius: 14, backgroundColor: Colors.primaryGreen, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#050505', fontSize: 15, fontWeight: '900' },
});
