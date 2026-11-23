import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SegmentedTabs } from '@/components/ui';
import { Palette, Spacing, Typography } from '@/constants/theme';
import { DengoTab } from '@/features/tasks/components/DengoTab';
import { HouseholdTasksTab } from '@/features/tasks/components/HouseholdTasksTab';

type TasksSubTab = 'house' | 'dengo';

export function TasksScreen() {
  const [subTab, setSubTab] = useState<TasksSubTab>('house');
  const [scrollEnabled, setScrollEnabled] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          scrollEnabled={scrollEnabled}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Tarefas</Text>
            <Text style={styles.subtitle}>Rotinas da casa e carinho na rotina do casal.</Text>
          </View>

          <View style={styles.tabsWrap}>
            <SegmentedTabs
              value={subTab}
              onChange={setSubTab}
              options={[
                { key: 'house', label: 'Rotinas de Casa' },
                { key: 'dengo', label: 'Relação (Dengo)' },
              ]}
            />
          </View>

          {subTab === 'house' ? (
            <HouseholdTasksTab />
          ) : (
            <DengoTab onDrawingStateChange={(drawing) => setScrollEnabled(!drawing)} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h1,
    color: Palette.text,
  },
  subtitle: {
    ...Typography.body,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  tabsWrap: {
    marginBottom: Spacing.lg,
  },
});
