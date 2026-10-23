import { Calendar, MessageCircle, User, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PagerView from '@/components/PagerView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Import screens par leur chemin exact (index.tsx dans chaque dossier) ─────
import ChatsScreen from './chats/index';   // ← dossier chats/index.tsx
import EventsScreen from './events';       // ← events.tsx simple
import ForumScreen from './forum';
import HomeScreen from './home';
import ProfileScreen from './profile';
// ─────────────────────────────────────────────────────────────────────────────

import Badge from '@/components/ui/Badge';
import { Colors } from '@/constants/colors';
import { usePushNotificationRegistration } from '@/hooks/usePushNotificationRegistration';
import { useForumHasNew } from '@/hooks/useForumHasNew';
// import { useUnreadChatsCount } from '@/hooks/useUnreadChatsCount';
import { registerTabNavigator } from '@/utils/tabNavigation';

const TABS = [
  { key: 'home',    label: 'Accueil',      Icon: Users,         Screen: HomeScreen },
  { key: 'chats',   label: 'Chats',        Icon: MessageCircle, Screen: ChatsScreen },
  { key: 'events',  label: 'Événements',   Icon: Calendar,      Screen: EventsScreen },
  { key: 'forum',   label: 'Forum',        Icon: Users,         Screen: ForumScreen },
  { key: 'profile', label: 'Profil',       Icon: User,          Screen: ProfileScreen },
] as const;

interface TabIconProps {
  icon: React.ReactNode;
  focused: boolean;
  badge?: number;
  dot?: boolean;
}

function TabIcon({ icon, focused, badge = 0, dot = false }: TabIconProps) {
  return (
    <View style={styles.iconContainer}>
      {focused && <View style={styles.activePill} />}
      {icon}
      {(badge > 0 || dot) && (
        <View style={styles.badgePos}>
          <Badge count={badge} dot={dot} />
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const pagerRef = useRef<PagerView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [visitedTabs, setVisitedTabs] = useState(() => new Set([0]));
  const targetIndexRef = useRef(0);
  const insets = useSafeAreaInsets();

  usePushNotificationRegistration();

  // const { count: chatsUnread } = useUnreadChatsCount(activeIndex);
  const { hasNew: forumHasNew } = useForumHasNew(activeIndex);

  const handleTabPress = useCallback((index: number) => {
    if (targetIndexRef.current === index) return;
    targetIndexRef.current = index;
    setVisitedTabs((current) => new Set(current).add(index));
    pagerRef.current?.setPage(index);
  }, []);

  const handlePageSelected = useCallback(
    (e: { nativeEvent: { position: number } }) => {
      const index = e.nativeEvent.position;
      targetIndexRef.current = index;
      setActiveIndex(index);
      setVisitedTabs((current) => current.has(index) ? current : new Set(current).add(index));
    },
    [],
  );

  // Permet à un écran affiché dans le pager (ex: le bouton "Tout voir" de Home)
  // de changer d'onglet directement, sans passer par le routeur.
  useEffect(() => {
    registerTabNavigator((key) => {
      const index = TABS.findIndex((t) => t.key === key);
      if (index >= 0) {
        setActiveIndex(index);
        pagerRef.current?.setPage(index);
      }
    });
    return () => registerTabNavigator(null);
  }, []);

  return (
    <View style={styles.root}>
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={handlePageSelected}
        overdrag={false}
      >
        {TABS.map(({ key, Screen }, index) => (
          <View key={key} style={styles.page}>
            {visitedTabs.has(index) ? <Screen /> : null}
          </View>
        ))}
      </PagerView>

      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {TABS.map(({ key, label, Icon }, index) => {
          const focused = activeIndex === index;
          const color = focused ? Colors.primaryGreen : Colors.textSecondary;
          // const badge = key === 'chats' ? chatsUnread : 0;
          const dot = key === 'forum' && forumHasNew;
          return (
            <TouchableOpacity
              key={key}
              style={styles.tabItem}
              onPress={() => handleTabPress(index)}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              activeOpacity={0.7}
            >
              <TabIcon
                focused={focused}
                // badge={badge}
                dot={dot}
                icon={<Icon color={color} size={22} strokeWidth={focused ? 2.5 : 2} />}
              />
              <Text style={[styles.tabLabel, { color }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primaryBg ?? '#fff' },
  pager: { flex: 1 },
  page: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.secondaryBg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  iconContainer: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  activePill: {
    position: 'absolute',
    top: -8,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.primaryGreen,
  },
  badgePos: { position: 'absolute', top: -6, right: -10 },
});
