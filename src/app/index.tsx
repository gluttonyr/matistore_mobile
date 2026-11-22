import MatiLogo from '@/components/ui/MatiLogo';
import { Colors } from '@/constants/colors';
import { UserRole } from '@/data_api/models/user.types';
import { useAuth } from '@/hooks/useAuth';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

import { BALL_COUNT, BALL_GAP, BALL_ICONS, BallSlot, CIRCLE_SIZE } from '@/components/splash/sportBalls';
import { ChristmasSplash } from '@/components/splash/ChristmasSplash';
import { useChristmasTheme } from '@/components/christmas/Christmas';

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const { user, token, authReady } = useAuth();
  const [animationDone, setAnimationDone] = useState(false);
  const christmasTheme = useChristmasTheme();
  // Chosen once, so the splash never switches in the middle of its animation.
  const christmasSplash = useRef<boolean | null>(null);
  if (christmasSplash.current === null && christmasTheme.settled) christmasSplash.current = christmasTheme.on;

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
      router.replace(user.role === UserRole.ADMIN ? '/(admin)/admin-home' : '/(tabs)/home');
    } else {
      router.replace('/(auth)/welcome');
    }
  }, [animationDone, authReady, token, user]);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  // Until the theme is known (a few ms from the kept value), keep the dark background: both splashes fade in from it.
  if (christmasSplash.current === null) return <View style={styles.container} />;

  // THEME_NOEL = 1 on the server: the Christmas splash replaces the usual one.
  if (christmasSplash.current) {
    return <ChristmasSplash fadeAnim={fadeAnim} scaleAnim={scaleAnim} glowAnim={glowAnim} progressAnim={progressAnim} />;
  }

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