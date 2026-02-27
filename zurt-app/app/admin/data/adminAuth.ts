import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Admin Authentication Utility
// ---------------------------------------------------------------------------

const ADMIN_SESSION_KEY = 'zurt_admin_session';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface AdminSession {
  authenticatedAt: number;
}

export async function saveAdminSession(): Promise<void> {
  const session: AdminSession = { authenticatedAt: Date.now() };
  await AsyncStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
}

export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return false;
    const session: AdminSession = JSON.parse(raw);
    const elapsed = Date.now() - session.authenticatedAt;
    if (elapsed > SESSION_DURATION_MS) {
      await AsyncStorage.removeItem(ADMIN_SESSION_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function adminLogout(): Promise<void> {
  await AsyncStorage.removeItem(ADMIN_SESSION_KEY);
}
