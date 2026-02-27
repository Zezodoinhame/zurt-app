import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../src/stores/authStore';
import { useSettingsStore } from '../src/stores/settingsStore';
import { usePushStore } from '../src/stores/pushStore';
import { useNotificationStore } from '../src/stores/notificationStore';
import { useNetworkStore } from '../src/stores/networkStore';
import { usePlanStore } from '../src/stores/planStore';
import { ONBOARDING_KEY } from './onboarding';
import { logger } from '../src/utils/logger';
import { initAnalytics, startSession, stopAnalytics } from '../src/services/analytics';
import { notificationService } from '../src/services/notificationService';
import { useAppLock } from '../src/hooks/useAppLock';
import { RateLimitToast } from '../src/components/ui/RateLimitToast';
import { OfflineBanner } from '../src/components/ui/OfflineBanner';
import { ImpersonateBanner } from '../src/components/ui/ImpersonateBanner';
import { LockOverlay } from '../src/components/ui/LockOverlay';

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
  const initNetworkListener = useNetworkStore((s) => s.initNetworkListener);
  const loadSubscription = usePlanStore((s) => s.loadSubscription);
  const { isLocked, unlock } = useAppLock();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    logger.log('[ZURT App] RootLayout mounted, restoring session...');
    let unsubNetwork: (() => void) | null = null;
    (async () => {
      try {
        const [, , onboardingVal] = await Promise.all([
          restoreSession(),
          loadSettings(),
          AsyncStorage.getItem(ONBOARDING_KEY),
        ]);
        setOnboardingDone(onboardingVal === 'true');

        // Initialize network listener
        unsubNetwork = initNetworkListener();

        // Initialize analytics
        await initAnalytics();
        startSession();
      } catch (err: any) {
        logger.log('[ZURT App] restoreSession error:', err?.message ?? err);
        setOnboardingDone(true); // Skip onboarding on error
      } finally {
        logger.log('[ZURT App] Ready! Showing app.');
        setReady(true);
        SplashScreen.hideAsync();
      }
    })();

    return () => {
      if (unsubNetwork) unsubNetwork();
      stopAnalytics();
    };
  }, []);

  // Route to onboarding if not completed
  useEffect(() => {
    if (!ready || onboardingDone === null) return;
    if (!onboardingDone) {
      router.replace('/onboarding');
    }
  }, [ready, onboardingDone]);

  // Initialize push notifications & load subscription when authenticated
  useEffect(() => {
    if (ready && isAuthenticated) {
      loadSubscription();
      if (!isDemoMode) {
        initializePush().catch((err: any) => {
          logger.log('[ZURT App] Push init error:', err?.message ?? err);
        });
      }
      // Schedule local recurring notifications
      notificationService.requestPermissions().then((granted) => {
        if (granted) {
          notificationService.rescheduleAll();
        }
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
      } else if (type === 'market_alert' && data.ticker) {
        router.push(`/market/${data.ticker}`);
      } else if (type === 'card_due') {
        router.push('/(tabs)/cards');
      } else if (type === 'sync_reminder') {
        router.push('/(tabs)');
      } else if (type === 'weekly_summary') {
        router.push('/(tabs)/wallet');
      }
    });

    return () => subscription.remove();
  }, [markAsRead, router]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
        <OfflineBanner />
        <ImpersonateBanner />
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
            name="market"
            options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: true, gestureDirection: 'vertical' }}
          />
          <Stack.Screen
            name="plans"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="connect-bank"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="asset-detail"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="report"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="family"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="taxes"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="goals"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="simulator"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="rebalance"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="tax-dashboard"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="risk-metrics"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="badges"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="alert-preferences"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="consultant"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="news"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="dividends"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="comparison"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="budget"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="cash-flow"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="spending-insights"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="bills"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="correlation-matrix"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="backtest"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="scenario-planner"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="price-alerts"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="net-worth"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="debt-manager"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="retirement"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="learn"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="crypto"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="subscriptions"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="real-estate"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="savings-challenges"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="fire"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="diary"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="compound"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="currency-converter"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="emergency-fund"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="financial-calendar"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
        </Stack>
        <RateLimitToast />
        {isLocked && isAuthenticated && <LockOverlay onUnlock={unlock} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
