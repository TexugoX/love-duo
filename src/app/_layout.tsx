import { Stack, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Palette } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/features/auth/context/AuthContext';

void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { isLoading, isAuthenticated, needsUsername, hasActiveCouple } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync();
    }
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;

    const [firstSegment, secondSegment] = segments as string[];

    if (!isAuthenticated) {
      const isPublicAuthRoute =
        firstSegment === '(auth)' &&
        (secondSegment === 'login' || secondSegment === 'register');

      if (!isPublicAuthRoute) {
        router.replace('/(auth)/login');
      }
      return;
    }

    if (needsUsername) {
      if (!(firstSegment === '(auth)' && secondSegment === 'complete-profile')) {
        router.replace('/(auth)/complete-profile');
      }
      return;
    }

    if (!hasActiveCouple) {
      if (firstSegment !== '(onboarding)') {
        router.replace('/(onboarding)/connect-couple');
      }
      return;
    }

    if (firstSegment !== '(tabs)') {
      router.replace('/(tabs)');
    }
  }, [hasActiveCouple, isAuthenticated, isLoading, needsUsername, segments]);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Palette.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Palette.background },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.background,
  },
});
