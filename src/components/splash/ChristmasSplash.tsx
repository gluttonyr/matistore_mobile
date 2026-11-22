import MatiLogo from '@/components/ui/MatiLogo';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { BALL_COUNT, BALL_GAP, BALL_ICONS, BallSlot } from './sportBalls';

// Christmas splash (1 December – 6 January): neon green Christmas scenery
// (painted background), the logo in a neon ring with a light running around it,
// a Santa hat dropping onto the logo, and the usual 7 sport balls loader.

const BG = require('../../../assets/splash-noel.png');
const BG_W = 592;
const BG_H = 1280;
const GREEN = '#7DFF2A';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

type Props = {
  fadeAnim: Animated.Value;
  scaleAnim: Animated.Value;
  glowAnim: Animated.Value;
  progressAnim: Animated.Value;
};

export function ChristmasSplash({ fadeAnim, scaleAnim, glowAnim, progressAnim }: Props) {
  const { width: W, height: H } = useWindowDimensions();

  // Phones (shape close to the picture's): the picture fills the screen, barely cropped.
  // Wide screens (tablet, computer): the whole picture, centred, never cut or blown up.
  const fill = Math.max(W / BG_W, H / BG_H);
  const fit = Math.min(W / BG_W, H / BG_H);
  const cover = fill / fit <= 1.15 ? fill : fit;
  const bgW = BG_W * cover;
  const bgH = BG_H * cover;
  const ox = (W - bgW) / 2;
  const oy = (H - bgH) / 2;
  const sideBands = ox > 1;
  const at = (x: number, y: number) => ({ left: ox + x * cover, top: oy + y * cover });

  // Layout of the centre block, scaled from the 390 × 844 design.
  const k = Math.min(W / 390, H / 844);
  const logoSize = 200 * k;
  const blockTop = H * 0.136;

  const breathe = useRef(new Animated.Value(0)).current;
  const twinkle = useRef(new Animated.Value(0)).current;
  const comet = useRef(new Animated.Value(0)).current;
  const hat = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loops = [
      Animated.loop(Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])),
      Animated.loop(Animated.sequence([
        Animated.timing(twinkle, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(twinkle, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])),
      Animated.loop(Animated.timing(comet, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: false })),
    ];
    loops.forEach((l) => l.start());
    Animated.sequence([
      Animated.delay(650),
      Animated.spring(hat, { toValue: 1, tension: 70, friction: 6, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.delay(900),
      Animated.timing(text, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    return () => loops.forEach((l) => l.stop());
  }, [breathe, twinkle, comet, hat, text]);

  // Neon ring around the logo: drawn on by glowAnim, then a bright light runs around it.
  const rx = 122 * k, ry = 96 * k;
  const perimeter = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  const ringOffset = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [perimeter, 0] });
  const cometOffset = comet.interpolate({ inputRange: [0, 1], outputRange: [perimeter, 0] });
  const svgW = rx * 2 + 30, svgH = ry * 2 + 30;

  const snow = useMemo(() => Array.from({ length: 34 }, (_, i) => {
    const r = (n: number) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
    return { left: r(1) * W, size: 2 + r(2) * 3, duration: 6000 + r(3) * 5000, delay: r(4) * 6000, opacity: 0.35 + r(5) * 0.55 };
  }), [W]);

  // Twinkles over the painted trees, ornaments and sky (picture coordinates).
  const sparkles = [[57, 655, 30], [88, 760, 7], [40, 880, 6], [150, 960, 7], [70, 1030, 6], [200, 1080, 5], [540, 990, 6], [560, 1080, 6],
    [80, 195, 9], [148, 136, 7], [505, 212, 9], [265, 28, 8], [460, 98, 8], [48, 430, 7], [550, 320, 7], [530, 700, 7]];

  return (
    <View style={styles.container}>
      <Animated.Image
        source={BG}
        resizeMode="stretch"
        style={[{ position: 'absolute', left: ox, top: oy, width: bgW, height: bgH }, { transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) }] }]}
      />
      {sideBands && (
        // Soft black fades over the picture's left and right edges (wide enough for its slow zoom).
        <>
          <LinearGradient pointerEvents="none" colors={['#000', '#000', 'rgba(0,0,0,0)']} locations={[0, 0.25, 1]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', top: 0, bottom: 0, left: ox - bgW * 0.03, width: bgW * 0.2 }} />
          <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0)', '#000', '#000']} locations={[0, 0.75, 1]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', top: 0, bottom: 0, left: ox + bgW * 0.83, width: bgW * 0.2 }} />
        </>
      )}

      {sparkles.map(([x, y, s], i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={[styles.sparkle, at(x - s, y - s), {
            width: s * 2 * cover, height: s * 2 * cover, borderRadius: s * cover,
            opacity: twinkle.interpolate({ inputRange: [0, 1], outputRange: i % 2 ? [0.15, 0.95] : [0.95, 0.15] }),
          }]}
        />
      ))}

      {snow.map((f, i) => <Snowflake key={i} {...f} height={H} />)}

      {/* Logo, neon ring and hat */}
      <Animated.View style={[styles.block, { top: blockTop, opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={{ width: svgW, height: svgH, alignItems: 'center', justifyContent: 'center' }}>
          <View style={[styles.halo, { width: logoSize * 1.4, height: logoSize * 1.4, borderRadius: logoSize * 0.7 }]} />
          <Svg width={svgW} height={svgH} style={StyleSheet.absoluteFill}>
            <G rotation={-8} origin={`${svgW / 2}, ${svgH / 2}`}>
              <Ellipse cx={svgW / 2} cy={svgH / 2} rx={rx} ry={ry} fill="none" stroke={GREEN} strokeOpacity={0.25} strokeWidth={8} />
              <AnimatedEllipse
                cx={svgW / 2} cy={svgH / 2} rx={rx} ry={ry} fill="none" stroke={GREEN} strokeWidth={2.6}
                strokeDasharray={`${perimeter} ${perimeter}`} strokeDashoffset={ringOffset}
              />
              <AnimatedEllipse
                cx={svgW / 2} cy={svgH / 2} rx={rx} ry={ry} fill="none" stroke="#EAFFD2" strokeWidth={4.5} strokeLinecap="round"
                strokeDasharray={`${perimeter * 0.2} ${perimeter * 0.8}`} strokeDashoffset={cometOffset}
                opacity={glowAnim}
              />
            </G>
          </Svg>
          <MatiLogo size={logoSize} showText={false} />
          <Animated.View
            style={[styles.hat, {
              width: 112 * k, height: 101 * k,
              left: svgW / 2 - 100 * k, top: svgH / 2 - 128 * k,
              opacity: hat.interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 1, 1] }),
              transform: [
                { translateY: hat.interpolate({ inputRange: [0, 1], outputRange: [-150 * k, 0] }) },
                { rotate: hat.interpolate({ inputRange: [0, 1], outputRange: ['35deg', '0deg'] }) },
              ],
            }]}
          >
            <SantaHat />
          </Animated.View>
        </View>

        <Animated.View style={{ alignItems: 'center', opacity: text, transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
          <Text style={[styles.brand, { fontSize: 42 * k }]}>
            MATI <Text style={styles.brandGreen}>STORE</Text>
          </Text>
          <Text style={[styles.tagline, { fontSize: 12 * k }]}>LE STORE SÉCURISÉ ET RAPIDE</Text>
        </Animated.View>

        <View style={[styles.balls, { marginTop: 22 * k }]}>
          {BALL_ICONS.map((_, i) => (
            <View key={i} style={i < BALL_COUNT - 1 ? { marginRight: BALL_GAP * 0.8 } : {}}>
              <BallSlot index={i} progress={progressAnim} neon />
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

function Snowflake({ left, size, duration, delay, opacity, height }: { left: number; size: number; duration: number; delay: number; opacity: number; height: number }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.timing(y, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }));
    const t = setTimeout(() => anim.start(), delay);
    return () => { clearTimeout(t); anim.stop(); };
  }, [y, duration, delay]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', top: -10, left, width: size, height: size, borderRadius: size / 2, backgroundColor: '#FFFFFF', opacity,
        transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, height + 20] }) }],
      }}
    />
  );
}

