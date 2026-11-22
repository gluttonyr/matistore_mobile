/**
 * Christmas decorations: Santa hat on profile photos, snow on cards, falling snow and gifts.
 * They show when the THEME_NOEL parameter (server) is 1, and render nothing otherwise.
 * The last known value is kept on the phone, so the splash knows it at once on the next launch.
 * In development, EXPO_PUBLIC_CHRISTMAS_PREVIEW=1 shows them whatever the parameter.
 */
import { parametreService } from '@/data_api/services/parametreService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Animated, AppState, Easing, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, FeGaussianBlur, Filter, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

// ── Theme switch (server parameter) ──────────────────────────────────────────

const THEME_PARAM = 'THEME_NOEL';
const CACHE_KEY = 'matistore.themeNoel';
/** Longest wait for the server on a first launch before the splash goes on without Christmas. */
const FIRST_ANSWER_MS = 1500;
const PREVIEW = __DEV__ && process.env.EXPO_PUBLIC_CHRISTMAS_PREVIEW === '1';

type ThemeState = { on: boolean; settled: boolean };
let theme: ThemeState = { on: PREVIEW, settled: PREVIEW };
let knownFromServer = false;
let started = false;
const listeners = new Set<() => void>();

function setTheme(next: Partial<ThemeState>) {
  const merged = { ...theme, ...next, on: PREVIEW || (next.on ?? theme.on) };
  if (merged.on === theme.on && merged.settled === theme.settled) return;
  theme = merged;
  listeners.forEach((l) => l());
}

async function fetchTheme() {
  try {
    const parametre = await parametreService.getById(THEME_PARAM);
    const on = Number(parametre?.valeur) === 1;
    knownFromServer = true;
    setTheme({ on, settled: true });
    AsyncStorage.setItem(CACHE_KEY, on ? '1' : '0').catch(() => {});
  } catch {
    // Offline or older server: keep the value we already have.
    setTheme({ settled: true });
  }
}

/** Reads the kept value, then asks the server; again each time the app comes back to the front. */
export function loadChristmasTheme() {
  if (started) return;
  started = true;
  AsyncStorage.getItem(CACHE_KEY)
    .then((value) => {
      if (value !== null && !knownFromServer) setTheme({ on: value === '1', settled: true });
    })
    .catch(() => {});
  void fetchTheme();
  setTimeout(() => setTheme({ settled: true }), FIRST_ANSWER_MS);
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void fetchTheme();
  });
}

function subscribe(listener: () => void) {
  loadChristmasTheme();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** on: show the decorations. settled: the value is known (kept value, server answer, or waited long enough). */
export function useChristmasTheme(): ThemeState {
  return useSyncExternalStore(subscribe, () => theme, () => theme);
}

export function useChristmasTime(): boolean {
  return useChristmasTheme().on;
}

// ── Santa hat ────────────────────────────────────────────────────────────────

/** Santa hat set on the top-left of a round photo of `size` px. Put it inside a relative parent. */
export function ChristmasHat({ size }: { size: number }) {
  const christmas = useChristmasTime();
  const sway = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(sway, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(sway, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [sway]);
  if (!christmas) return null;
  const w = size * 0.95;
  const rotate = sway.interpolate({ inputRange: [0, 1], outputRange: ['-22deg', '-14deg'] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', width: w, height: w * 0.9, left: -size * 0.28, top: -size * 0.5, transform: [{ rotate }] }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 90">
        <G transform="translate(100 0) scale(-1 1)">
          <Path d="M16 68 C 20 40 36 14 62 10 C 76 8 88 16 92 30 C 84 24 74 24 68 30 C 62 38 66 54 84 68 Z" fill="#D7263D" />
          <Path d="M40 66 C 44 46 54 26 66 18 C 58 30 56 48 62 66 Z" fill="#A3172B" opacity={0.55} />
          <Rect x={6} y={62} width={88} height={22} rx={11} fill="#F7F7F7" />
          <Path d="M14 70 h6 M28 75 h5 M42 69 h6 M56 75 h5 M70 70 h6 M82 75 h4" stroke="#D9DEE3" strokeWidth={3} strokeLinecap="round" />
          <Circle cx={92} cy={33} r={10} fill="#F7F7F7" />
        </G>
      </Svg>
    </Animated.View>
  );
}

// ── Snow on a card ───────────────────────────────────────────────────────────

// Light, soft snow lying on the top edge of a card, with a few small drips sliding over it:
// overlapping round clumps with slightly blurred edges and a soft blue shadow.

const SNOW_T = 18; // the card's top edge, measured from the top of the drawing

function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
const taperAt = (w: number, x: number) => Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, x / w))), 0.55);

type Clump = { x: number; y: number; r: number };

