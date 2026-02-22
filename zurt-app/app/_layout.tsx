import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../src/stores/authStore';
import { useSettingsStore } from '../src/stores/settingsStore';
import { logger } from '../src/utils/logger';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const colors = useSettingsStore((s) => s.colors);
  const isDark = useSettingsStore((s) => s.isDark);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    logger.log('[ZURT App] RootLayout mounted, restoring session...');
    (async () => {
      try {
        await Promise.all([restoreSession(), loadSettings()]);
      } catch (err: any) {
        logger.log('[ZURT App] restoreSession error:', err?.message ?? err);
      } finally {
        logger.log('[ZURT App] Ready! Showing app.');
        setReady(true);
        SplashScreen.hideAsync();
      }
    })();
  }, []);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="onboarding"
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="connect-bank"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="asset-detail"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="report"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="family"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="taxes"
            options={{ animation: 'slide_from_right' }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
