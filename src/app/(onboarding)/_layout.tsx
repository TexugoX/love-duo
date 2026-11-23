import { Stack } from 'expo-router';
import React from 'react';

import { Palette } from '@/constants/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Palette.background },
      }}>
      <Stack.Screen name="connect-couple" />
    </Stack>
  );
}