function snowClumps(w: number, size: number, seed: number): Clump[] {
  const r = seeded(seed);
  const list: Clump[] = [];
  let x = 8;
  while (x < w - 8) {
    const t = taperAt(w, x);
    const rr = Math.max(2.2, size * t * (0.7 + r() * 0.5));
    list.push({ x, y: SNOW_T - rr * (0.25 + r() * 0.25), r: rr });
    if (r() < 0.45 && t > 0.4) list.push({ x: x + rr * 0.4, y: SNOW_T - rr * 1.05, r: rr * (0.45 + r() * 0.25) });
    x += rr * (0.9 + r() * 0.5);
  }
  // Small drips: soft balls stacked downwards, getting thinner.
  const drips = Math.max(2, Math.round(w / 45));
  for (let i = 0; i < drips; i++) {
    const dx = 14 + ((w - 28) * (i + 0.5)) / drips + (r() - 0.5) * 10;
    const len = 8 * taperAt(w, dx) * (0.5 + r() * 0.7);
    const width = 2 + r() * 1.4;
    const n = Math.max(2, Math.round(len / 2));
    for (let k = 0; k <= n; k++) {
      const p = k / n;
      list.push({ x: dx + Math.sin(p * 2.2) * 0.6, y: SNOW_T + 1 + p * len, r: width * (1 - p * 0.6) });
    }
  }
  return list;
}

function SnowLayer({ w, seed, size }: { w: number; seed: number; size: number }) {
  const list = useMemo(() => snowClumps(w, size, seed), [w, size, seed]);
  return (
    <Svg width={w} height={SNOW_T + 16}>
      <Defs>
        <RadialGradient id={`sg${seed}`} cx="0.45" cy="0.35" rx="0.6" ry="0.6">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.75" stopColor="#F7FAFE" />
          <Stop offset="1" stopColor="#DFE8F5" />
        </RadialGradient>
        <Filter id={`ss${seed}`} x="-20%" y="-50%" width="140%" height="200%">
          <FeGaussianBlur stdDeviation={1.8} />
        </Filter>
        <Filter id={`sm${seed}`} x="-10%" y="-50%" width="120%" height="200%">
          <FeGaussianBlur stdDeviation={0.5} />
        </Filter>
      </Defs>
      <G filter={`url(#ss${seed})`} opacity={0.45}>
        {list.map((c, i) => <Circle key={i} cx={c.x} cy={c.y + 2} r={c.r} fill="#8FA5C4" />)}
      </G>
      <G filter={`url(#sm${seed})`}>
        {list.map((c, i) => <Circle key={i} cx={c.x} cy={c.y} r={c.r} fill={`url(#sg${seed})`} />)}
      </G>
    </Svg>
  );
}

/** Snow on the top edge of a card. Put it inside the card (position relative). */
export function SnowCap({ variant = 0, height = 20, inset = false, style }: {
  variant?: number;
  /** Overall thickness of the snow, in px. */
  height?: number;
  /** For cards that clip their content (overflow hidden): the snow sits just inside the top edge. */
  inset?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const christmas = useChristmasTime();
  const [w, setW] = useState(0);
  if (!christmas) return null;
  const size = Math.max(3.5, height * 0.3);
  return (
    <View
      pointerEvents="none"
      onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}
      style={[s.cap, { height: SNOW_T + 16, top: inset ? -(SNOW_T - size * 1.5) : -SNOW_T }, style]}
    >
      {w > 0 && <SnowLayer w={w} seed={variant * 7 + 3} size={size} />}
    </View>
  );
}

// ── Falling snow (and gifts) ─────────────────────────────────────────────────

function Flake({ x, size, duration, delay, height, drift }: { x: number; size: number; duration: number; delay: number; height: number; drift: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.timing(t, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }));
    const timer = setTimeout(() => anim.start(), delay);
    return () => { clearTimeout(timer); anim.stop(); };
  }, [t, duration, delay]);
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [-20, height + 20] });
  const translateX = t.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, drift, 0, -drift, 0] });
  return (
    <Animated.View
      style={{
        position: 'absolute', left: x, top: 0, width: size, height: size, borderRadius: size / 2,
        backgroundColor: '#FFFFFF', opacity: 0.35 + (size / 10) * 0.4,
        transform: [{ translateY }, { translateX }],
      }}
    />
  );
}

const GIFT_COLORS = [
  { box: '#E3262E', ribbon: '#FFD54A' },
  { box: '#2E7D32', ribbon: '#F7F7F7' },
  { box: '#1E5BD8', ribbon: '#FFD54A' },
];

