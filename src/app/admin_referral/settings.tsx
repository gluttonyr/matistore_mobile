import { Colors } from '@/constants/colors';
import { InfoModal } from '@/components/infomodal';
import type { ReferralAdminOverview, ReferralPrize } from '@/data_api/models/referral.types';
import { referralService } from '@/data_api/services/referralService';
import { getApiErrorMessage } from '@/data_api/lib/logger';
import { resolveFileUrl } from '@/hooks/useFileUrl';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { ArrowLeft, ImagePlus, Lock, Minus, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

type PrizeDraft = { type: 'MONEY' | 'LOT'; amount: string; label: string; imageUrl: string; localUri?: string; uploading?: boolean };
const DURATIONS = [3, 7, 30];
const RANK_COLORS = ['#FFD54A', '#D7DEE4', '#E59A5B'];
const digits = (v: string) => v.replace(/[^0-9]/g, '');
const fmt = (v: string) => digits(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const toDraft = (p?: ReferralPrize): PrizeDraft => ({
  type: p?.type ?? 'MONEY',
  amount: p?.amount ? fmt(String(p.amount)) : '',
  label: p?.label ?? '',
  imageUrl: p?.imageUrl ?? '',
});

function Stepper({ value, onChange, min, max, label }: { value: number; onChange: (n: number) => void; min: number; max: number; label: string }) {
  return (
    <View style={s.stepper}>
      <TouchableOpacity style={s.stepBtn} onPress={() => onChange(Math.max(min, value - 1))} accessibilityLabel={`${label} : moins`}><Minus color={Colors.white} size={16} /></TouchableOpacity>
      <Text style={s.stepValue}>{value}</Text>
      <TouchableOpacity style={s.stepBtn} onPress={() => onChange(Math.min(max, value + 1))} accessibilityLabel={`${label} : plus`}><Plus color={Colors.white} size={16} /></TouchableOpacity>
    </View>
  );
}

export default function AdminReferralSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [overview, setOverview] = useState<ReferralAdminOverview | null>(null);
  const [active, setActive] = useState(false);
  const [duration, setDuration] = useState(7);
  const [customDuration, setCustomDuration] = useState('');
  const [winners, setWinners] = useState(5);
  const [deposits, setDeposits] = useState(3);
  const [minAmount, setMinAmount] = useState('500');
  const [prizes, setPrizes] = useState<PrizeDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    referralService.getAdminOverview().then((o) => {
      setOverview(o);
      const st = o.settings;
      setActive(st.active);
      setDuration(st.durationDays);
      if (!DURATIONS.includes(st.durationDays)) setCustomDuration(String(st.durationDays));
      setWinners(st.winnersCount);
      setDeposits(st.depositsRequired);
      setMinAmount(fmt(String(st.minAmount)));
      setPrizes(Array.from({ length: st.winnersCount }, (_, i) => toDraft(st.prizes.find((p) => p.rank === i + 1))));
    }).catch((error) => Toast.show({ type: 'error', text1: 'Chargement impossible', text2: getApiErrorMessage(error) }));
  }, []);

  useEffect(() => {
    setPrizes((list) => Array.from({ length: winners }, (_, i) => list[i] ?? toDraft()));
  }, [winners]);

  const updatePrize = (index: number, patch: Partial<PrizeDraft>) =>
    setPrizes((list) => list.map((p, i) => (i === index ? { ...p, ...patch } : p)));

  const pickPhoto = async (index: number) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      updatePrize(index, { localUri: asset.uri, uploading: true });
      const filename = await referralService.uploadPrizeImage({
        uri: asset.uri,
        name: asset.fileName || `lot-${index + 1}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      });
      updatePrize(index, { imageUrl: filename, uploading: false });
    } catch (error) {
      updatePrize(index, { uploading: false, localUri: undefined });
      Toast.show({ type: 'error', text1: 'Photo non envoyée', text2: getApiErrorMessage(error) });
    }
  };

  const effectiveDuration = customDuration ? Number(digits(customDuration)) || 0 : duration;

  const payload = () => ({
    active,
    durationDays: effectiveDuration,
    winnersCount: winners,
    depositsRequired: deposits,
    minAmount: Number(digits(minAmount)) || 0,
    prizes: prizes.map((p, i) => (p.type === 'MONEY'
      ? { rank: i + 1, type: 'MONEY' as const, amount: Number(digits(p.amount)) || 0 }
      : { rank: i + 1, type: 'LOT' as const, label: p.label.trim(), imageUrl: p.imageUrl })),
  });

  const problem = (() => {
    if (effectiveDuration < 1 || effectiveDuration > 90) return 'La durée doit être entre 1 et 90 jours.';
    if ((Number(digits(minAmount)) || 0) < 100) return 'Le montant minimum doit être d’au moins 100 FCFA.';
    for (const [i, p] of prizes.entries()) {
      if (p.uploading) return `La photo du lot ${i + 1} est en cours d’envoi.`;
      if (p.type === 'MONEY' && !(Number(digits(p.amount)) > 0)) return `Indiquez le montant du prix ${i + 1}.`;
      if (p.type === 'LOT' && !p.label.trim()) return `Donnez un nom au lot ${i + 1}.`;
      if (p.type === 'LOT' && !p.imageUrl) return `Ajoutez la photo du lot ${i + 1}.`;
    }
    return null;
  })();

  const current = overview?.currentRound;
  const nextStart = current ? new Date(current.endAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '';
  const confirmMessage = (() => {
    if (current && !active) return 'Le tour en cours sera annulé, sans gagnants.';
    if (current) {
      return `Ces réglages s’appliqueront au tour n°${current.number + 1}, qui commence le ${nextStart}. `
        + `Le tour en cours garde ses règles (${current.depositsRequired} dépôts de ${current.minAmount.toLocaleString('fr-FR')} FCFA).`;
    }
    if (active) return 'Le tour commence maintenant et se termine à minuit à la fin de la durée choisie.';
    return 'Les réglages seront gardés pour le prochain tournoi.';
  })();

  const save = async () => {
    setSaving(true);
    try {
      await referralService.updateSettings(payload());
      Toast.show({ type: 'success', text1: 'Réglages enregistrés' });
      router.back();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Réglages refusés', text2: getApiErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Retour">
          <ArrowLeft color={Colors.white} size={20} />
        </TouchableOpacity>
        <Text style={s.title}>Réglages du tournoi</Text>
        <Switch
          value={active}
          onValueChange={setActive}
          trackColor={{ false: '#333', true: Colors.primaryGreen }}
          thumbColor="#050505"
          accessibilityLabel="Tournoi activé"
        />
      </View>
      {!overview ? <ActivityIndicator color={Colors.primaryGreen} style={{ marginTop: 60 }} /> : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 14 }} keyboardShouldPersistTaps="handled">
          {!!current && (
            <View style={s.notice}><Text style={s.noticeText}>Les changements s’appliquent au prochain tour. Le tour n°{current.number} garde ses réglages.</Text></View>
          )}

          <Text style={s.label}>Durée d’un tour</Text>
          <View style={s.chips}>
            {DURATIONS.map((d) => {
              const on = !customDuration && duration === d;
              return (
                <TouchableOpacity key={d} style={[s.chip, on && s.chipOn]} onPress={() => { setCustomDuration(''); setDuration(d); }}>
                  <Text style={[s.chipText, on && s.chipTextOn]}>{d === 7 ? '1 semaine' : d === 30 ? '1 mois' : `${d} jours`}</Text>
                </TouchableOpacity>
              );
            })}
            <View style={[s.chip, !!customDuration && s.chipOn, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }]}>
              <TextInput
                style={[s.chipInput, !!customDuration && { color: Colors.primaryGreen }]}
                value={customDuration}
                onChangeText={(t) => setCustomDuration(digits(t).slice(0, 2))}
                placeholder="Autre"
                placeholderTextColor="#8A8A8A"
                keyboardType="number-pad"
                accessibilityLabel="Autre durée en jours"
              />
              {!!customDuration && <Text style={[s.chipText, s.chipTextOn]}>j</Text>}
            </View>
          </View>
          <Text style={s.hint}>Chaque tour se termine à minuit, puis le suivant démarre tout seul.</Text>

          <View style={s.line}>
            <Text style={s.lineLabel}>Nombre de gagnants</Text>
            <Stepper value={winners} onChange={setWinners} min={1} max={20} label="Gagnants" />
          </View>

          <Text style={s.label}>Prix</Text>
          {prizes.map((p, i) => {
            const preview = p.localUri || resolveFileUrl('referral', p.imageUrl);
            return (
              <View key={i} style={s.prize}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={[s.rank, { color: RANK_COLORS[i] ?? '#BDBDBD' }]}>{i === 0 ? '1er' : `${i + 1}e`}</Text>
                  <View style={s.segment}>
                    {(['MONEY', 'LOT'] as const).map((t) => (
                      <TouchableOpacity key={t} style={[s.segmentItem, p.type === t && s.segmentOn]} onPress={() => updatePrize(i, { type: t })}>
                        <Text style={[s.segmentText, p.type === t && s.segmentTextOn]}>{t === 'MONEY' ? 'Argent' : 'Lot'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {p.type === 'MONEY' ? (
                    <View style={s.amountBox}>
                      <TextInput
                        style={s.amountInput}
                        value={p.amount}
                        onChangeText={(t) => updatePrize(i, { amount: fmt(t) })}
                        placeholder="0"
                        placeholderTextColor="#666"
                        keyboardType="number-pad"
                        accessibilityLabel={`Montant du prix ${i + 1}`}
                      />
                      <Text style={s.currency}>FCFA</Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={s.photo} onPress={() => void pickPhoto(i)} accessibilityRole="button" accessibilityLabel={`Photo du lot ${i + 1}`}>
                      {p.uploading ? <ActivityIndicator color={Colors.primaryGreen} size="small" />
                        : preview ? <Image source={{ uri: preview }} style={s.photoImg} />
                          : <ImagePlus color={Colors.textSecondary} size={18} />}
                    </TouchableOpacity>
                  )}
                </View>
                {p.type === 'LOT' && (
                  <TextInput
                    style={s.lotInput}
                    value={p.label}
                    onChangeText={(t) => updatePrize(i, { label: t })}
                    placeholder="Nom du lot (ex. Smartphone)"
                    placeholderTextColor="#666"
                    maxLength={80}
                    accessibilityLabel={`Nom du lot ${i + 1}`}
                  />
                )}
              </View>
            );
          })}

          <View style={s.secret}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Lock color={Colors.textSecondary} size={15} />
              <Text style={s.secretTitle}>Règles du parrainage · jamais montrées en détail aux clients</Text>
            </View>
            <View style={s.line}>
              <Text style={s.lineLabel}>Dépôts du filleul pendant le tour</Text>
              <Stepper value={deposits} onChange={setDeposits} min={1} max={20} label="Dépôts" />
            </View>
            <View style={s.line}>
              <Text style={s.lineLabel}>Montant minimum par dépôt</Text>
              <View style={[s.amountBox, { width: 130 }]}>
                <TextInput style={s.amountInput} value={minAmount} onChangeText={(t) => setMinAmount(fmt(t))} keyboardType="number-pad" accessibilityLabel="Montant minimum" />
                <Text style={s.currency}>FCFA</Text>
              </View>
            </View>
          </View>

          {!!problem && <Text style={s.problem}>{problem}</Text>}
          <TouchableOpacity style={[s.save, (!!problem || saving) && { opacity: 0.45 }]} disabled={!!problem || saving} onPress={() => setConfirm(true)} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#050505" /> : <Text style={s.saveText}>Enregistrer</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}
      <InfoModal
        visible={confirm}
        onClose={() => setConfirm(false)}
        type={current && !active ? 'warning' : 'info'}
        title="Confirmer les réglages ?"
        message={confirmMessage}
        confirmText="Confirmer"
        onConfirm={() => void save()}
        secondaryText="Annuler"
        onSecondary={() => {}}
      />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darkBg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 6 },
  iconBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: Colors.secondaryBg, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: Colors.white, fontSize: 17, fontWeight: '800' },
  notice: { padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,183,51,0.08)', borderWidth: 1, borderColor: 'rgba(255,183,51,0.3)' },
  noticeText: { color: '#F2D9A6', fontSize: 12, lineHeight: 17 },
  label: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  hint: { color: '#8A8A8A', fontSize: 11, marginTop: -6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minHeight: 42, minWidth: 74, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: Colors.secondaryBg, alignItems: 'center', justifyContent: 'center' },
  chipOn: { borderColor: Colors.primaryGreen, backgroundColor: 'rgba(125,255,42,0.14)' },
  chipText: { color: '#BDBDBD', fontSize: 12, fontWeight: '700' },
  chipTextOn: { color: Colors.primaryGreen, fontWeight: '800' },
  chipInput: { minWidth: 44, color: '#BDBDBD', fontSize: 12, fontWeight: '700', textAlign: 'center', paddingVertical: 0 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 10, borderRadius: 12, backgroundColor: Colors.secondaryBg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  lineLabel: { flex: 1, color: Colors.white, fontSize: 14, fontWeight: '700' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1C1C1C', alignItems: 'center', justifyContent: 'center' },
  stepValue: { width: 26, textAlign: 'center', color: Colors.white, fontSize: 18, fontWeight: '900' },
  prize: { padding: 10, borderRadius: 12, backgroundColor: Colors.secondaryBg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 8 },
  rank: { width: 32, fontSize: 13, fontWeight: '900' },
  segment: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2A2A2A' },
  segmentItem: { paddingHorizontal: 10, paddingVertical: 8 },
  segmentOn: { backgroundColor: Colors.primaryGreen },
  segmentText: { color: '#8A8A8A', fontSize: 12, fontWeight: '600' },
  segmentTextOn: { color: '#050505', fontWeight: '800' },
  amountBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#2A2A2A' },
  amountInput: { flex: 1, color: Colors.white, fontSize: 14, fontWeight: '800', textAlign: 'right', paddingVertical: 0 },
  currency: { color: '#8A8A8A', fontSize: 12, fontWeight: '600' },
  photo: { marginLeft: 'auto', width: 46, height: 46, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#555', backgroundColor: '#1E1E1E', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoImg: { width: '100%', height: '100%' },
  lotInput: { height: 42, borderRadius: 10, backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#2A2A2A', color: Colors.white, paddingHorizontal: 12, fontSize: 14 },
  secret: { gap: 10, padding: 12, borderRadius: 14, backgroundColor: '#0B0B0B', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.18)' },
  secretTitle: { flex: 1, color: '#DADADA', fontSize: 12, fontWeight: '800' },
  problem: { color: '#FFB733', fontSize: 13 },
  save: { height: 52, borderRadius: 14, backgroundColor: Colors.primaryGreen, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#050505', fontSize: 15, fontWeight: '800' },
});
