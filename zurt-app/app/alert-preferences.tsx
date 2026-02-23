import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { AppIcon, type AppIconName } from '../src/hooks/useIcon';
import { Toggle } from '../src/components/ui/Toggle';
import type { AlertPreferences, SmartAlertType } from '../src/types';

const PREFS_KEY = 'zurt:alertPreferences';

const ALERT_TYPES: Array<{
  key: SmartAlertType;
  labelKey: string;
  descKey: string;
  iconName: AppIconName;
  color: string;
}> = [
  { key: 'portfolio_drift', labelKey: 'alerts.portfolioDrift', descKey: 'alerts.portfolioDriftDesc', iconName: 'rebalance', color: '#3A86FF' },
  { key: 'dividend_received', labelKey: 'alerts.dividendReceived', descKey: 'alerts.dividendReceivedDesc', iconName: 'dividend', color: '#00D4AA' },
  { key: 'goal_milestone', labelKey: 'alerts.goalMilestone', descKey: 'alerts.goalMilestoneDesc', iconName: 'target', color: '#A855F7' },
  { key: 'tax_deadline', labelKey: 'alerts.taxDeadline', descKey: 'alerts.taxDeadlineDesc', iconName: 'calendar', color: '#FF6B6B' },
  { key: 'market_alert', labelKey: 'alerts.marketAlert', descKey: 'alerts.marketAlertDesc', iconName: 'trending', color: '#F3BA2F' },
];

const DEFAULT_PREFS: AlertPreferences = {
  portfolio_drift: true,
  dividend_received: true,
  goal_milestone: true,
  tax_deadline: true,
  market_alert: true,
};

export default function AlertPreferencesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [prefs, setPrefs] = useState<AlertPreferences>(DEFAULT_PREFS);

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY).then((raw) => {
      if (raw) {
        try { setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) }); } catch { /* ignore */ }
      }
    });
  }, []);

  const savePrefs = useCallback(async (updated: AlertPreferences) => {
    setPrefs(updated);
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(updated));
  }, []);

  const toggleType = useCallback((key: SmartAlertType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = { ...prefs, [key]: !prefs[key] };
    savePrefs(updated);
  }, [prefs, savePrefs]);

  const enableAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated: AlertPreferences = { ...prefs };
    for (const key of Object.keys(updated) as SmartAlertType[]) updated[key] = true;
    savePrefs(updated);
  }, [prefs, savePrefs]);

  const disableAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated: AlertPreferences = { ...prefs };
    for (const key of Object.keys(updated) as SmartAlertType[]) updated[key] = false;
    savePrefs(updated);
  }, [prefs, savePrefs]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/alerts');
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('alerts.preferences')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.description}>{t('alerts.preferencesDesc')}</Text>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <TouchableOpacity style={[styles.quickButton, { borderColor: colors.positive }]} onPress={enableAll}>
            <Text style={[styles.quickText, { color: colors.positive }]}>{t('alerts.enableAll')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickButton, { borderColor: colors.text.muted }]} onPress={disableAll}>
            <Text style={[styles.quickText, { color: colors.text.muted }]}>{t('alerts.disableAll')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          {ALERT_TYPES.map((type) => (
            <View key={type.key} style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: type.color + '15' }]}>
                <AppIcon name={type.iconName} size={20} color={type.color} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{t(type.labelKey)}</Text>
                <Text style={styles.rowDesc}>{t(type.descKey)}</Text>
              </View>
              <Toggle
                value={prefs[type.key]}
                onValueChange={() => toggleType(type.key)}
                accessibilityLabel={t(type.labelKey)}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.text.primary, textAlign: 'center' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: 100 },
  description: { fontSize: 14, color: colors.text.secondary, marginBottom: spacing.lg, lineHeight: 20 },
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  quickButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  quickText: { fontSize: 13, fontWeight: '600' },
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border + '50',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  rowDesc: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
});
