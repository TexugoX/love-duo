import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { CardShadow, Palette, Radius, Spacing } from '@/constants/theme';

interface CardProps extends ViewProps {
  variant?: 'default' | 'subtle' | 'accent';
  padded?: boolean;
}

export function Card({
  variant = 'default',
  padded = true,
  style,
  children,
  ...rest
}: CardProps) {
  return (
    <View
      style={[
        styles.base,
        variant === 'default' && styles.default,
        variant === 'subtle' && styles.subtle,
        variant === 'accent' && styles.accent,
        padded && styles.padded,
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  default: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    ...CardShadow,
  },
  subtle: {
    backgroundColor: Palette.surfaceSubtle,
    borderColor: Palette.border,
  },
  accent: {
    backgroundColor: Palette.surfaceAccent,
    borderColor: Palette.primarySoft,
  },
  padded: {
    padding: Spacing.lg,
  },
});
