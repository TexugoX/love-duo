import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Palette, Radius, Spacing, Typography } from '@/constants/theme';

export type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  style?: ViewStyle;
}

export function Badge({ label, tone = 'primary', style }: BadgeProps) {
  return (
    <View style={[styles.base, styles[tone], style]}>
      <Text style={[styles.text, textStyles[tone]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  primary: {
    backgroundColor: Palette.primarySoft,
  },
  success: {
    backgroundColor: Palette.successSoft,
  },
  warning: {
    backgroundColor: Palette.warningSoft,
  },
  danger: {
    backgroundColor: Palette.dangerSoft,
  },
  neutral: {
    backgroundColor: Palette.surfaceSubtle,
  },
  text: {
    ...Typography.label,
  },
});

const textStyles = StyleSheet.create({
  primary: { color: Palette.primaryPressed },
  success: { color: Palette.success },
  warning: { color: Palette.warning },
  danger: { color: Palette.danger },
  neutral: { color: Palette.textSecondary },
});
