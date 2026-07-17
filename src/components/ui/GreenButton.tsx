import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';

interface GreenButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export default function GreenButton({
  title,
  onPress,
  style,
  textStyle,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
}: GreenButtonProps) {
  const sizeStyles = {
    sm: { paddingVertical: 10, paddingHorizontal: 20, fontSize: 13 },
    md: { paddingVertical: 14, paddingHorizontal: 28, fontSize: 15 },
    lg: { paddingVertical: 18, paddingHorizontal: 32, fontSize: 17 },
  };

  const currentSize = sizeStyles[size];

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        style={[
          styles.outlineBtn,
          { paddingVertical: currentSize.paddingVertical, paddingHorizontal: currentSize.paddingHorizontal },
          disabled && styles.disabled,
          style,
        ]}
        activeOpacity={0.7}
      >
        <Text style={[styles.outlineText, { fontSize: currentSize.fontSize }, textStyle]}>
          {loading ? <ActivityIndicator size="small" color={Colors.primaryGreen} /> : title}
        </Text>
      </TouchableOpacity>
    );
  }

  if (variant === 'ghost') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        style={[
          { paddingVertical: currentSize.paddingVertical, paddingHorizontal: currentSize.paddingHorizontal },
          disabled && styles.disabled,
          style,
        ]}
        activeOpacity={0.7}
      >
        <Text style={[styles.ghostText, { fontSize: currentSize.fontSize }, textStyle]}>
          {loading ? <ActivityIndicator size="small" color={Colors.primaryGreen} /> : title}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[disabled && styles.disabled, style]}
    >
      <LinearGradient
        colors={disabled ? ['#444', '#333'] : ['#7DFF2A', '#52D726']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.gradient,
          { paddingVertical: currentSize.paddingVertical, paddingHorizontal: currentSize.paddingHorizontal },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#000" />
        ) : (
          <Text style={[styles.primaryText, { fontSize: currentSize.fontSize }, textStyle]}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#000',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  outlineBtn: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: {
    color: Colors.primaryGreen,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  ghostText: {
    color: Colors.primaryGreen,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
