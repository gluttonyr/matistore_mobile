import { Colors } from '@/constants/colors';
import type { ReferralResults } from '@/data_api/models/referral.types';
import { referralService } from '@/data_api/services/referralService';
import { PersonAvatar, ordinal } from '@/components/referral/referralUi';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = ['#7DFF2A', '#FFD54A', '#FFFFFF', '#E59A5B', '#52D726'];
const MEDAL = ['#FFD54A', '#D7DEE4', '#E59A5B'];
const HEIGHTS = [170, 130, 100];

function Confetti() {
  const { width, height } = Dimensions.get('window');
  const pieces = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    left: (i * 53 + 11) % Math.max(width - 10, 100), color: COLORS[i % COLORS.length], duration: 3200 + (i % 5) * 600, delay: (i % 7) * 350,
  })), [width]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => <Piece key={i} {...p} height={height} />)}
    </View>
  );
}

function Piece({ left, color, duration, delay, height }: { left: number; color: string; duration: number; delay: number; height: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [delay, duration, v]);
  return (
    <Animated.View style={{
      position: 'absolute', top: -20, left, width: 8, height: 14, borderRadius: 2, backgroundColor: color,
      transform: [
        { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, height + 40] }) },
        { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '540deg'] }) },
      ],
    }} />
  );
}

function Bar({ height, color, delay, children }: { height: number; color: string; delay: number; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 800, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [delay, v]);
  return (
    <Animated.View style={[s.bar, { height: v.interpolate({ inputRange: [0, 1], outputRange: [0, height] }) }]}>
      <LinearGradient colors={[color, 'rgba(255,255,255,0.04)']} style={StyleSheet.absoluteFill} />
      {children}
    </Animated.View>
  );
}

export default function ReferralResultsScreen() {
  const insets = useSafeAreaInsets();
  const [results, setResults] = useState<ReferralResults | null>(null);
  const [nextRound, setNextRound] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    referralService.getTournament()
      .then((t) => { setResults(t.lastResults); setNextRound(t.round?.number ?? null); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const mine = results?.winners.find((w) => w.isMe);
  const podium = [2, 1, 3].map((rank) => results?.winners.find((w) => w.rank === rank)).filter(Boolean) as ReferralResults['winners'];
  const others = (results?.winners ?? []).filter((w) => w.rank > 3);
  const range = results
    ? `Du ${new Date(results.startAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${new Date(new Date(results.endAt).getTime() - 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
    : '';

  return (
    <View style={s.container}>
      {!!mine && <Confetti />}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Fermer">
          <X color={Colors.white} size={18} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{results ? `Tour n°${results.number} terminé` : 'Résultats'}</Text>
          {!!results && <Text style={s.subtitle}>{range} · résultats définitifs</Text>}
        </View>
      </View>
      {loading ? <ActivityIndicator color={Colors.primaryGreen} style={{ marginTop: 60 }} /> : !results ? (
        <Text style={s.empty}>Aucun tour terminé pour le moment.</Text>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 14 }}>
          {!!mine && (
            <LinearGradient colors={['#1A3A0A', '#0B0B0B']} style={s.winCard}>
              <Text style={s.winKicker}>Félicitations !</Text>
              <Text style={s.winTitle}>Tu termines {ordinal(mine.rank)}</Text>
              <Text style={s.winText}>
                Tu gagnes {mine.prize?.labelText ?? 'un prix'}. {results.myRewarded ? 'Ta récompense t’a été remise.' : 'Tu seras bientôt récompensé.'}
              </Text>
            </LinearGradient>
          )}
          {results.winners.length === 0 && <Text style={s.empty}>Aucun gagnant sur ce tour.</Text>}
          <View style={s.podium}>
            {podium.map((w, i) => (
              <View key={w.rank} style={{ width: 104, alignItems: 'center', gap: 8 }}>
                <PersonAvatar name={w.name} image={w.image} size={56} ring={MEDAL[w.rank - 1]} ringWidth={3} />
                <Text style={s.podiumName} numberOfLines={2}>{w.isMe ? `Toi (${w.name})` : w.name}</Text>
                <Bar height={HEIGHTS[w.rank - 1]} color={MEDAL[w.rank - 1]} delay={i * 150}>
                  <Text style={s.barRank}>{w.rank}</Text>
                  <Text style={s.barCount}>{w.validated} validés</Text>
                </Bar>
              </View>
            ))}
          </View>
          {others.map((w) => (
            <View key={w.rank} style={[s.other, w.isMe && { borderColor: Colors.primaryGreen }]}>
              <View style={s.otherRank}><Text style={s.otherRankText}>{w.rank}</Text></View>
              <Text style={s.otherName} numberOfLines={1}>{w.isMe ? `Toi (${w.name})` : w.name}</Text>
              <Text style={s.otherPrize}>{w.prize?.labelText}</Text>
            </View>
          ))}
          {!!nextRound && (
            <TouchableOpacity style={s.next} onPress={() => router.replace('/referral' as any)} activeOpacity={0.8}>
              <Text style={s.nextText}>Le tour n°{nextRound} a commencé. Tout le monde repart à zéro.</Text>
              <Text style={{ color: Colors.primaryGreen, fontWeight: '800' }}>Voir</Text>
            </TouchableOpacity>
          )}
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
  subtitle: { color: Colors.textSecondary, fontSize: 12 },
  empty: { color: Colors.textSecondary, textAlign: 'center', marginTop: 40, fontSize: 14 },
  winCard: { padding: 16, borderRadius: 18, borderWidth: 1, borderColor: Colors.primaryGreen, alignItems: 'center', gap: 6 },
  winKicker: { color: '#B4FF7F', fontSize: 13, fontWeight: '700' },
  winTitle: { color: Colors.white, fontSize: 22, fontWeight: '900' },
  winText: { color: '#DADADA', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 10, minHeight: 260, marginTop: 6 },
  podiumName: { color: Colors.white, fontSize: 12, fontWeight: '800', textAlign: 'center', lineHeight: 15, minHeight: 30 },
  bar: { width: '100%', borderTopLeftRadius: 14, borderTopRightRadius: 14, overflow: 'hidden', alignItems: 'center', paddingTop: 10 },
  barRank: { color: '#050505', fontSize: 26, fontWeight: '900' },
  barCount: { color: '#050505', fontSize: 11, fontWeight: '800' },
  other: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: 'rgba(125,255,42,0.07)', borderWidth: 1, borderColor: 'rgba(125,255,42,0.22)' },
  otherRank: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#1C1C1C', alignItems: 'center', justifyContent: 'center' },
  otherRankText: { color: Colors.white, fontWeight: '900', fontSize: 12 },
  otherName: { flex: 1, color: Colors.white, fontSize: 14, fontWeight: '700' },
  otherPrize: { color: Colors.primaryGreen, fontSize: 12, fontWeight: '800' },
  next: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, backgroundColor: Colors.secondaryBg, borderWidth: 1, borderColor: Colors.border },
  nextText: { flex: 1, color: '#DADADA', fontSize: 13 },
});
