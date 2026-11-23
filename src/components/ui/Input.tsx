import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { Palette, Radius, Spacing, Typography } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  prefix?: string;
  helperText?: string;
  error?: string | null;
  rightAccessory?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  prefix,
  helperText,
  error,
  rightAccessory,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          Boolean(error) && styles.fieldError,
        ]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          placeholderTextColor={Palette.textMuted}
          style={[styles.input, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {rightAccessory ? <View style={styles.accessory}>{rightAccessory}</View> : null}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    gap: 6,
  },
  label: {
    ...Typography.captionBold,
    color: Palette.text,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    borderRadius: Radius.md,
    borderWidth: 1.2,
    borderColor: Palette.border,
    backgroundColor: Palette.surface,
    paddingHorizontal: Spacing.md,
  },
  fieldFocused: {
    borderColor: Palette.primary,
    backgroundColor: '#FFFFFF',
  },
  fieldError: {
    borderColor: Palette.danger,
  },
  prefix: {
    ...Typography.bodyMedium,
    color: Palette.primary,
    marginRight: 2,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Palette.text,
    paddingVertical: Spacing.sm,
  },
  accessory: {
    marginLeft: Spacing.xs,
  },
  helperText: {
    ...Typography.caption,
    color: Palette.textSecondary,
  },
  errorText: {
    ...Typography.caption,
    color: Palette.danger,
    fontWeight: '500',
  },
});
