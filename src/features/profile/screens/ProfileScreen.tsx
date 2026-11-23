import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ScreenContainer, SegmentedTabs } from '@/components/ui';
import { Palette, Spacing, Typography } from '@/constants/theme';
import { CoupleProfileTab } from '@/features/profile/components/CoupleProfileTab';
import { MyProfileTab } from '@/features/profile/components/MyProfileTab';

type ProfileSubTab = 'me' | 'couple';

export function ProfileScreen() {
  const [subTab, setSubTab] = useState<ProfileSubTab>('me');

  return (
    <ScreenContainer keyboardAvoiding>
      <View style={styles.header}>
        <Text style={styles.title}>Perfil</Text>
        <Text style={styles.subtitle}>Suas informações e as configurações do casal.</Text>
      </View>

      <View style={styles.tabsWrap}>
        <SegmentedTabs
          value={subTab}
          onChange={setSubTab}
          options={[
            { key: 'me', label: 'Meu Perfil' },
            { key: 'couple', label: 'Perfil do Casal' },
          ]}
        />
      </View>

      {subTab === 'me' ? <MyProfileTab /> : <CoupleProfileTab />}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
