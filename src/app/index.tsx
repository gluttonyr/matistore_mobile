import MatiLogo from '@/components/ui/MatiLogo';
import { Colors } from '@/constants/colors';
import { UserRole } from '@/data_api/models/user.types';
import { useAuth } from '@/hooks/useAuth';
import { router } from 'expo-router';
import { JSX, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

const GREEN = '#7DFF2A';
const CIRCLE_SIZE = 36;
const BALL_COUNT = 7;
const BALL_GAP = 10;

// Chaque icône dessine UNIQUEMENT les détails du ballon (sans fond),
// sur fond vert. Le cercle vide est dessiné en dehors.
const BALL_ICONS: Array<() => JSX.Element> = [
  // Tennis
  () => (
    <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="48" fill={GREEN} />
      <Path d="M20,15 Q50,50 20,85" stroke="white" strokeWidth="8" fill="none" />
      <Path d="M80,15 Q50,50 80,85" stroke="white" strokeWidth="8" fill="none" />
    </Svg>
  ),
  // Basketball
  () => (
    <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="48" fill={GREEN} />
      <Line x1="50" y1="2" x2="50" y2="98" stroke="white" strokeWidth="5" />
      <Line x1="2" y1="50" x2="98" y2="50" stroke="white" strokeWidth="5" />
      <Path d="M22,5 Q62,50 22,95" stroke="white" strokeWidth="5" fill="none" />
      <Path d="M78,5 Q38,50 78,95" stroke="white" strokeWidth="5" fill="none" />
    </Svg>
  ),
  // Bowling
  () => (
    <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="48" fill={GREEN} />
      <Circle cx="62" cy="34" r="9" fill="white" />
      <Circle cx="76" cy="50" r="9" fill="white" />
      <Circle cx="62" cy="54" r="9" fill="white" />
    </Svg>
  ),
  // Cricket
  () => (
    <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="48" fill={GREEN} />
      <Path d="M15,50 Q50,18 85,50" stroke="white" strokeWidth="5" fill="none" strokeDasharray="7,5" />
      <Path d="M15,50 Q50,82 85,50" stroke="white" strokeWidth="5" fill="none" strokeDasharray="7,5" />
    </Svg>
  ),
  // Football/Soccer
  () => (
    <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="48" fill={GREEN} />
      <Path d="M50,18 L63,29 L58,45 L42,45 L37,29 Z" fill="white" />
      <Path d="M78,38 L88,52 L79,64 L65,60 L62,44 Z" fill="white" />
      <Path d="M22,38 L12,52 L21,64 L35,60 L38,44 Z" fill="white" />
      <Path d="M68,74 L57,82 L43,82 L32,74 L38,60 L62,60 Z" fill="white" />
    </Svg>
  ),
  // Volleyball
  () => (
    <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="48" fill={GREEN} />
      <Path d="M50,2 Q88,22 88,50" stroke="white" strokeWidth="6" fill="none" />
      <Path d="M88,50 Q88,80 50,98" stroke="white" strokeWidth="6" fill="none" />
      <Path d="M50,98 Q12,78 12,50" stroke="white" strokeWidth="6" fill="none" />
      <Path d="M12,50 Q12,20 50,2" stroke="white" strokeWidth="6" fill="none" />
      <Path d="M4,33 Q50,48 96,33" stroke="white" strokeWidth="6" fill="none" />
      <Path d="M4,67 Q50,52 96,67" stroke="white" strokeWidth="6" fill="none" />
    </Svg>
  ),
  // Rugby (ovale)
  () => (
    <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="48" fill={GREEN} />
      <Ellipse cx="50" cy="50" rx="34" ry="22" fill="white" />
      <Line x1="50" y1="28" x2="50" y2="72" stroke={GREEN} strokeWidth="3" />
      <Line x1="38" y1="42" x2="62" y2="42" stroke={GREEN} strokeWidth="3" />
      <Line x1="36" y1="50" x2="64" y2="50" stroke={GREEN} strokeWidth="3" />
      <Line x1="38" y1="58" x2="62" y2="58" stroke={GREEN} strokeWidth="3" />
    </Svg>
  ),
];

function BallSlot({ index, progress }: { index: number; progress: Animated.Value }) {
  const [filled, setFilled] = useState(false);
  const fillScale = useRef(new Animated.Value(0)).current;

  const threshold = (index + 0.95) / BALL_COUNT;

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      if (value >= threshold && !filled) {
        setFilled(true);
        Animated.spring(fillScale, {
          toValue: 1,
          tension: 80,
          friction: 6,
          useNativeDriver: true,
        }).start();
      }
    });
    return () => progress.removeListener(id);
  }, [filled]);

  const Icon = BALL_ICONS[index];

  return (
    <View style={styles.slotContainer}>
      {/* Cercle vide permanent */}
      <View style={styles.emptyCircle} />
      {/* Icône qui apparaît avec bounce */}
      <Animated.View
        style={[
          styles.ballOverlay,
          { transform: [{ scale: fillScale }] },
        ]}
        pointerEvents="none"
      >
        <Icon />
      </Animated.View>
    </View>
  );
}

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const { user, token, authReady } = useAuth();
  const [animationDone, setAnimationDone] = useState(false);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      ]),
      Animated.timing(glowAnim, { toValue: 1, duration: 600, useNativeDriver: false }),
      Animated.timing(progressAnim, { toValue: 1, duration: 2200, useNativeDriver: false }),
    ]).start(() => {
      setTimeout(() => setAnimationDone(true), 400);
    });
  }, []);

  // On attend à la fois la fin de l'animation ET la résolution réelle de la
  // session (token + validation) avant de décider où rediriger — plus de
  // délai deviné, et on route directement vers le bon espace (admin/user).
  useEffect(() => {
    if (!animationDone || !authReady) return;
    if (token && user) {
      router.replace(user.role === UserRole.ADMIN ? '/(admin)/home' : '/(tabs)/home');
    } else {
      router.replace('/(auth)/welcome');
    }
  }, [animationDone, authReady, token, user]);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <View style={styles.container}>
      <View style={styles.bgGlow} />

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Animated.View style={[styles.glowRing, { opacity: glowOpacity }]} />
        <MatiLogo size={180} showText={true} />
        <Text style={styles.tagline}>LE STORE SÉCURISÉ ET RAPIDE</Text>
      </Animated.View>

      <View style={styles.progressContainer}>
        <View style={styles.ballsRow}>
          {BALL_ICONS.map((_, i) => (
            <View key={i} style={i < BALL_COUNT - 1 ? { marginRight: BALL_GAP } : {}}>
              <BallSlot index={i} progress={progressAnim} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.darkBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(125,255,42,0.04)',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -150 }, { translateY: -200 }],
  },
  content: {
    alignItems: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(125,255,42,0.3)',
    top: -35,
    alignSelf: 'center',
  },
  tagline: {
    color: Colors.textSecondary,
    fontSize: 11,
    letterSpacing: 3,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  ballsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    borderColor: 'rgba(125,255,42,0.35)',
    position: 'absolute',
  },
  ballOverlay: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    overflow: 'hidden',
  },
});