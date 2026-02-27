// ---------------------------------------------------------------------------
// Impersonation Store — allows admin to view the app as another user
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { getToken, saveToken } from '../services/api';
import { logger } from '../utils/logger';

const ADMIN_TOKEN_BACKUP_KEY = 'zurt_admin_token_backup';

interface ImpersonatedUser {
  id: string;
  name: string;
  email: string;
}

interface ImpersonateState {
  isImpersonating: boolean;
  impersonatedUser: ImpersonatedUser | null;

  startImpersonation: (user: ImpersonatedUser, tempToken: string | null) => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

export const useImpersonateStore = create<ImpersonateState>((set) => ({
  isImpersonating: false,
  impersonatedUser: null,

  startImpersonation: async (user, tempToken) => {
    logger.log('[IMPERSONATE] Starting for:', user.email);

    // Back up admin's real token
    const currentToken = await getToken();
    if (currentToken) {
      await SecureStore.setItemAsync(ADMIN_TOKEN_BACKUP_KEY, currentToken);
    }

    // If backend provided a temp JWT, swap it in
    if (tempToken) {
      await saveToken(tempToken);
    }

    set({ isImpersonating: true, impersonatedUser: user });
  },

  stopImpersonation: async () => {
    logger.log('[IMPERSONATE] Stopping');

    // Restore admin's original token
    try {
      const backupToken = await SecureStore.getItemAsync(ADMIN_TOKEN_BACKUP_KEY);
      if (backupToken) {
        await saveToken(backupToken);
        await SecureStore.deleteItemAsync(ADMIN_TOKEN_BACKUP_KEY);
      }
    } catch (err: any) {
      logger.log('[IMPERSONATE] Error restoring token:', err?.message);
    }

    set({ isImpersonating: false, impersonatedUser: null });
  },
}));
