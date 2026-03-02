import { Platform } from 'react-native';
import { create } from 'zustand';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  registerPushTokenApi,
  unregisterPushTokenApi,
  updatePushPreferencesApi,
} from '../services/api';
import { logger } from '../utils/logger';

const PREFERENCES_KEY = 'zurt:push:preferences';

export interface PushPreferences {
  distribution: boolean;
  maturity: boolean;
  invoice: boolean;
  insight: boolean;
  system: boolean;
}

const DEFAULT_PREFERENCES: PushPreferences = {
  distribution: true,
  maturity: true,
  invoice: true,
  insight: true,
  system: true,
};

interface PushState {
  expoPushToken: string | null;
  permissionStatus: Notifications.PermissionStatus | null;
  preferences: PushPreferences;

  initializePush: () => Promise<void>;
  registerForPushNotifications: () => Promise<void>;
  unregisterPushToken: () => Promise<void>;
  setTypePreference: (type: keyof PushPreferences, enabled: boolean) => void;
  loadPreferences: () => Promise<void>;
}

export const usePushStore = create<PushState>((set, get) => ({
  expoPushToken: null,
  permissionStatus: null,
  preferences: DEFAULT_PREFERENCES,

  initializePush: async () => {
    logger.log('[Push] Initializing push notifications...');

    // Set foreground notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Create Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'ZURT Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1A73E8',
      });
    }

    // Load saved preferences
    await get().loadPreferences();

    // Register for push notifications
    await get().registerForPushNotifications();
  },

  registerForPushNotifications: async () => {
    logger.log('[Push] Requesting push notification permissions...');

    try {
      // Check current permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request if not determined
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      set({ permissionStatus: finalStatus });

      if (finalStatus !== 'granted') {
        logger.log('[Push] Permission not granted:', finalStatus);
        return;
      }

      // Get Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        ...(projectId ? { projectId } : {}),
      });
      const token = tokenData.data;

      logger.log('[Push] Got push token:', token.substring(0, 20) + '...');
      set({ expoPushToken: token });

      // Register with backend (fire-and-forget)
      registerPushTokenApi(token, Platform.OS);
    } catch (err: any) {
      logger.log('[Push] Registration error:', err?.message ?? err);
    }
  },

  unregisterPushToken: async () => {
    const { expoPushToken } = get();
    logger.log('[Push] Unregistering push token...');

    if (expoPushToken) {
      unregisterPushTokenApi(expoPushToken);
    }

    set({ expoPushToken: null, permissionStatus: null });
  },

  setTypePreference: (type: keyof PushPreferences, enabled: boolean) => {
    const newPreferences = { ...get().preferences, [type]: enabled };
    set({ preferences: newPreferences });

    // Persist to AsyncStorage
    AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPreferences)).catch(() => {});

    // Fire-and-forget API call
    updatePushPreferencesApi(newPreferences);
  },

  loadPreferences: async () => {
    try {
      const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({ preferences: { ...DEFAULT_PREFERENCES, ...parsed } });
      }
    } catch {
      // Use defaults
    }
  },
}));
