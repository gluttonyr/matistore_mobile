import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

interface BadgeProps {
  count: number;
  /** Simple pastille sans nombre (ex: "il y a du nouveau" sans compteur exact). */
  dot?: boolean;
}

export default function Badge({ count, dot = false }: BadgeProps) {
  if (dot) return <View style={styles.dot} />;
  if (count === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.primaryGreen,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  text: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.primaryGreen,
    borderWidth: 1.5,
    borderColor: Colors.secondaryBg,
  },
});
