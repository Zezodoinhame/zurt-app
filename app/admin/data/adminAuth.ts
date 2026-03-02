import * as SecureStore from 'expo-secure-store';

// ---------------------------------------------------------------------------
// Admin Authentication — validates via backend, stores JWT in SecureStore
// ---------------------------------------------------------------------------

const ADMIN_TOKEN_KEY = 'zurt_admin_token';
const ADMIN_SESSION_KEY = 'zurt_admin_session';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours (reduced from 24)

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://zurt.com.br/api';

interface AdminSession {
  authenticatedAt: number;
  email: string;
}

/**
 * Authenticate admin via backend POST /admin/login
 * Backend validates credentials with bcrypt and returns JWT
 */
export async function adminLogin(email: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || 'Credenciais invalidas');
  }

  const data = await res.json();
  const token = data?.token;

  if (!token) {
    throw new Error('Token nao recebido do servidor');
  }

  // Store admin JWT in SecureStore (not AsyncStorage)
  await SecureStore.setItemAsync(ADMIN_TOKEN_KEY, token);

  const session: AdminSession = {
    authenticatedAt: Date.now(),
    email,
  };
  await SecureStore.setItemAsync(ADMIN_SESSION_KEY, JSON.stringify(session));
}

/**
 * Legacy wrapper — kept for backward compatibility with existing code
 * In new flow, saveAdminSession is called internally by adminLogin
 */
export async function saveAdminSession(): Promise<void> {
  // No-op: session is now saved by adminLogin()
}

export async function getAdminToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const raw = await SecureStore.getItemAsync(ADMIN_SESSION_KEY);
    if (!raw) return false;
    const session: AdminSession = JSON.parse(raw);
    const elapsed = Date.now() - session.authenticatedAt;
    if (elapsed > SESSION_DURATION_MS) {
      await adminLogout();
      return false;
    }
    // Also verify token exists
    const token = await SecureStore.getItemAsync(ADMIN_TOKEN_KEY);
    return !!token;
  } catch {
    return false;
  }
}

export async function adminLogout(): Promise<void> {
  await SecureStore.deleteItemAsync(ADMIN_TOKEN_KEY);
  await SecureStore.deleteItemAsync(ADMIN_SESSION_KEY);
}
