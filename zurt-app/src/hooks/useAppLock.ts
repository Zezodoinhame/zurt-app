import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_STORAGE_KEY = 'biometric_enabled';
const LOCK_THRESHOLD_MS = 5000; // 5 seconds

export function useAppLock() {
  const [isLocked, setIsLocked] = useState(false);
  const backgroundTime = useRef<number | null>(null);
  const biometricEnabled = useRef(false);

  useEffect(() => {
    // Check biometric preference on mount
    AsyncStorage.getItem(BIOMETRIC_STORAGE_KEY).then((val) => {
      biometricEnabled.current = val === 'true';
    });
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTime.current = Date.now();
      } else if (nextState === 'active') {
        if (
          biometricEnabled.current &&
          backgroundTime.current &&
          Date.now() - backgroundTime.current > LOCK_THRESHOLD_MS
        ) {
          setIsLocked(true);
        }
        backgroundTime.current = null;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Re-check biometric preference periodically (when it changes in profile)
  useEffect(() => {
    const interval = setInterval(() => {
      AsyncStorage.getItem(BIOMETRIC_STORAGE_KEY).then((val) => {
        biometricEnabled.current = val === 'true';
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const unlock = useCallback(() => {
    setIsLocked(false);
  }, []);

  return { isLocked, unlock };
}
