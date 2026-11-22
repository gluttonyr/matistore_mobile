import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { useRef } from 'react';
import { Animated, Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

// The pressable itself carries the style, so flex and width set by the caller
// size the button (not just its inside).
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  /** How far the button shrinks while pressed (default 0.97). */
  pressedScale?: number;
  /** Light vibration on press (default true). */
  haptic?: boolean;
};

// A button that sinks slightly under the finger and gives a light vibration.
export function PressableScale({ style, children, pressedScale = 0.97, haptic = true, onPressIn, onPressOut, onPress, ...rest }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <AnimatedPressable
      {...rest}
      style={[style, { transform: [{ scale }] }]}
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      onPressIn={(e) => {
        Animated.spring(scale, { toValue: pressedScale, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 8 }).start();
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic && Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {});
        onPress?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
