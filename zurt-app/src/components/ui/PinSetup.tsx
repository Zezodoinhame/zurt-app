import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../../stores/settingsStore';
import { type ThemeColors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { savePin } from '../../services/auth';
import { AppIcon } from '../../hooks/useIcon';

interface PinSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function PinSetup({ onComplete, onCancel }: PinSetupProps) {
  const colors = useSettingsStore((s) => s.colors);
  const { t } = useSettingsStore();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [firstPin, setFirstPin] = useState('');
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
      if (step === 'enter') {
        setFirstPin(newPin);
        setStep('confirm');
        setPin('');
      } else {
        if (newPin === firstPin) {
          await savePin(newPin);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onComplete();
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          shake();
          setError(t('biometric.pinMismatch'));
          setPin('');
          setStep('enter');
          setFirstPin('');
        }
      }
    }
  }, [pin, step, firstPin, onComplete, shake, t]);

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin((p) => p.slice(0, -1));
    setError('');
  }, []);

  const title = step === 'enter' ? t('biometric.setupPin') : t('biometric.confirmPin');

  const dots = Array.from({ length: 4 }, (_, i) => (
    <View key={i} style={[styles.dot, i < pin.length && { backgroundColor: colors.accent }]} />
  ));

  const buttons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'del'],
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
        {dots}
      </Animated.View>

      {error ? <Text style={styles.error}>{error}</Text> : <View style={styles.errorPlaceholder} />}

      <View style={styles.grid}>
        {buttons.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((key) => {
              if (key === '') return <View key="empty" style={styles.button} />;
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

      <TouchableOpacity onPress={onCancel} style={styles.cancel}>
        <Text style={styles.cancelText}>{t('common.cancel')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontSize: 18, fontWeight: '600', color: colors.text.primary, marginBottom: 24 },
  dotsRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.accent, backgroundColor: 'transparent' },
  error: { color: colors.negative, fontSize: 13, marginBottom: 16, height: 18 },
  errorPlaceholder: { height: 18, marginBottom: 16 },
  grid: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  button: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  buttonText: { fontSize: 28, fontWeight: '500', color: colors.text.primary },
  cancel: { marginTop: 24, paddingVertical: 12 },
  cancelText: { fontSize: 14, color: colors.text.secondary },
});
