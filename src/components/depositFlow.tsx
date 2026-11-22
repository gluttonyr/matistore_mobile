/**
 * Pieces of the redesigned deposit / withdrawal screens (DEPOSIT_DESIGN_V2).
 * The old design does not use any of them.
 */
import { Colors } from '@/constants/colors';
import { Check, Pencil } from 'lucide-react-native';
import { ReactNode, useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const GREEN_SOFT = 'rgba(125,255,42,0.12)';
const MUTED = '#8A8A8A';

/** Slides and fades its content in each time `stepKey` changes. */
export function StepTransition({ stepKey, children }: { stepKey: string | number; children: ReactNode }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [progress, stepKey]);
  return (
    <Animated.View style={{
      opacity: progress,
      transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
    }}>
      {children}
    </Animated.View>
  );
}

/**
 * Progress through the steps: one continuous bar cut in segments (done and current in green),
 * with the current step's name under it (the header already says "Étape 2 sur 5"). A done segment can be touched to go back.
 */
export function StepDots({ labels, current, onPressStep }: {
  labels: string[];
  /** 1-based. */
  current: number;
  onPressStep?: (index: number) => void;
}) {
  const index = Math.min(Math.max(current, 1), labels.length) - 1;
  return (
    <View style={s.stepsWrap}>
      <View style={s.stepsBar}>
        {labels.map((label, i) => {
          const done = i < index;
          const segment = <View style={[s.stepSeg, i <= index && s.stepSegOn, i === index && s.stepSegCurrent]} />;
          return done && onPressStep ? (
            <TouchableOpacity
              key={label}
              style={s.stepSegTouch}
              onPress={() => onPressStep(i)}
              hitSlop={{ top: 12, bottom: 12 }}
              accessibilityRole="button"
              accessibilityLabel={`Revenir à l’étape ${label}`}
            >
              {segment}
            </TouchableOpacity>
          ) : (
            <View key={label} style={s.stepSegTouch}>{segment}</View>
          );
        })}
      </View>
      <View style={s.stepsCaption}>
        <Text style={s.stepsLabel}>{labels[index]}</Text>

      </View>
    </View>
  );
}

export type SummaryChip = { key: string; label: string; onPress?: () => void };

/** What the client already chose; touching a chip goes back to that step. */
export function SummaryChips({ chips }: { chips: SummaryChip[] }) {
  if (!chips.length) return null;
  return (
    <View style={s.chipsRow}>
      {chips.map((chip) => (
        <TouchableOpacity
          key={chip.key}
          style={s.chip}
          onPress={chip.onPress}
          disabled={!chip.onPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={chip.onPress ? `Modifier ${chip.label}` : chip.label}
        >
          <Check color={Colors.primaryGreen} size={13} strokeWidth={3} />
          <Text style={s.chipText} numberOfLines={1}>{chip.label}</Text>
          {!!chip.onPress && <Pencil color={Colors.textSecondary} size={12} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

/** Green card shown once the bookmaker confirms the account ID. */
export function PlayerFoundCard({ name, bookmakerName }: { name?: string | null; bookmakerName: string }) {
  const scale = useRef(new Animated.Value(0.92)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }).start();
  }, [scale]);
  const initials = (name || bookmakerName).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  return (
    <Animated.View style={[s.playerCard, { transform: [{ scale }] }]}>
      <View style={s.playerAvatar}><Text style={s.playerInitials}>{initials}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={s.playerLabel}>{name ? 'Joueur trouvé' : 'Compte trouvé'}</Text>
        <Text style={s.playerName} numberOfLines={1}>{name || `Compte ${bookmakerName}`}</Text>
      </View>
      <Check color={Colors.primaryGreen} size={22} strokeWidth={2.8} />
    </Animated.View>
  );
}

export type TimelineStep = { label: string; sub?: string | null; time?: string | null; state: 'done' | 'active' | 'todo' | 'error' };

function PulsingDot({ children, color }: { children: ReactNode; color: string }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View style={s.tlDotWrap}>
      <Animated.View style={[s.tlHalo, { borderColor: color, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }] }]} />
      {children}
    </View>
  );
}

/** Live status list: Code lancé → Paiement reçu → … with the time of each step reached. */
export function StatusTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <View style={s.timeline}>
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        const nextReached = !last && steps[index + 1].state !== 'todo';
        let dot: ReactNode;
        if (step.state === 'done') {
          dot = <View style={[s.tlDot, s.tlDotDone]}><Check color={Colors.darkBg} size={16} strokeWidth={3.2} /></View>;
        } else if (step.state === 'active') {
          dot = (
            <PulsingDot color={Colors.primaryGreen}>
              <View style={[s.tlDot, s.tlDotActive]}><ActivityIndicator size="small" color={Colors.primaryGreen} /></View>
            </PulsingDot>
          );
        } else if (step.state === 'error') {
          dot = <View style={[s.tlDot, s.tlDotError]}><Text style={{ color: '#fff', fontWeight: '900' }}>!</Text></View>;
        } else {
          dot = <View style={s.tlDot} />;
        }
        return (
          <View key={step.label} style={s.tlRow}>
            <View style={s.tlRail}>
              {dot}
              {!last && <View style={[s.tlLine, (step.state === 'done' && nextReached) && s.tlLineDone]} />}
            </View>
            <View style={s.tlBody}>
              <View style={{ flex: 1 }}>
                <Text style={[
                  s.tlLabel,
                  step.state === 'todo' && { color: MUTED, fontWeight: '600' },
                  step.state === 'active' && { color: Colors.primaryGreen, fontWeight: '800' },
                  step.state === 'error' && { color: '#FF6B6B' },
                ]}>{step.label}</Text>
                {!!step.sub && <Text style={s.tlSub}>{step.sub}</Text>}
              </View>
              {!!step.time && <Text style={s.tlTime}>{step.time}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Big green check that pops in, with a ring spreading around it. */
export function SuccessCheck() {
  const pop = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start();
    const loop = Animated.loop(Animated.timing(ring, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [pop, ring]);
  return (
    <View style={s.successWrap}>
      <Animated.View style={[s.successRing, { opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }), transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.6] }) }] }]} />
      <Animated.View style={[s.successCircle, { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]}>
        <Check color={Colors.darkBg} size={56} strokeWidth={3} />
      </Animated.View>
    </View>
  );
}

