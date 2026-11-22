import { JSX, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path } from 'react-native-svg';

// The 7 sport balls of the splash loader, shared by the usual and the Christmas splash.
const GREEN = '#7DFF2A';
export const CIRCLE_SIZE = 36;
export const BALL_COUNT = 7;
export const BALL_GAP = 10;

// Chaque icône dessine UNIQUEMENT les détails du ballon (sans fond),
// sur fond vert. Le cercle vide est dessiné en dehors.
export const BALL_ICONS: Array<() => JSX.Element> = [
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

export function BallSlot({ index, progress, neon = false }: { index: number; progress: Animated.Value; neon?: boolean }) {
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
      <View style={[styles.emptyCircle, neon && styles.emptyCircleNeon]} />
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

const styles = StyleSheet.create({
  slotContainer: { width: CIRCLE_SIZE, height: CIRCLE_SIZE, alignItems: 'center', justifyContent: 'center' },
  emptyCircle: {
    width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2, borderColor: 'rgba(125,255,42,0.35)', position: 'absolute',
  },
  // Christmas splash: bright neon ring with a soft green halo.
  emptyCircleNeon: {
    borderColor: GREEN, backgroundColor: 'rgba(0,0,0,0.45)',
    shadowColor: GREEN, shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 6,
  },
  ballOverlay: { position: 'absolute', width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2, overflow: 'hidden' },
});
