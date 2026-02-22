import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../src/stores/authStore';
import { useSettingsStore } from '../src/stores/settingsStore';
import { usePushStore } from '../src/stores/pushStore';
import { useNotificationStore } from '../src/stores/notificationStore';
import { logger } from '../src/utils/logger';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const colors = useSettingsStore((s) => s.colors);
  const isDark = useSettingsStore((s) => s.isDark);
  const initializePush = usePushStore((s) => s.initializePush);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const router = useRouter();
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

  // Initialize push notifications when authenticated
  useEffect(() => {
    if (ready && isAuthenticated && !isDemoMode) {
      initializePush().catch((err: any) => {
        logger.log('[ZURT App] Push init error:', err?.message ?? err);
      });
    }
  }, [ready, isAuthenticated, isDemoMode]);

  // Deep link on notification tap
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, any> | undefined;
      if (!data) return;

      logger.log('[ZURT App] Notification tapped, data:', JSON.stringify(data));

      // Mark as read if notificationId provided
      if (data.notificationId) {
        markAsRead(String(data.notificationId));
      }

      // Route based on notification type
      const type = data.type as string | undefined;
      if (type === 'insight') {
        router.push('/(tabs)/agent');
      } else if (type === 'distribution' || type === 'maturity' || type === 'invoice' || type === 'system') {
        router.push('/(tabs)/alerts');
      }
    });

    return () => subscription.remove();
  }, [markAsRead, router]);

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
