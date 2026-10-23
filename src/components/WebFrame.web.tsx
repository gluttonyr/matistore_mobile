import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Colors } from '@/constants/colors';

const WIDE_FROM = 768;
const COLUMN_WIDTH = 480;

// Phones and narrow windows: full width, exactly like the app. Wider screens: the app in a centered column.
export function WebFrame({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  if (width < WIDE_FROM) return <>{children}</>;
  return (
    <View style={styles.page}>
      <View style={styles.column}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', backgroundColor: '#000' },
  column: {
    flex: 1,
    width: COLUMN_WIDTH,
    backgroundColor: Colors.darkBg,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
});
