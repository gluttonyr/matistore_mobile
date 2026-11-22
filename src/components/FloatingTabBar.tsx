import Badge from '@/components/ui/Badge';
import { Colors } from '@/constants/colors';
import type { LucideIcon } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SnowCap } from '@/components/christmas/Christmas';

export type FloatingTab = { key: string; label: string; Icon: LucideIcon };

type Props = {
  tabs: readonly FloatingTab[];
  activeIndex: number;
  onPress: (index: number) => void;
  /** Unread count or "something new" dot, by tab key. */
  badges?: Record<string, { count?: number; dot?: boolean }>;
};

// Phone tab bar: a floating pill. The selected tab widens into a green pill
// showing its label; the others show their icon only.
export function FloatingTabBar({ tabs, activeIndex, onPress, badges = {} }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={s.bar}>
        <SnowCap variant={2} height={16} style={{ left: 28, right: 28 }} />
        {tabs.map((tab, index) => (
          <TabItem
            key={tab.key}
            tab={tab}
            focused={activeIndex === index}
            onPress={() => onPress(index)}
            count={badges[tab.key]?.count ?? 0}
            dot={!!badges[tab.key]?.dot}
          />
        ))}
      </View>
    </View>
  );
}

function TabItem({ tab, focused, onPress, count, dot }: { tab: FloatingTab; focused: boolean; onPress: () => void; count: number; dot: boolean }) {
  const active = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(active, { toValue: focused ? 1 : 0, useNativeDriver: false, friction: 9, tension: 90 }).start();
  }, [focused, active]);

  const { Icon, label } = tab;
  const flexGrow = active.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const backgroundColor = active.interpolate({ inputRange: [0, 1], outputRange: ['rgba(125,255,42,0)', 'rgba(125,255,42,1)'] });
  const labelOpacity = active.interpolate({ inputRange: [0, .6, 1], outputRange: [0, 0, 1] });
  const labelWidth = active.interpolate({ inputRange: [0, 1], outputRange: [0, 90] });

  return (
    <Animated.View style={[s.slot, { flexGrow }]}>
      <Pressable
        style={s.press}
        onPress={onPress}
        onPressIn={() => Animated.spring(press, { toValue: .92, useNativeDriver: false, speed: 40 }).start()}
        onPressOut={() => Animated.spring(press, { toValue: 1, useNativeDriver: false, speed: 20, bounciness: 8 }).start()}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={count ? `${label}, ${count} non lus` : label}
      >
        <Animated.View style={[s.item, { backgroundColor, transform: [{ scale: press }] }]}>
          <View>
            <Icon color={focused ? '#050505' : Colors.textSecondary} size={21} strokeWidth={focused ? 2.5 : 2} />
            {(count > 0 || dot) && !focused && (
              <View style={s.badge}><Badge count={count} dot={dot} /></View>
            )}
          </View>
          <Animated.Text numberOfLines={1} style={[s.label, { opacity: labelOpacity, maxWidth: labelWidth }]}>{label}</Animated.Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 14, paddingTop: 6, backgroundColor: Colors.darkBg },
  bar: {
    flexDirection: 'row',
    height: 64,
    paddingHorizontal: 6,
    borderRadius: 32,
    backgroundColor: 'rgba(20,20,20,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  // Each slot fills the bar's height and centres its pill, so the green pill
  // sits at the same distance from the top and the bottom.
  slot: { flexShrink: 1, flexBasis: 0, alignSelf: 'stretch', justifyContent: 'center' },
  press: {},
  item: {
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  label: { color: '#050505', fontSize: 12.5, fontWeight: '800' },
  badge: { position: 'absolute', top: -6, right: -10 },
});
