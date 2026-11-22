import { Colors } from '@/constants/colors';
import type { ReferralTournament } from '@/data_api/models/referral.types';
import { referralService } from '@/data_api/services/referralService';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { ChevronRight, Trophy } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatCountdown, ordinal } from './referralUi';

/** Home entry to the referral tournament (hidden when no round runs and no result exists). */
export function ReferralHomeCard() {
  const [data, setData] = useState<ReferralTournament | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    referralService.getTournament().then((t) => { if (active) setData(t); }).catch(() => {});
    return () => { active = false; };
  }, []));

  const round = data?.round;
  if (!round && !data?.lastResults) return null;

  const clock = round ? formatCountdown(new Date(round.endAt).getTime() - Date.now()) : null;
  const subtitle = round
    ? round.me.rank
      ? `Tu es ${ordinal(round.me.rank)} · fin dans ${clock![0].v} j ${clock![1].v} h`
      : `${round.winnersCount} gagnants · fin dans ${clock![0].v} j ${clock![1].v} h`
    : `Résultats du tour n°${data!.lastResults!.number}`;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push((round ? '/referral' : '/referral/results') as any)}
      accessibilityRole="button"
      accessibilityLabel="Tournoi de parrainage"
    >
      <LinearGradient colors={['#1A3A0A', '#0B0B0B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.card}>
        <View style={s.icon}><Trophy color="#FFD54A" size={22} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Tournoi de parrainage</Text>
          <Text style={s.sub} numberOfLines={1}>{subtitle}</Text>
        </View>
        <ChevronRight color={Colors.primaryGreen} size={20} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: { marginTop: 12, minHeight: 64, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(125,255,42,0.35)' },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,213,74,0.12)' },
  title: { color: Colors.white, fontSize: 14, fontWeight: '800' },
  sub: { color: '#B4FF7F', fontSize: 12, marginTop: 2 },
});
