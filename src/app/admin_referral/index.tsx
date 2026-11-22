import { Colors } from '@/constants/colors';
import { InfoModal } from '@/components/infomodal';
import { PersonAvatar, formatCountdown } from '@/components/referral/referralUi';
import type { ReferralAdminOverview, ReferralAdminRound, ReferralAdminWinner, ReferralStats } from '@/data_api/models/referral.types';
import { referralService } from '@/data_api/services/referralService';
import { getApiErrorMessage } from '@/data_api/lib/logger';
import { router, useFocusEffect } from 'expo-router';
import { ArrowLeft, BarChart3, Check, ChevronDown, ChevronUp, Eye, MessageCircle, Settings } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

const MEDAL = ['#FFD54A', '#D7DEE4', '#E59A5B'];
const dateRange = (start: string, end: string) => {
  const f = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return `Du ${f(new Date(start))} au ${f(new Date(new Date(end).getTime() - 1000))}`;
};

function WinnerRow({ w, onToggle, busy }: { w: ReferralAdminWinner; onToggle: () => void; busy: boolean }) {
  const openChat = () => {
    if (!w.discussionId) {
      Toast.show({ type: 'info', text1: 'Discussion introuvable', text2: 'Ce client n’a pas encore de discussion de dépôt.' });
      return;
    }
    router.push({ pathname: '/admin_chats/[id]', params: { id: w.discussionId, name: w.name, category: 'depot' } } as any);
  };
  return (
    <View style={s.winner}>
      <TouchableOpacity onPress={openChat} accessibilityRole="button" accessibilityLabel={`Ouvrir la discussion de ${w.name}`}>
        <PersonAvatar name={w.name} image={w.image} size={38} ring={MEDAL[w.rank - 1] ?? '#333'} />
        <View style={s.chatBadge}><MessageCircle color="#050505" size={10} strokeWidth={3} /></View>
      </TouchableOpacity>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.winnerName} numberOfLines={1}>{w.rank}. {w.name}</Text>
        <Text style={s.winnerSub} numberOfLines={1}>{w.prize?.labelText ?? '—'} · {w.validated} validés</Text>
      </View>
      {w.rewarded ? (
        <TouchableOpacity style={s.rewarded} onPress={onToggle} disabled={busy} accessibilityRole="button" accessibilityLabel="Annuler « récompensé »">
          <Check color={Colors.primaryGreen} size={12} strokeWidth={3} />
          <Text style={s.rewardedText}>Récompensé</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={s.markBtn} onPress={onToggle} disabled={busy} activeOpacity={0.85}>
          {busy ? <ActivityIndicator color="#050505" size="small" /> : <Text style={s.markBtnText}>Marquer récompensé</Text>}
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function AdminReferralScreen() {
  const insets = useSafeAreaInsets();
  const [overview, setOverview] = useState<ReferralAdminOverview | null>(null);
  const [rounds, setRounds] = useState<ReferralAdminRound[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);
  const [confirmReward, setConfirmReward] = useState<ReferralAdminWinner | null>(null);

  const load = useCallback(async () => {
    try {
      const [o, r, st] = await Promise.all([referralService.getAdminOverview(), referralService.getRounds(), referralService.getStats()]);
      setOverview(o);
      setRounds(r);
      setStats(st);
      setOpen((current) => current ?? r.find((x) => x.status === 'FINISHED' && x.rewardedCount < x.winners.length)?.id ?? null);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Chargement impossible', text2: getApiErrorMessage(error) });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const toggleReward = async (w: ReferralAdminWinner) => {
    setBusyId(w.id);
    try {
      await referralService.setRewarded(w.id, !w.rewarded);
      if (!w.rewarded) Toast.show({ type: 'success', text1: 'Gagnant récompensé', text2: `${w.name} a été prévenu.` });
      await load();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Erreur', text2: getApiErrorMessage(error) });
    } finally {
      setBusyId(null);
    }
  };

  const turnOff = async () => {
    try {
      await referralService.updateSettings({ active: false });
      Toast.show({ type: 'success', text1: 'Tournoi désactivé', text2: 'Le tour en cours a été annulé.' });
      await load();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Erreur', text2: getApiErrorMessage(error) });
    }
  };

  const current = overview?.currentRound;
  const finished = rounds.filter((r) => r.status !== 'ACTIVE');
  const toReward = finished.reduce((n, r) => n + r.winners.filter((w) => !w.rewarded).length, 0);
  const clock = current ? formatCountdown(new Date(current.endAt).getTime() - Date.now()) : null;

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Retour">
          <ArrowLeft color={Colors.white} size={20} />
        </TouchableOpacity>
        <Text style={s.title}>Tournoi de parrainage</Text>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/admin_referral/stats' as any)} accessibilityRole="button" accessibilityLabel="Statistiques">
          <BarChart3 color={Colors.white} size={19} />
        </TouchableOpacity>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/admin_referral/settings' as any)} accessibilityRole="button" accessibilityLabel="Réglages">
          <Settings color={Colors.white} size={19} />
        </TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator color={Colors.primaryGreen} style={{ marginTop: 60 }} /> : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 14 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={Colors.primaryGreen} />}
        >
          {current ? (
            <View style={s.current}>
              <View style={s.rowBetween}>
                <Text style={s.cardTitle}>Tour n°{current.number}</Text>
                <View style={s.activeBadge}><Text style={s.activeBadgeText}>Actif</Text></View>
              </View>
              <Text style={s.muted}>{dateRange(current.startAt, current.endAt)} · se termine dans {clock![0].v} j {clock![1].v} h</Text>
              <View style={s.kpis}>
                <View style={s.kpi}><Text style={s.kpiValue}>{stats?.participants ?? 0}</Text><Text style={s.kpiLabel}>parrains</Text></View>
                <View style={s.kpi}><Text style={[s.kpiValue, { color: Colors.primaryGreen }]}>{stats?.validated ?? 0}</Text><Text style={s.kpiLabel}>validés</Text></View>
                <View style={s.kpi}><Text style={s.kpiValue}>{current.winnersCount}</Text><Text style={s.kpiLabel}>gagnants</Text></View>
              </View>
              <Text style={s.muted}>Règle de ce tour : {current.depositsRequired} dépôts de {current.minAmount.toLocaleString('fr-FR')} FCFA minimum</Text>
              <TouchableOpacity style={s.viewBtn} onPress={() => router.push('/referral' as any)} activeOpacity={0.85}>
                <Eye color="#050505" size={17} />
                <Text style={s.onText}>Voir le tournoi comme les clients</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.offBtn} onPress={() => setConfirmOff(true)} activeOpacity={0.8}>
                <Text style={s.offText}>Désactiver le tournoi (annule ce tour)</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.current}>
              <Text style={s.cardTitle}>{overview?.settings.active ? 'Le prochain tour démarre dans un instant' : 'Tournoi désactivé'}</Text>
              <Text style={s.muted}>Réglez la durée, les gagnants et les prix, puis activez le tournoi. Le premier tour commence aussitôt.</Text>
              <TouchableOpacity style={s.onBtn} onPress={() => router.push('/admin_referral/settings' as any)} activeOpacity={0.85}>
                <Text style={s.onText}>Régler et activer</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={s.rowBetween}>
            <Text style={s.section}>Tours terminés</Text>
            {toReward > 0 && <Text style={s.toReward}>{toReward} à récompenser</Text>}
          </View>
          {finished.length === 0 && <Text style={s.muted}>Aucun tour terminé pour le moment.</Text>}
          {finished.map((round) => {
            const expanded = open === round.id;
            const cancelled = round.status === 'CANCELLED';
            const complete = round.rewardedCount === round.winners.length;
            return (
              <View key={round.id} style={s.round}>
                <TouchableOpacity style={s.rowBetween} onPress={() => setOpen(expanded ? null : round.id)} disabled={cancelled} activeOpacity={0.8}>
                  <View>
                    <Text style={s.roundTitle}>Tour n°{round.number}</Text>
                    <Text style={s.muted}>{dateRange(round.startAt, round.endAt)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[s.roundStatus, { color: cancelled ? '#8A8A8A' : complete ? Colors.primaryGreen : '#FFB733' }]}>
                      {cancelled ? 'Annulé' : round.winners.length === 0 ? 'Aucun gagnant' : `${round.rewardedCount} / ${round.winners.length} récompensés`}
                    </Text>
                    {!cancelled && (expanded ? <ChevronUp color={Colors.textSecondary} size={16} /> : <ChevronDown color={Colors.textSecondary} size={16} />)}
                  </View>
                </TouchableOpacity>
                {expanded && round.winners.map((w) => (
                  <WinnerRow key={w.id} w={w} busy={busyId === w.id} onToggle={() => (w.rewarded ? void toggleReward(w) : setConfirmReward(w))} />
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}
      <InfoModal
        visible={confirmOff}
        onClose={() => setConfirmOff(false)}
        type="warning"
        title="Désactiver le tournoi ?"
        message="Le tour en cours sera annulé, sans gagnants. Vous pourrez relancer un nouveau tournoi quand vous voulez."
        confirmText="Oui, désactiver"
        onConfirm={() => void turnOff()}
        secondaryText="Annuler"
        onSecondary={() => {}}
      />
      <InfoModal
        visible={!!confirmReward}
        onClose={() => setConfirmReward(null)}
        type="info"
        title="Récompense remise ?"
        message={confirmReward ? `Confirmez que ${confirmReward.name} a reçu ${confirmReward.prize?.labelText ?? 'son prix'}. Il sera prévenu dans sa discussion.` : ''}
        confirmText="Oui, c’est remis"
        onConfirm={() => { if (confirmReward) void toggleReward(confirmReward); }}
        secondaryText="Annuler"
        onSecondary={() => {}}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darkBg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 6 },
  iconBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: Colors.secondaryBg, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: Colors.white, fontSize: 17, fontWeight: '800' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  current: { padding: 16, borderRadius: 18, backgroundColor: Colors.secondaryBg, borderWidth: 1, borderColor: 'rgba(125,255,42,0.35)', gap: 12 },
  cardTitle: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  activeBadge: { height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: 'rgba(125,255,42,0.14)', justifyContent: 'center' },
  activeBadgeText: { color: Colors.primaryGreen, fontSize: 11, fontWeight: '800' },
  muted: { color: Colors.textSecondary, fontSize: 12, lineHeight: 17 },
  kpis: { flexDirection: 'row', gap: 8 },
  kpi: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: '#0A0A0A' },
  kpiValue: { color: Colors.white, fontSize: 18, fontWeight: '900' },
  kpiLabel: { color: Colors.textSecondary, fontSize: 11 },
  viewBtn: { height: 46, borderRadius: 12, backgroundColor: Colors.primaryGreen, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  offBtn: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,68,68,0.45)', alignItems: 'center', justifyContent: 'center' },
  offText: { color: '#FF6B6B', fontSize: 14, fontWeight: '700' },
  onBtn: { height: 48, borderRadius: 12, backgroundColor: Colors.primaryGreen, alignItems: 'center', justifyContent: 'center' },
  onText: { color: '#050505', fontSize: 15, fontWeight: '800' },
  section: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  toReward: { color: '#FFB733', fontSize: 12, fontWeight: '700' },
  round: { padding: 14, borderRadius: 16, backgroundColor: '#0E0E0E', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 12 },
  roundTitle: { color: Colors.white, fontSize: 14, fontWeight: '800' },
  roundStatus: { fontSize: 12, fontWeight: '800' },
  winner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chatBadge: { position: 'absolute', right: -4, bottom: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.primaryGreen, alignItems: 'center', justifyContent: 'center' },
  winnerName: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  winnerSub: { color: Colors.textSecondary, fontSize: 11 },
  rewarded: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 10, borderRadius: 16, backgroundColor: 'rgba(125,255,42,0.14)' },
  rewardedText: { color: Colors.primaryGreen, fontSize: 11, fontWeight: '800' },
  markBtn: { minHeight: 34, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#FFB733', alignItems: 'center', justifyContent: 'center' },
  markBtnText: { color: '#050505', fontSize: 11, fontWeight: '800' },
});
