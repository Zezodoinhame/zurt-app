import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { useSettingsStore } from '../../stores/settingsStore';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message,
  onRetry,
}: ErrorStateProps) {
  const t = useSettingsStore((s) => s.t);

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>!</Text>
      <Text style={styles.message}>{message || t('common.error')}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.7}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.xl,
  },
  icon: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.negative,
    width: 56,
    height: 56,
    lineHeight: 56,
    textAlign: 'center',
    backgroundColor: colors.negative + '15',
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  message: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background,
  },
});
