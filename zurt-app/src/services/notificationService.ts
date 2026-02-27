import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Storage keys for local notification preferences
// ---------------------------------------------------------------------------
const NOTIF_PREFS_KEY = '@zurt_notif_local_prefs';

export interface LocalNotifPreferences {
  syncReminder: boolean;
  weeklySummary: boolean;
  dueDates: boolean;
  marketAlerts: boolean;
}

const DEFAULT_LOCAL_PREFS: LocalNotifPreferences = {
  syncReminder: true,
  weeklySummary: true,
  dueDates: true,
  marketAlerts: true,
};

// ---------------------------------------------------------------------------
// Notification identifiers (so we can cancel specific recurring ones)
// ---------------------------------------------------------------------------
const ID_SYNC_REMINDER = 'zurt_sync_reminder';
const ID_WEEKLY_SUMMARY = 'zurt_weekly_summary';

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
export const notificationService = {
  // -- Permissions -----------------------------------------------------------
  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      logger.log('[Notifications] Must use physical device');
      return false;
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      logger.log('[Notifications] Permission not granted:', finalStatus);
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('local', {
        name: 'ZURT Local',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00D4AA',
      });
    }

    return true;
  },

  // -- Preferences -----------------------------------------------------------
  async loadPreferences(): Promise<LocalNotifPreferences> {
    try {
      const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
      if (raw) return { ...DEFAULT_LOCAL_PREFS, ...JSON.parse(raw) };
    } catch { /* use defaults */ }
    return { ...DEFAULT_LOCAL_PREFS };
  },

  async savePreferences(prefs: LocalNotifPreferences): Promise<void> {
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
  },

  // -- Card due date alert ---------------------------------------------------
  async scheduleCardDueDate(cardName: string, dueDate: Date, amount: number) {
    const prefs = await this.loadPreferences();
    if (!prefs.dueDates) return;

    const trigger = new Date(dueDate);
    trigger.setDate(trigger.getDate() - 2);
    trigger.setHours(9, 0, 0, 0);

    if (trigger <= new Date()) return; // already past

    const channelId = Platform.OS === 'android' ? 'local' : undefined;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Fatura proxima do vencimento',
        body: `${cardName}: R$ ${amount.toFixed(2).replace('.', ',')} vence em 2 dias`,
        data: { type: 'card_due', cardName },
        sound: true,
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: trigger,
        channelId,
      },
    });

    logger.log('[Notifications] Scheduled card due:', cardName, trigger.toISOString());
  },

  // -- Market alert (immediate) ----------------------------------------------
  async scheduleMarketAlert(ticker: string, changePercent: number, threshold: number) {
    const prefs = await this.loadPreferences();
    if (!prefs.marketAlerts) return;
    if (Math.abs(changePercent) < threshold) return;

    const direction = changePercent > 0 ? 'subiu' : 'caiu';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${ticker} ${direction} ${Math.abs(changePercent).toFixed(2)}%`,
        body: `${ticker} teve variacao significativa hoje`,
        data: { type: 'market_alert', ticker },
        sound: true,
      },
      trigger: null, // immediate
    });

    logger.log('[Notifications] Market alert sent:', ticker, changePercent);
  },

  // -- Sync reminder (weekly, Monday 9am) ------------------------------------
  async scheduleSyncReminder() {
    // Cancel existing first
    await Notifications.cancelScheduledNotificationAsync(ID_SYNC_REMINDER).catch(() => {});

    const prefs = await this.loadPreferences();
    if (!prefs.syncReminder) return;

    const channelId = Platform.OS === 'android' ? 'local' : undefined;

    await Notifications.scheduleNotificationAsync({
      identifier: ID_SYNC_REMINDER,
      content: {
        title: 'Sincronize seus dados',
        body: 'Faz alguns dias desde a ultima sincronizacao. Mantenha seu patrimonio atualizado!',
        data: { type: 'sync_reminder' },
        sound: true,
      },
      trigger: {
        type: SchedulableTriggerInputTypes.WEEKLY,
        weekday: 2, // Monday (1=Sun, 2=Mon, ..., 7=Sat)
        hour: 9,
        minute: 0,
        channelId,
      },
    });

    logger.log('[Notifications] Sync reminder scheduled (Mon 9am)');
  },

  // -- Weekly summary (Friday 6pm) -------------------------------------------
  async scheduleWeeklySummary() {
    await Notifications.cancelScheduledNotificationAsync(ID_WEEKLY_SUMMARY).catch(() => {});

    const prefs = await this.loadPreferences();
    if (!prefs.weeklySummary) return;

    const channelId = Platform.OS === 'android' ? 'local' : undefined;

    await Notifications.scheduleNotificationAsync({
      identifier: ID_WEEKLY_SUMMARY,
      content: {
        title: 'Resumo da semana',
        body: 'Veja como seu patrimonio se comportou esta semana',
        data: { type: 'weekly_summary' },
        sound: true,
      },
      trigger: {
        type: SchedulableTriggerInputTypes.WEEKLY,
        weekday: 6, // Friday (1=Sun, ..., 6=Fri)
        hour: 18,
        minute: 0,
        channelId,
      },
    });

    logger.log('[Notifications] Weekly summary scheduled (Fri 6pm)');
  },

  // -- Re-schedule all recurring notifications based on preferences ----------
  async rescheduleAll() {
    await this.scheduleSyncReminder();
    await this.scheduleWeeklySummary();
    logger.log('[Notifications] All recurring notifications rescheduled');
  },

  // -- Cancel all scheduled notifications ------------------------------------
  async cancelAll() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    logger.log('[Notifications] All scheduled notifications cancelled');
  },

  // -- List scheduled (debug) ------------------------------------------------
  async listScheduled() {
    const list = await Notifications.getAllScheduledNotificationsAsync();
    logger.log('[Notifications] Scheduled count:', list.length);
    return list;
  },
};