/** A gift drawn with views: a box, a ribbon cross and a bow. */
function Gift({ size, colors }: { size: number; colors: { box: string; ribbon: string } }) {
  const r = Math.max(3, size * 0.16);
  return (
    <View style={{ width: size, height: size * 1.1 }}>
      <View style={{ position: 'absolute', top: -size * 0.12, left: size * 0.5 - r * 1.4, width: r * 1.4, height: r * 1.4, borderRadius: r, borderWidth: 3, borderColor: colors.ribbon, transform: [{ rotate: '-30deg' }] }} />
      <View style={{ position: 'absolute', top: -size * 0.12, left: size * 0.5, width: r * 1.4, height: r * 1.4, borderRadius: r, borderWidth: 3, borderColor: colors.ribbon, transform: [{ rotate: '30deg' }] }} />
      <View style={{ position: 'absolute', top: size * 0.1, left: 0, width: size, height: size, borderRadius: 4, backgroundColor: colors.box }} />
      <View style={{ position: 'absolute', top: size * 0.1, left: size * 0.5 - r / 2, width: r, height: size, backgroundColor: colors.ribbon }} />
      <View style={{ position: 'absolute', top: size * 0.1 + size * 0.5 - r / 2, left: 0, width: size, height: r, backgroundColor: colors.ribbon }} />
    </View>
  );
}

/** A gift that falls, lands at the bottom with a small bounce, stays a moment, then starts again. */
function FallingGift({ x, size, delay, height, colors }: { x: number; size: number; delay: number; height: number; colors: { box: string; ribbon: string } }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(t, { toValue: 1, duration: 4200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(t, { toValue: 1.06, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(t, { toValue: 1, duration: 200, easing: Easing.bounce, useNativeDriver: true }),
      Animated.delay(2600),
      Animated.timing(t, { toValue: 1.2, duration: 500, useNativeDriver: true }),
      Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: true }),
      Animated.delay(5000),
    ]));
    const timer = setTimeout(() => anim.start(), delay);
    return () => { clearTimeout(timer); anim.stop(); };
  }, [t, delay]);
  // Lands on the snow pile at the bottom of the screen.
  const landY = height - size * 1.1 - 34;
  const translateY = t.interpolate({ inputRange: [0, 1, 1.06, 1.2], outputRange: [-size * 2, landY, landY - size * 0.25, landY] });
  const rotate = t.interpolate({ inputRange: [0, 0.5, 1, 1.2], outputRange: ['-18deg', '10deg', '0deg', '0deg'] });
  const opacity = t.interpolate({ inputRange: [0, 0.05, 1.1, 1.2], outputRange: [0, 1, 1, 0] });
  return (
    <Animated.View style={{ position: 'absolute', left: x, top: 0, opacity, transform: [{ translateY }, { rotate }] }}>
      <Gift size={size} colors={colors} />
    </Animated.View>
  );
}

/** Falling snow over a whole screen (touches go through). `gifts` adds a few falling gifts. */
export function Snowfall({ count = 14, gifts = false }: { count?: number; gifts?: boolean }) {
  const christmas = useChristmasTime();
  const { width, height } = useWindowDimensions();
  const flakes = useMemo(
    () => Array.from({ length: count }, (_, i) => {
      // Fixed pseudo-random spread so the snow does not jump on each render.
      const r = (n: number) => ((Math.sin((i + 1) * n) + 1) / 2);
      return {
        key: i,
        x: r(12.9898) * width,
        size: 3 + r(78.233) * 5,
        duration: 7000 + r(37.719) * 7000,
        delay: r(93.989) * 6000,
        drift: 6 + r(15.17) * 14,
      };
    }),
    [count, width],
  );
  if (!christmas) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {flakes.map(({ key, ...f }) => <Flake key={key} {...f} height={height} />)}
      {gifts && [
        { x: width * 0.08, size: 42, delay: 800 },
        { x: width * 0.7, size: 36, delay: 4800 },
        { x: width * 0.42, size: 32, delay: 9000 },
      ].map((g, i) => <FallingGift key={i} {...g} height={height} colors={GIFT_COLORS[i % GIFT_COLORS.length]} />)}
      {gifts && (
        // Snow piled at the bottom, where the gifts land.
        <Svg style={{ position: 'absolute', left: 0, bottom: 0 }} width={width} height={46} viewBox="0 0 390 46" preserveAspectRatio="none">
          <Path d="M0 26 Q30 10 60 20 Q90 6 130 18 Q170 4 210 16 Q250 6 290 18 Q330 8 360 16 Q378 12 390 20 L390 46 L0 46 Z" fill="#FFFFFF" opacity={0.92} />
          <Path d="M0 32 Q40 22 80 30 Q130 18 180 28 Q230 20 280 30 Q330 22 390 30 L390 46 L0 46 Z" fill="#E6EEFF" />
        </Svg>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  cap: {
    position: 'absolute', left: 4, right: 4, zIndex: 5,
  },
});
