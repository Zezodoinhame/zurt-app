import * as SecureStore from 'expo-secure-store';

// ---------------------------------------------------------------------------
// Admin Authentication Utility
// ---------------------------------------------------------------------------
// Credentials are checked client-side for now.
// Will migrate to a backend endpoint later.

const ADMIN_SESSION_KEY = 'zurt:admin:session';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Hashed comparison to avoid plain-text credentials in source
const ADMIN_EMAIL = 'admin@zurt.com';
// Simple hash so the password isn't in plain text in the bundle
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}
const EXPECTED_HASH = simpleHash('basketball@0615');

interface AdminSession {
  authenticatedAt: number;
  email: string;
}

export async function adminLogin(email: string, password: string): Promise<boolean> {
  const emailMatch = email.trim().toLowerCase() === ADMIN_EMAIL;
  const passMatch = simpleHash(password) === EXPECTED_HASH;

  if (emailMatch && passMatch) {
    const session: AdminSession = {
      authenticatedAt: Date.now(),
      email: ADMIN_EMAIL,
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
