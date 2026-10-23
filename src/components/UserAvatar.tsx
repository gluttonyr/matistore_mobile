import type { ReactNode } from 'react';
import { Image, StyleSheet, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

import { useFileUrl } from '@/hooks/useFileUrl';

// The user's profile photo when one was uploaded, otherwise `fallback` (initials, logo…), unchanged.
export function UserAvatar({
  image,
  size,
  style,
  fallback,
}: {
  image?: string | null;
  size: number;
  style?: StyleProp<ViewStyle>;
  fallback: ReactNode;
}) {
  const uri = useFileUrl('profiles', image);
  if (!uri) return <>{fallback}</>;
  return (
    <Image
      source={{ uri }}
      style={[styles.photo, { width: size, height: size, borderRadius: size / 2 }, style as StyleProp<ImageStyle>]}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({ photo: { resizeMode: 'cover' } });
