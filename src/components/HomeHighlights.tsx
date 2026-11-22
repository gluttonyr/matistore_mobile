import { Colors } from '@/constants/colors';
import type { ReferralTournament } from '@/data_api/models/referral.types';
import { couponService } from '@/data_api/services/couponService';
import { referralService } from '@/data_api/services/referralService';
import { PressableScale } from '@/components/ui/PressableScale';
import { formatCountdown, ordinal } from '@/components/referral/referralUi';
import { SnowCap } from '@/components/christmas/Christmas';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { Ticket, Trophy } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/** Client home: two big entries, the referral tournament and the coupons of the day. */
export function HomeHighlights() {
  const [tournament, setTournament] = useState<ReferralTournament | null>(null);
  const [coupons, setCoupons] = useState<{ count: number; today: boolean } | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    referralService.getTournament().then((t) => { if (active) setTournament(t); }).catch(() => {});
    couponService.home()
      .then((d) => { if (active) setCoupons({ count: d.items.length, today: d.today }); })
      .catch(() => {});
    return () => { active = false; };
  }, []));

  const round = tournament?.round;
  let tournamentSub = 'Invite tes amis, gagne des bonus';
  if (round) {
    const clock = formatCountdown(new Date(round.endAt).getTime() - Date.now());
    tournamentSub = round.me.rank
      ? `Tu es ${ordinal(round.me.rank)} · fin dans ${clock[0].v} j`
      : `${round.winnersCount} gagnants · fin dans ${clock[0].v} j`;
  }
  const couponsSub = coupons?.today && coupons.count
    ? `${coupons.count} coupon${coupons.count > 1 ? 's' : ''} aujourd’hui`
    : 'Les pronostics du jour';

  return (
    <View style={s.section}>
      <Text style={s.title}>À ne pas manquer</Text>
      <View style={s.row}>
        <PressableScale style={s.tile} onPress={() => router.push('/referral' as any)} accessibilityLabel="Ouvrir le tournoi de parrainage">
          <LinearGradient colors={['#3A2A05', '#151005']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <SnowCap variant={0} height={22} inset />
          <View style={s.watermark} pointerEvents="none"><Trophy color="#FFC94D" size={96} strokeWidth={1.4} /></View>
          <View style={[s.icon, { backgroundColor: '#FFC94D' }]}><Trophy color="#050505" size={22} /></View>
          <Text style={[s.tileTitle, { color: '#FFD873' }]}>Tournoi</Text>
          <Text style={s.tileSub} numberOfLines={2}>{tournamentSub}</Text>
          <Text style={[s.cta, { color: '#FFC94D' }]}>Participer →</Text>
        </PressableScale>

        <PressableScale style={s.tile} onPress={() => router.push('/coupons' as any)} accessibilityLabel="Ouvrir les coupons du jour">
          <LinearGradient colors={['#173A05', '#0A1405']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <SnowCap variant={1} height={22} inset />
          <View style={s.watermark} pointerEvents="none"><Ticket color={Colors.primaryGreen} size={96} strokeWidth={1.4} /></View>
          <View style={[s.icon, { backgroundColor: Colors.primaryGreen }]}><Ticket color="#050505" size={22} /></View>
          <Text style={[s.tileTitle, { color: Colors.primaryGreen }]}>Coupons</Text>
          <Text style={s.tileSub} numberOfLines={2}>{couponsSub}</Text>
          <Text style={[s.cta, { color: Colors.primaryGreen }]}>Voir les coupons →</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  section: { paddingHorizontal: 20, marginTop: 12, marginBottom: 24 },
  title: { color: Colors.white, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12 },
  tile: {
    flex: 1,
    minHeight: 150,
    padding: 16,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  tileTitle: { fontSize: 18, fontWeight: '900' },
  tileSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 16, flexGrow: 1 },
  cta: { fontSize: 13, fontWeight: '800', marginTop: 8 },
  // Big faded pictogram in the corner, behind the text.
  watermark: { position: 'absolute', right: -18, bottom: -14, opacity: 0.14, transform: [{ rotate: '-12deg' }] },
});
