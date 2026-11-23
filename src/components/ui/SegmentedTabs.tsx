import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Palette, Radius, Spacing, Typography } from '@/constants/theme';

export interface SegmentedTabOption<T extends string> {
  key: T;
  label: string;
}

interface SegmentedTabsProps<T extends string> {
  options: SegmentedTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  scrollable?: boolean;
}

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  scrollable = false,
}: SegmentedTabsProps<T>) {
  const renderItems = () =>
    options.map((option) => {
      const active = option.key === value;
      return (
        <Pressable
          key={option.key}
          onPress={() => onChange(option.key)}
          style={[
            styles.tab,
            !scrollable && styles.tabFlex,
            active && styles.tabActive,
          ]}>
          <Text
            numberOfLines={1}
            style={[styles.label, active && styles.labelActive]}>
            {option.label}
          </Text>
        </Pressable>
      );
    });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}>
        {renderItems()}
      </ScrollView>
    );
  }

  return <View style={styles.container}>{renderItems()}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Palette.surfaceSubtle,
    borderRadius: Radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 4,
  },
  scrollContainer: {
    flexDirection: 'row',
    backgroundColor: Palette.surfaceSubtle,
    borderRadius: Radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 4,
  },
  tab: {
    paddingVertical: 9,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabFlex: {
    flex: 1,
  },
  tabActive: {
    backgroundColor: Palette.surface,
    shadowColor: Palette.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
    ...Typography.captionBold,
    color: Palette.textSecondary,
  },
  labelActive: {
    color: Palette.primary,
  },
});
