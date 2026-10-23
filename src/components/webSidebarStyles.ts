import { StyleSheet } from 'react-native';

import { Colors } from '@/constants/colors';

// Website on a computer: the bottom tab bar becomes a left sidebar (used by the (tabs) and (admin) layouts).
export const webSidebarStyles = StyleSheet.create({
  root: { flexDirection: 'row-reverse', backgroundColor: Colors.darkBg },
  tabBar: {
    flexDirection: 'column',
    width: 220,
    paddingTop: 24,
    paddingHorizontal: 12,
    gap: 4,
    borderTopWidth: 0,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  tabItem: {
    flex: 0,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  tabItemActive: { backgroundColor: Colors.cardBg },
  tabLabel: { fontSize: 15 },
  // Tab page content: a readable width, centered next to the sidebar.
  page: { width: '100%', maxWidth: 1100, alignSelf: 'center' },
});
