import { Colors } from '@/constants/colors';
import type { ReferralMe } from '@/data_api/models/referral.types';
import { referralService } from '@/data_api/services/referralService';
import { ReferralCodePrompt } from '@/components/referral/ReferralCodePrompt';
import { PersonAvatar, copyReferralCode, obtainReferralCode, shareReferralCode } from '@/components/referral/referralUi';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { ArrowLeft, ChevronRight, Copy, Share2, UserCog } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MyReferralsScreen() {
  const insets = useSafeAreaInsets();
  const [me, setMe] = useState<ReferralMe | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [roundNumber, setRoundNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [changing, setChanging] = useState(false);

  const load = useCallback(async () => {
    try {
      const [profile, tournament] = await Promise.all([referralService.getMe(), referralService.getTournament().catch(() => null)]);
      setMe(profile);
      setRank(tournament?.round?.me.rank ?? null);
      setRoundNumber(tournament?.round?.number ?? null);
    } catch { /* keep the last data */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const getCode = async () => {
    if (await obtainReferralCode()) void load();
  };

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Retour">
          <ArrowLeft color={Colors.white} size={20} />
        </TouchableOpacity>
        <Text style={s.title}>Mes parrainages</Text>
      </View>
      {loading && !me ? <ActivityIndicator color={Colors.primaryGreen} style={{ marginTop: 60 }} /> : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 14 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={Colors.primaryGreen} />}
        >
          <LinearGradient colors={['#1A3A0A', '#0B0B0B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.codeCard}>
            <Text style={s.codeLabel}>Mon code de parrainage</Text>
            {me?.code ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={s.code} selectable>{me.code}</Text>
                  <TouchableOpacity style={s.copyBtn} onPress={() => void copyReferralCode(me.code!)} accessibilityRole="button" accessibilityLabel="Copier le code">
                    <Copy color={Colors.primaryGreen} size={19} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={s.shareBtn} onPress={() => void shareReferralCode(me.code!)} activeOpacity={0.85}>
                  <Share2 color="#050505" size={18} />
                  <Text style={s.shareText}>Partager sur WhatsApp</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={s.noCode}>
                  {me?.canGetCode ? 'Votre code est prêt à être créé.' : 'Faites un premier dépôt pour obtenir votre code de parrainage.'}
                </Text>
                {me?.canGetCode && (
                  <TouchableOpacity style={s.shareBtn} onPress={() => void getCode()} activeOpacity={0.85}>
                    <Text style={s.shareText}>Obtenir mon code de parrainage</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </LinearGradient>

          <View style={s.stats}>
            <View style={s.stat}><Text style={[s.statValue, { color: Colors.primaryGreen }]}>{me?.validatedThisRound ?? 0}</Text><Text style={s.statLabel}>Parrainages validés ce tour</Text></View>
            <View style={s.stat}><Text style={s.statValue}>{me?.totalFilleuls ?? 0}</Text><Text style={s.statLabel}>Filleuls au total</Text></View>
            <View style={s.stat}>
              <Text style={s.statValue}>{rank ? `${rank}${rank === 1 ? 'er' : 'e'}` : '—'}</Text>
              <Text style={s.statLabel}>Ma place au tournoi</Text>
            </View>
          </View>

          <TouchableOpacity style={s.rowBtn} onPress={() => setChanging(true)} activeOpacity={0.8}>
            <View style={s.rowBtnIcon}><UserCog color={Colors.primaryGreen} size={19} /></View>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text style={s.rowBtnTitle}>{me?.parrain ? 'Mon parrain' : 'Choisir mon parrain'}</Text>
              {!!me?.parrain && <Text style={s.rowBtnSub}>{me.parrain.name} · changer</Text>}
            </View>
            <ChevronRight color={Colors.textSecondary} size={18} />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
            <Text style={s.section}>Mes filleuls</Text>
            {!!roundNumber && <Text style={s.sectionSub}>Tour n°{roundNumber}</Text>}
          </View>
          {(me?.filleuls ?? []).length === 0 && (
            <Text style={s.empty}>Vous n’avez pas encore de filleul. Partagez votre code à vos amis !</Text>
          )}
          {(me?.filleuls ?? []).map((f) => (
            <View key={f.trackingId} style={s.friend}>
              <PersonAvatar name={f.name} image={f.image} size={34} />
              <View style={{ flex: 1 }}>
                <Text style={s.friendName} numberOfLines={1}>{f.name}</Text>
                {!!f.since && <Text style={s.friendDate}>Depuis le {new Date(f.since).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</Text>}
              </View>
              <View style={[s.badge, f.validated ? s.badgeOk : null]}>
                <Text style={[s.badgeText, f.validated && { color: Colors.primaryGreen }]}>{f.validated ? 'Validé' : 'En cours'}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      <ReferralCodePrompt
        visible={changing}
        mode="change"
        currentParrain={me?.parrain?.name}
        onDone={(changed) => { setChanging(false); if (changed) void load(); }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darkBg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 6 },
  iconBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: Colors.secondaryBg, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  codeCard: { padding: 18, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(125,255,42,0.35)', gap: 12 },
  codeLabel: { color: '#B4FF7F', fontSize: 12, fontWeight: '600' },
  code: { color: Colors.white, fontSize: 30, fontWeight: '900', letterSpacing: 3 },
  copyBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(125,255,42,0.15)', alignItems: 'center', justifyContent: 'center' },
  shareBtn: { height: 48, borderRadius: 12, backgroundColor: Colors.primaryGreen, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  shareText: { color: '#050505', fontSize: 15, fontWeight: '800' },
  noCode: { color: '#DADADA', fontSize: 14, lineHeight: 20 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, padding: 12, borderRadius: 14, backgroundColor: Colors.secondaryBg, borderWidth: 1, borderColor: Colors.border, gap: 4 },
  statValue: { color: Colors.white, fontSize: 24, fontWeight: '900' },
  statLabel: { color: Colors.textSecondary, fontSize: 11, lineHeight: 14 },
  rowBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, borderRadius: 14, backgroundColor: Colors.secondaryBg, borderWidth: 1, borderColor: Colors.border },
  rowBtnTitle: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  rowBtnIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(125,255,42,0.12)', alignItems: 'center', justifyContent: 'center' },
  rowBtnSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  section: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  sectionSub: { color: Colors.textSecondary, fontSize: 12 },
  empty: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19 },
  friend: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, backgroundColor: '#0E0E0E', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  friendName: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  friendDate: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },
  badge: { height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: '#1C1C1C', justifyContent: 'center' },
  badgeOk: { backgroundColor: 'rgba(125,255,42,0.14)' },
  badgeText: { color: '#BDBDBD', fontSize: 11, fontWeight: '800' },
});
