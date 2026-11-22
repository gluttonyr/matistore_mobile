import { shareCoupon } from '@/components/coupons/CouponTicket';
import { Colors } from '@/constants/colors';
import type { Bookmaker } from '@/data_api/models/bookmaker.types';
import { bookmakerService } from '@/data_api/services/bookmakerService';
import { couponService } from '@/data_api/services/couponService';
import { getApiErrorMessage } from '@/data_api/lib/logger';
import { resolveFileUrl } from '@/hooks/useFileUrl';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { ArrowLeft, Bell, ImagePlus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

export default function NewCouponScreen() {
  const insets = useSafeAreaInsets();
  const [bookmakers, setBookmakers] = useState<Bookmaker[]>([]);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [odds, setOdds] = useState('');
  const [note, setNote] = useState('');
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState<'publish' | 'share' | null>(null);

  useEffect(() => {
    bookmakerService.getAll().then(setBookmakers).catch(() => setBookmakers([]));
  }, []);

  const pick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      setLocalUri(asset.uri);
      setImageUrl(null);
      setUploading(true);
      setImageUrl(await couponService.uploadImage({ uri: asset.uri, name: asset.fileName || 'coupon.jpg', type: asset.mimeType || 'image/jpeg' }));
    } catch (error) {
      setLocalUri(null);
      Toast.show({ type: 'error', text1: 'Capture non envoyée', text2: getApiErrorMessage(error) });
    } finally {
      setUploading(false);
    }
  };

  const filled = Object.entries(codes).filter(([, code]) => code.trim()).map(([bookmaker, code]) => ({ bookmaker, code: code.trim() }));
  const problem = !imageUrl ? (uploading ? 'Envoi de la capture…' : 'Ajoutez la capture du coupon.') : !filled.length ? 'Indiquez au moins un code.' : null;

  const publish = async (andShare: boolean) => {
    if (problem || !imageUrl) return;
    setSaving(andShare ? 'share' : 'publish');
    try {
      const { coupon, notified } = await couponService.create({
        imageUrl, codes: filled, odds: odds.trim() || undefined, note: note.trim() || undefined, notify,
      });
      Toast.show({
        type: 'success',
        text1: `Coupon n°${coupon.number} publié`,
        text2: notified ? `${notified.storedCount} client(s) prévenu(s)` : 'Sans notification',
      });
      if (andShare) await shareCoupon(coupon);
      router.back();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Coupon refusé', text2: getApiErrorMessage(error) });
    } finally {
      setSaving(null);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Retour">
          <ArrowLeft color={Colors.white} size={20} />
        </TouchableOpacity>
        <Text style={s.title}>Publier un coupon</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 14 }} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={s.picker} onPress={() => void pick()} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Ajouter la capture du coupon">
          {localUri ? (
            <>
              <Image source={{ uri: localUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              {uploading && <View style={s.uploading}><ActivityIndicator color={Colors.primaryGreen} /></View>}
              <View style={s.change}><Text style={s.changeText}>Changer</Text></View>
            </>
          ) : (
            <>
              <View style={s.pickerIcon}><ImagePlus color={Colors.primaryGreen} size={26} /></View>
              <Text style={s.pickerTitle}>Ajouter la capture du coupon</Text>
              <Text style={s.pickerSub}>Elle s’affichera en grand chez les clients</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={s.label}>Codes du coupon (au moins un)</Text>
        {bookmakers.map((b) => {
          const logo = resolveFileUrl('bookmakers', b.imageUrl);
          return (
            <View key={b.code} style={s.codeRow}>
              {logo ? <Image source={{ uri: logo }} style={s.logo} /> : <View style={[s.logo, s.logoFallback]}><Text style={s.logoText}>{b.nom}</Text></View>}
              <TextInput
                style={s.codeInput}
                value={codes[b.code] ?? ''}
                onChangeText={(t) => setCodes((c) => ({ ...c, [b.code]: t.toUpperCase().replace(/\s+/g, '') }))}
                placeholder={`Code ${b.nom} (facultatif)`}
                placeholderTextColor="#666"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={30}
                accessibilityLabel={`Code ${b.nom}`}
              />
            </View>
          );
        })}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={s.label}>Cote (facultatif)</Text>
            <TextInput style={s.input} value={odds} onChangeText={setOdds} placeholder="7,04" placeholderTextColor="#666" keyboardType="decimal-pad" maxLength={12} />
          </View>
          <View style={{ flex: 1.4, gap: 6 }}>
            <Text style={s.label}>Petite note (facultatif)</Text>
            <TextInput style={s.input} value={note} onChangeText={setNote} placeholder="Combiné 6 matchs" placeholderTextColor="#666" maxLength={120} />
          </View>
        </View>

        <View style={s.notify}>
          <Bell color="#A78BFA" size={20} />
          <View style={{ flex: 1 }}>
            <Text style={s.notifyTitle}>Prévenir tous les clients</Text>
            <Text style={s.notifySub}>Notification « Nouveau coupon du jour »</Text>
          </View>
          <Switch value={notify} onValueChange={setNotify} trackColor={{ false: '#333', true: Colors.primaryGreen }} thumbColor="#050505" accessibilityLabel="Prévenir tous les clients" />
        </View>

        {!!problem && <Text style={s.problem}>{problem}</Text>}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={[s.secondary, (!!problem || !!saving) && { opacity: 0.45 }]} disabled={!!problem || !!saving} onPress={() => void publish(true)} activeOpacity={0.85}>
            {saving === 'share' ? <ActivityIndicator color={Colors.white} /> : <Text style={s.secondaryText}>Publier et partager</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[s.primary, (!!problem || !!saving) && { opacity: 0.45 }]} disabled={!!problem || !!saving} onPress={() => void publish(false)} activeOpacity={0.85}>
            {saving === 'publish' ? <ActivityIndicator color="#050505" /> : <Text style={s.primaryText}>Publier le coupon</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darkBg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 6 },
  iconBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: Colors.secondaryBg, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  picker: { height: 220, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(125,255,42,0.45)', backgroundColor: 'rgba(125,255,42,0.05)', alignItems: 'center', justifyContent: 'center', gap: 10, overflow: 'hidden' },
  pickerIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(125,255,42,0.14)', alignItems: 'center', justifyContent: 'center' },
  pickerTitle: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  pickerSub: { color: Colors.textSecondary, fontSize: 12 },
  uploading: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  change: { position: 'absolute', right: 10, bottom: 10, height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center' },
  changeText: { color: Colors.white, fontSize: 12, fontWeight: '800' },
  label: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 12, backgroundColor: Colors.secondaryBg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  logo: { width: 76, height: 38, borderRadius: 8 },
  logoFallback: { backgroundColor: '#1C1C1C', alignItems: 'center', justifyContent: 'center' },
  logoText: { color: Colors.white, fontSize: 10, fontWeight: '900' },
  codeInput: { flex: 1, height: 42, borderRadius: 10, borderWidth: 1, borderColor: '#2A2A2A', backgroundColor: '#0A0A0A', color: Colors.white, fontSize: 16, fontWeight: '900', letterSpacing: 2, paddingHorizontal: 12 },
  input: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: Colors.secondaryBg, color: Colors.white, fontSize: 14, fontWeight: '700', paddingHorizontal: 12 },
  notify: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: Colors.secondaryBg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  notifyTitle: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  notifySub: { color: Colors.textSecondary, fontSize: 11 },
  problem: { color: '#FFB733', fontSize: 13 },
  secondary: { height: 54, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: Colors.white, fontSize: 14, fontWeight: '800' },
  primary: { flex: 1, height: 54, borderRadius: 14, backgroundColor: Colors.primaryGreen, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#050505', fontSize: 15, fontWeight: '900' },
});