// Red Santa hat, tip falling to the left.
function SantaHat() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 90">
      <G transform="translate(100 0) scale(-1 1) rotate(-10 50 70)">
        <Path d="M16 68 C 20 40 36 14 62 10 C 76 8 88 16 92 30 C 84 24 74 24 68 30 C 62 38 66 54 84 68 Z" fill="#D7263D" />
        <Path d="M40 66 C 44 46 54 26 66 18 C 58 30 56 48 62 66 Z" fill="#A3172B" opacity={0.55} />
        <Path d="M62 10 C 74 9 84 15 89 24" fill="none" stroke="#FF6B7A" strokeWidth={2} strokeLinecap="round" opacity={0.6} />
        <Rect x={6} y={62} width={88} height={22} rx={11} fill="#F7F7F7" />
        <Path d="M14 70 h6 M28 75 h5 M42 69 h6 M56 75 h5 M70 70 h6 M82 75 h4" stroke="#D9DEE3" strokeWidth={3} strokeLinecap="round" />
        <Circle cx={92} cy={33} r={10} fill="#F7F7F7" />
        <Circle cx={89} cy={30} r={3.4} fill="#FFFFFF" />
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  sparkle: {
    position: 'absolute', backgroundColor: 'rgba(200,255,160,0.55)',
    shadowColor: GREEN, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
  },
  block: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  halo: { position: 'absolute', backgroundColor: 'rgba(125,255,42,0.10)' },
  hat: { position: 'absolute' },
  brand: { color: '#F4F4F4', fontWeight: '900', letterSpacing: 0.3, marginTop: 4, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  brandGreen: { color: '#6CFF1F', textShadowColor: 'rgba(125,255,42,0.65)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
  tagline: { color: '#F0F0F0', fontWeight: '700', letterSpacing: 1.6, marginTop: 10, textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  balls: { flexDirection: 'row', alignItems: 'center' },
});
