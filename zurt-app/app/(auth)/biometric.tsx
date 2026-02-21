import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { useAuthStore } from '../../src/stores/authStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import {
  authenticateWithBiometrics,
  checkBiometricAvailability,
} from '../../src/services/auth';

export default function BiometricScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const { t } = useSettingsStore();

  const authenticate = useCallback(async () => {
    try {
      const available = await checkBiometricAvailability();
      if (!available) {
        router.replace('/(auth)/login');
        return;
      }

      const success = await authenticateWithBiometrics();
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)');
      }
    } catch {
      // Biometric failed, stay on screen
    }
  }, [router]);

  useEffect(() => {
    authenticate();
  }, [authenticate]);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>Z</Text>
        </View>

        <Text style={styles.title}>
          {user ? `${t('greeting.morning').split(' ')[0] || 'Ol\u00E1'}, ${user.name.split(' ')[0]}` : 'ZURT'}
        </Text>

        <TouchableOpacity
          onPress={authenticate}
          style={styles.biometricButton}
          activeOpacity={0.7}
          accessibilityLabel={t('biometric.enablePrompt')}
        >
          <View style={styles.fingerprint}>
            <Text style={styles.fingerprintIcon}>{'\uD83D\uDC46'}</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.hint}>
          {t('common.loading').replace('...', '') || 'Toque para autenticar'}
        </Text>

        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
          style={styles.fallback}
        >
          <Text style={styles.fallbackText}>{t('biometric.usePassword') || 'Usar senha'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#060A0F',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.section,
  },
  biometricButton: {
    marginBottom: spacing.xl,
  },
  fingerprint: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.accent + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fingerprintIcon: {
    fontSize: 36,
  },
  hint: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.section,
  },
  fallback: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  fallbackText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '500',
  },
});
