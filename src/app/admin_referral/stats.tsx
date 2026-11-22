import { Colors } from '@/constants/colors';
import type { ReferralStats } from '@/data_api/models/referral.types';
import { referralService } from '@/data_api/services/referralService';
import { router, useFocusEffect } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const money = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M` : n.toLocaleString('fr-FR'));

export default function AdminReferralStatsScreen() {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setStats(await referralService.getStats()); } catch { /* keep */ } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const daily = stats?.daily ?? [];
  const max = Math.max(1, ...daily.map((d) => d.validated));
  const kpis = [
    { value: String(stats?.participants ?? 0), label: 'Parrains qui participent', green: false },
    { value: String(stats?.validated ?? 0), label: 'Parrainages validés', green: true },
    { value: String(stats?.filleulsJoined ?? 0), label: 'Filleuls arrivés ce tour', green: false },
    { value: money(stats?.depositedAmount ?? 0), label: 'FCFA déposés par les filleuls', green: true },
  ];

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Retour">
          <ArrowLeft color={Colors.white} size={20} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Statistiques</Text>
          {!!stats?.round && <Text style={s.sub}>Tour n°{stats.round.number} · en cours</Text>}
        </View>
      </View>
      {loading ? <ActivityIndicator color={Colors.primaryGreen} style={{ marginTop: 60 }} /> : !stats?.round ? (
        <Text style={s.empty}>Aucun tour en cours.</Text>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 14 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={Colors.primaryGreen} />}
        >
          <View style={s.grid}>
            {kpis.map((k) => (
              <View key={k.label} style={s.kpi}>
                <Text style={[s.kpiValue, k.green && { color: Colors.primaryGreen }]}>{k.value}</Text>
                <Text style={s.kpiLabel}>{k.label}</Text>
              </View>
            ))}
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Parrainages validés par jour</Text>
            {daily.length === 0 ? <Text style={s.sub}>Pas encore de parrainage validé.</Text> : (
              <View style={s.chart}>
                {daily.map((d) => (
                  <View key={d.day} style={s.barCol}>
                    <Text style={s.barValue}>{d.validated}</Text>
                    <View style={[s.bar, { height: Math.max(4, Math.round((d.validated / max) * 70)) }]} />
                    <Text style={s.barDay}>{new Date(`${d.day}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short' })}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Top 10 du tour</Text>
            {(stats.top ?? []).length === 0 && <Text style={s.sub}>Personne n’est encore classé.</Text>}
            {(stats.top ?? []).map((t) => (
              <View key={t.rank} style={s.topRow}>
                <Text style={s.topRank}>{t.rank}</Text>
                <Text style={s.topName} numberOfLines={1}>{t.name}</Text>
                <Text style={s.topCount}>{t.validated}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darkBg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 6 },
  iconBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: Colors.secondaryBg, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  sub: { color: Colors.textSecondary, fontSize: 12 },
  empty: { color: Colors.textSecondary, textAlign: 'center', marginTop: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpi: { width: '48.5%', padding: 12, borderRadius: 14, backgroundColor: Colors.secondaryBg, borderWidth: 1, borderColor: Colors.border, gap: 2 },
  kpiValue: { color: Colors.white, fontSize: 22, fontWeight: '900' },
  kpiLabel: { color: Colors.textSecondary, fontSize: 11 },
  card: { padding: 12, borderRadius: 14, backgroundColor: Colors.secondaryBg, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  cardTitle: { color: Colors.white, fontSize: 13, fontWeight: '800' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 110 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barValue: { color: '#BDBDBD', fontSize: 10 },
  bar: { width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: 'rgba(125,255,42,0.55)' },
  barDay: { color: '#8A8A8A', fontSize: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  topRank: { width: 22, color: '#BDBDBD', fontWeight: '900', textAlign: 'center' },
  topName: { flex: 1, color: Colors.white, fontSize: 14, fontWeight: '700' },
  topCount: { color: Colors.primaryGreen, fontWeight: '900', fontSize: 15 },
});
