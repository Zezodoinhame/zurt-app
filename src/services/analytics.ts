import AsyncStorage from '@react-native-async-storage/async-storage';
import { isDemoMode, getToken } from './api';
import { logger } from '../utils/logger';

const QUEUE_KEY = 'zurt:analytics:queue';
const OPT_OUT_KEY = 'zurt:analytics:optOut';
const FLUSH_INTERVAL = 30000; // 30s
const MAX_BATCH_SIZE = 20;
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://zurt.com.br/api';

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: string;
}

let queue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let optedOut = false;

export async function initAnalytics(): Promise<void> {
  // Load opt-out preference
  const optOutVal = await AsyncStorage.getItem(OPT_OUT_KEY);
  optedOut = optOutVal === 'true';

  // Load persisted queue
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (raw) {
    try { queue = JSON.parse(raw); } catch { queue = []; }
  }

  // Start auto-flush timer
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = setInterval(() => { flush(); }, FLUSH_INTERVAL);
}

export function trackEvent(name: string, properties?: Record<string, any>): void {
  if (optedOut) return;

  const event: AnalyticsEvent = {
    name,
    properties,
    timestamp: new Date().toISOString(),
  };

  if (isDemoMode()) {
    logger.log('[Analytics] (demo)', name, properties ?? '');
    return;
  }

  queue.push(event);
  AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue)).catch(() => {});

  if (queue.length >= MAX_BATCH_SIZE) {
    flush();
  }
}

export function trackScreenView(screenName: string): void {
  trackEvent('screen_view', { screen: screenName });
}

export async function flush(): Promise<void> {
  if (queue.length === 0 || optedOut || isDemoMode()) return;

  const batch = queue.splice(0, MAX_BATCH_SIZE);

  try {
    const token = await getToken();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    await fetch(`${API_BASE}/api/analytics/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ events: batch }),
    });

    // Persist remaining queue
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Put events back on failure
    queue.unshift(...batch);
  }
}

export async function setAnalyticsOptOut(value: boolean): Promise<void> {
  optedOut = value;
  await AsyncStorage.setItem(OPT_OUT_KEY, value ? 'true' : 'false');
  if (value) {
    queue = [];
    await AsyncStorage.removeItem(QUEUE_KEY);
  }
}

export async function getAnalyticsOptOut(): Promise<boolean> {
  const val = await AsyncStorage.getItem(OPT_OUT_KEY);
  return val === 'true';
}

export function startSession(): void {
  trackEvent('session_start');
}

export function stopAnalytics(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  flush();
}
