import * as SecureStore from 'expo-secure-store';

// ---------------------------------------------------------------------------
// Admin Authentication Utility
// ---------------------------------------------------------------------------

const ADMIN_SESSION_KEY = 'zurt:admin:session';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

const ADMIN_CREDENTIALS = {
  email: 'admin@zurt.com',
  // Password compared at runtime only — never logged or exposed
  pass: 'basketball@0615',
};

interface AdminSession {
  authenticatedAt: number;
  email: string;
}

export async function adminLogin(email: string, password: string): Promise<boolean> {
  const emailOk = email.trim().toLowerCase() === ADMIN_CREDENTIALS.email;
  const passOk = password.trim() === ADMIN_CREDENTIALS.pass;

  if (emailOk && passOk) {
    const session: AdminSession = {
      authenticatedAt: Date.now(),
      email: ADMIN_CREDENTIALS.email,
    };
    await SecureStore.setItemAsync(ADMIN_SESSION_KEY, JSON.stringify(session));
    return true;
  }
  return false;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const raw = await SecureStore.getItemAsync(ADMIN_SESSION_KEY);
    if (!raw) return false;
    const session: AdminSession = JSON.parse(raw);
    const elapsed = Date.now() - session.authenticatedAt;
    if (elapsed > SESSION_DURATION_MS) {
      await SecureStore.deleteItemAsync(ADMIN_SESSION_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function adminLogout(): Promise<void> {
  await SecureStore.deleteItemAsync(ADMIN_SESSION_KEY);
}
