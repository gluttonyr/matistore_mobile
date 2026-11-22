import { Colors } from '@/constants/colors';
import { referralService } from '@/data_api/services/referralService';
import { getApiErrorMessage } from '@/data_api/lib/logger';
import { Check, UserPlus } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { PersonAvatar } from './referralUi';

/**
 * "Un ami vous a invité ?" — shown once after login (mode "first"), or from the profile to choose / change the parrain.
 * Changing parrain is allowed at any time; the client is never told what it costs the old parrain.
 */
export function ReferralCodePrompt({ visible, mode, currentParrain, onDone }: {
  visible: boolean;
  mode: 'first' | 'change';
  currentParrain?: string | null;
  onDone: (changed: boolean) => void;
}) {
  const [code, setCode] = useState('');
  const [found, setFound] = useState<{ code: string; name: string; image?: string | null } | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setCode(''); setFound(null); setLookupError(null);
    slide.setValue(0);
    Animated.timing(slide, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [slide, visible]);

  // Shows the parrain's name before the client confirms.
  useEffect(() => {
    const value = code.trim();
    setFound(null); setLookupError(null);
    if (value.replace(/^MATI-?/i, '').length < 4) return;
    setChecking(true);
    const t = setTimeout(() => {
      referralService.lookup(value)
        .then(setFound)
        .catch((error) => setLookupError(getApiErrorMessage(error)))
        .finally(() => setChecking(false));
    }, 450);
    return () => { clearTimeout(t); setChecking(false); };
  }, [code]);

  const skip = async () => {
    if (mode === 'first') {
      try { await referralService.markPromptSeen(); } catch { /* shown again next time */ }
    }
    onDone(false);
  };

  const confirm = async () => {
    if (!found) return;
    setSaving(true);
    try {
      const result = await referralService.setParrain(found.code);
      Toast.show({ type: 'success', text1: 'Parrain enregistré', text2: result.parrain.name });
      onDone(true);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Code refusé', text2: getApiErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => void skip()}>
      <Pressable style={s.backdrop} onPress={() => void skip()} accessibilityLabel="Fermer" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.wrap} pointerEvents="box-none">
        <Animated.View style={[s.sheet, { transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }], opacity: slide }]}>
          <View style={s.handle} />
          <View style={s.icon}><UserPlus color={Colors.primaryGreen} size={40} strokeWidth={1.8} /></View>
          <Text style={s.title}>{mode === 'first' ? 'Un ami vous a invité ?' : currentParrain ? 'Changer de parrain' : 'Choisir mon parrain'}</Text>
          <Text style={s.text}>
            {mode === 'change' && currentParrain
              ? `Votre parrain actuel : ${currentParrain}. Saisissez le code de votre nouveau parrain.`
              : 'Saisissez son code de parrainage pour l’aider à gagner le tournoi.'}
          </Text>
          <Text style={s.label}>Code de parrainage</Text>
          <TextInput
            style={[s.input, !!found && { borderColor: Colors.primaryGreen }]}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="MATI-XXXX"
            placeholderTextColor="#666"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
            accessibilityLabel="Code de parrainage"
          />
          {checking && <ActivityIndicator color={Colors.primaryGreen} />}
          {!!found && (
            <View style={s.found}>
              <PersonAvatar name={found.name} image={found.image} size={36} />
              <Text style={s.foundText}>Parrain : <Text style={{ fontWeight: '800' }}>{found.name}</Text></Text>
              <Check color={Colors.primaryGreen} size={18} strokeWidth={2.8} />
            </View>
          )}
          {!!lookupError && <Text style={s.error}>{lookupError}</Text>}
          <TouchableOpacity style={[s.cta, (!found || saving) && { opacity: 0.45 }]} onPress={() => void confirm()} disabled={!found || saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#050505" /> : <Text style={s.ctaText}>Valider</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={s.skip} onPress={() => void skip()}>
            <Text style={s.skipText}>{mode === 'first' ? 'Je n’ai pas de code' : 'Annuler'}</Text>
          </TouchableOpacity>
          {mode === 'first' && <Text style={s.hint}>Vous pourrez choisir ou changer de parrain plus tard dans votre profil.</Text>}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.62)' },
  wrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 28, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: '#0F0F0F', borderTopWidth: 1, borderColor: 'rgba(125,255,42,0.35)', gap: 12 },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#333' },
  icon: { alignSelf: 'center', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(125,255,42,0.12)', alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.white, fontSize: 23, fontWeight: '900', textAlign: 'center' },
  text: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  label: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 4 },
  input: { height: 56, borderRadius: 14, borderWidth: 1.5, borderColor: '#333', backgroundColor: '#111', color: Colors.white, fontSize: 20, fontWeight: '800', letterSpacing: 3, paddingHorizontal: 16 },
  found: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: 'rgba(125,255,42,0.08)' },
  foundAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.primaryGreen, alignItems: 'center', justifyContent: 'center' },
  foundInitials: { color: '#050505', fontSize: 11, fontWeight: '900' },
  foundText: { flex: 1, color: Colors.white, fontSize: 13 },
  error: { color: '#FF6B6B', fontSize: 13 },
  cta: { height: 54, borderRadius: 14, backgroundColor: Colors.primaryGreen, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  ctaText: { color: '#050505', fontSize: 16, fontWeight: '800' },
  skip: { height: 44, alignItems: 'center', justifyContent: 'center' },
  skipText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  hint: { color: '#8A8A8A', fontSize: 11, textAlign: 'center' },
});
