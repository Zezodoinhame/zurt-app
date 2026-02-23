import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAuthStore } from '../../stores/authStore';
import { authenticateWithBiometrics, hasPin } from '../../services/auth';
import { PinPad } from './PinPad';
import { AppIcon } from '../../hooks/useIcon';

interface LockOverlayProps {
  onUnlock: () => void;
}

export function LockOverlay({ onUnlock }: LockOverlayProps) {
  const insets = useSafeAreaInsets();
  const colors = useSettingsStore((s) => s.colors);
  const { t } = useSettingsStore();
  const user = useAuthStore((s) => s.user);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showPin, setShowPin] = useState(false);
  const [hasPinSetup, setHasPinSetup] = useState(false);

  useEffect(() => {
    hasPin().then(setHasPinSetup);
  }, []);

  // Auto-trigger biometric on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      handleBiometric();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleBiometric = useCallback(async () => {
    try {
      const success = await authenticateWithBiometrics();
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onUnlock();
      }
    } catch {
      // Biometric failed, user can tap again or use PIN
    }
  }, [onUnlock]);

  if (showPin) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <PinPad
          onSuccess={onUnlock}
          onForgotPin={() => setShowPin(false)}
          showBiometric
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>Z</Text>
        </View>

        <Text style={styles.title}>{t('biometric.lockTitle')}</Text>

        {user && (
          <Text style={styles.greeting}>
            {user.name.split(' ')[0]}
          </Text>
        )}

        <TouchableOpacity
          onPress={handleBiometric}
          style={styles.biometricButton}
          activeOpacity={0.7}
        >
          <View style={styles.fingerprint}>
            <AppIcon name="biometric" size={40} color={colors.accent} />
          </View>
        </TouchableOpacity>

        <Text style={styles.hint}>{t('biometric.lockSubtitle')}</Text>

        {hasPinSetup && (
          <TouchableOpacity onPress={() => setShowPin(true)} style={styles.pinFallback}>
            <AppIcon name="keypad" size={16} color={colors.accent} />
            <Text style={styles.pinFallbackText}>{t('biometric.usePin')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    zIndex: 99999,
    elevation: 99,
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
    color: colors.text.inverse,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  greeting: {
    fontSize: 16,
    color: colors.text.secondary,
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
  hint: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },
  pinFallback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  pinFallbackText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '500',
  },
});