/** Label / value rows of a receipt. */
export function RecapCard({ rows }: { rows: { label: string; value: string; highlight?: boolean }[] }) {
  return (
    <View style={s.recap}>
      {rows.map((row, index) => (
        <View key={row.label} style={[s.recapRow, index < rows.length - 1 && s.recapRowBorder]}>
          <Text style={s.recapLabel}>{row.label}</Text>
          <Text style={[s.recapValue, row.highlight && { color: Colors.primaryGreen }]} numberOfLines={1}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

/** Amount hero shown above the live tracking. */
export function AmountHero({ top, amount, bottom }: { top: string; amount: string; bottom: string }) {
  return (
    <View style={s.hero}>
      <Text style={s.heroSide} numberOfLines={1}>{top}</Text>
      <Text style={s.heroAmount}>{amount} <Text style={s.heroCurrency}>FCFA</Text></Text>
      <Text style={s.heroSide} numberOfLines={1}>{bottom}</Text>
    </View>
  );
}

/** "En direct" badge with a blinking dot. */
export function LiveBadge() {
  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(blink, { toValue: 0.25, duration: 700, useNativeDriver: true }),
      Animated.timing(blink, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [blink]);
  return (
    <View style={s.live}>
      <Animated.View style={[s.liveDot, { opacity: blink }]} />
      <Text style={s.liveText}>En direct</Text>
    </View>
  );
}

export const formatClock = (date: string | number | Date | null | undefined) => {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const formatDuration = (from?: string | null, to?: string | null) => {
  if (!from) return null;
  const ms = (to ? new Date(to).getTime() : Date.now()) - new Date(from).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes} min ${String(seconds).padStart(2, '0')} s` : `${seconds} s`;
};

const s = StyleSheet.create({
  stepsWrap: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, gap: 8 },
  stepsBar: { flexDirection: 'row', gap: 5 },
  stepSegTouch: { flex: 1 },
  stepSeg: { height: 5, borderRadius: 3, backgroundColor: '#262626' },
  stepSegOn: { backgroundColor: Colors.primaryGreen },
  stepSegCurrent: { shadowColor: Colors.primaryGreen, shadowOpacity: 0.6, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  stepsCaption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  stepsLabel: { color: Colors.white, fontSize: 13, fontWeight: '800' },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: Colors.secondaryBg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', maxWidth: '100%' },
  chipText: { color: Colors.white, fontSize: 13, fontWeight: '600', flexShrink: 1 },

  playerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginTop: 12, borderRadius: 14, backgroundColor: 'rgba(125,255,42,0.08)', borderWidth: 1, borderColor: 'rgba(125,255,42,0.3)' },
  playerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryGreen, alignItems: 'center', justifyContent: 'center' },
  playerInitials: { color: Colors.darkBg, fontSize: 15, fontWeight: '800' },
  playerLabel: { color: '#B4FF7F', fontSize: 12 },
  playerName: { color: Colors.white, fontSize: 16, fontWeight: '800' },

  timeline: { paddingHorizontal: 4, marginVertical: 8 },
  tlRow: { flexDirection: 'row', gap: 14 },
  tlRail: { width: 32, alignItems: 'center' },
  tlDotWrap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  tlHalo: { position: 'absolute', width: 32, height: 32, borderRadius: 16, borderWidth: 2 },
  tlDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  tlDotDone: { backgroundColor: Colors.primaryGreen, borderColor: Colors.primaryGreen },
  tlDotActive: { backgroundColor: GREEN_SOFT, borderWidth: 2, borderColor: Colors.primaryGreen },
  tlDotError: { backgroundColor: '#B42318', borderColor: '#B42318' },
  tlLine: { width: 2, flex: 1, minHeight: 30, backgroundColor: '#2A2A2A' },
  tlLineDone: { backgroundColor: Colors.primaryGreen },
  tlBody: { flex: 1, flexDirection: 'row', paddingTop: 6, paddingBottom: 18, gap: 8 },
  tlLabel: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  tlSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  tlTime: { color: Colors.textSecondary, fontSize: 12 },

  successWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 24 },
  successRing: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: Colors.primaryGreen },
  successCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: Colors.primaryGreen, alignItems: 'center', justifyContent: 'center' },

  recap: { borderRadius: 16, backgroundColor: Colors.secondaryBg, borderWidth: 1, borderColor: Colors.border, marginTop: 24 },
  recapRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  recapRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  recapLabel: { color: Colors.textSecondary, fontSize: 13 },
  recapValue: { color: Colors.white, fontSize: 13, fontWeight: '700', flexShrink: 1, textAlign: 'right' },

  hero: { alignItems: 'center', gap: 4, paddingVertical: 18, paddingHorizontal: 16, borderRadius: 18, backgroundColor: Colors.secondaryBg, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  heroSide: { color: Colors.textSecondary, fontSize: 13 },
  heroAmount: { color: Colors.white, fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  heroCurrency: { color: Colors.textSecondary, fontSize: 16, fontWeight: '700' },

  live: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: GREEN_SOFT },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primaryGreen },
  liveText: { color: Colors.primaryGreen, fontSize: 12, fontWeight: '700' },
});

/** Layout styles of the redesigned screens. */
export const flowStyles = StyleSheet.create({
  panel: { gap: 10, padding: 16, marginTop: 14, borderRadius: 16, backgroundColor: Colors.secondaryBg, borderWidth: 1, borderColor: Colors.border },
  panelLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  amountInput: { flex: 1, color: Colors.white, fontSize: 38, fontWeight: '800', letterSpacing: -1, paddingVertical: 0 },
  amountCurrency: { color: Colors.textSecondary, fontSize: 16, fontWeight: '700' },
  hint: { color: Colors.textSecondary, fontSize: 12 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, marginTop: 8 },
  linkBtnText: { color: Colors.primaryGreen, fontSize: 14, fontWeight: '700' },
  secondaryBtn: { minHeight: 52, marginTop: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.secondaryBg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  secondaryBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  infoBox: { flexDirection: 'row', gap: 12, padding: 14, marginTop: 4, marginBottom: 12, borderRadius: 14, backgroundColor: Colors.secondaryBg, borderWidth: 1, borderColor: Colors.border },
  infoText: { flex: 1, color: '#C8C8C8', fontSize: 13, lineHeight: 19 },
  lateBox: { gap: 6, padding: 14, marginBottom: 12, borderRadius: 14, backgroundColor: 'rgba(255,165,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,165,0,0.3)' },
  lateTitle: { color: '#FFB733', fontSize: 13, fontWeight: '800' },
  lateText: { color: '#E0E0E0', fontSize: 13, lineHeight: 19 },
  lateLink: { color: '#FFB733', fontSize: 13, fontWeight: '800', paddingVertical: 6 },
  successTitle: { color: Colors.white, fontSize: 26, fontWeight: '800', textAlign: 'center', marginTop: 20 },
  successText: { color: Colors.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 8 },
});
