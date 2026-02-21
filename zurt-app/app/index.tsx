import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../src/stores/authStore';

const ONBOARDING_KEY = '@zurt:onboarding_done';

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  const [biometricEnabled, setBiometricEnabled] = useState<boolean | null>(null);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    // Check onboarding status
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setOnboardingDone(val === 'true');
    });

    if (isAuthenticated && !isDemoMode) {
      AsyncStorage.getItem('biometric_enabled').then((val) => {
        setBiometricEnabled(val === 'true');
      });
    } else {
      setBiometricEnabled(false);
    }
  }, [isAuthenticated, isDemoMode]);

  // Wait for checks
  if (onboardingDone === null) return null;
  if (isAuthenticated && biometricEnabled === null) return null;

  // Show onboarding if not done yet and not authenticated
  if (!onboardingDone && !isAuthenticated) {
    return <Redirect href="/onboarding" />;
  }

  if (isAuthenticated) {
    // If biometric is enabled for real users, go to biometric screen first
    if (biometricEnabled && !isDemoMode) {
      return <Redirect href="/(auth)/biometric" />;
    }
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
