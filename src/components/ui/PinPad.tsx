import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../../stores/settingsStore';
import { type ThemeColors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { AppIcon } from '../../hooks/useIcon';
import { verifyPin } from '../../services/auth';
import { authenticateWithBiometrics } from '../../services/auth';

interface PinPadProps {
  onSuccess: () => void;
  onForgotPin?: () => void;
  showBiometric?: boolean;
}

export function PinPad({ onSuccess, onForgotPin, showBiometric = true }: PinPadProps) {
  const colors = useSettingsStore((s) => s.colors);
  const { t } = useSettingsStore();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handlePress = useCallback(async (digit: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError('');
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === 4) {
      const valid = await verifyPin(newPin);
      if (valid) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        shake();
        setError(t('biometric.wrongPin'));
        setPin('');
      }
    }
  }, [pin, onSuccess, shake, t]);

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin((p) => p.slice(0, -1));
    setError('');
  }, []);

  const handleBiometric = useCallback(async () => {
    try {
      const success = await authenticateWithBiometrics();
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess();
      }
    } catch { /* ignore */ }
  }, [onSuccess]);

  const dots = Array.from({ length: 4 }, (_, i) => (
    <View
      key={i}
      style={[styles.dot, i < pin.length && { backgroundColor: colors.accent }]}
    />
  ));

  const buttons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [showBiometric ? 'bio' : '', '0', 'del'],
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('biometric.enterPin')}</Text>

      <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
        {dots}
      </Animated.View>

      {error ? <Text style={styles.error}>{error}</Text> : <View style={styles.errorPlaceholder} />}

      <View style={styles.grid}>
        {buttons.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((key) => {
              if (key === '') return <View key="empty" style={styles.button} />;
              if (key === 'bio') {
                return (
                  <TouchableOpacity key="bio" style={styles.button} onPress={handleBiometric}>
                    <AppIcon name="biometric" size={28} color={colors.accent} />
                  </TouchableOpacity>
                );
              }
              if (key === 'del') {
                return (
                  <TouchableOpacity key="del" style={styles.button} onPress={handleDelete}>
                    <AppIcon name="back" size={24} color={colors.text.secondary} />
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity key={key} style={styles.button} onPress={() => handlePress(key)}>
                  <Text style={styles.buttonText}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {onForgotPin && (
        <TouchableOpacity onPress={onForgotPin} style={styles.forgotPin}>
          <Text style={styles.forgotPinText}>{t('biometric.forgotPin')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xl,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: 'transparent',
  },
  error: {
    color: colors.negative,
    fontSize: 13,
    marginBottom: spacing.lg,
    height: 18,
  },
  errorPlaceholder: {
    height: 18,
    marginBottom: spacing.lg,
  },
  grid: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    fontSize: 28,
    fontWeight: '500',
    color: colors.text.primary,
  },
  forgotPin: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
  forgotPinText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '500',
  },
});
