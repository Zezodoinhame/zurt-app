import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useFinancialCalendarStore } from '../src/stores/financialCalendarStore';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { AppIcon } from '../src/hooks/useIcon';
import { formatCurrency, maskValue } from '../src/utils/formatters';
import type { FinancialEventType, FinancialEvent } from '../src/types';

const EVENT_ICONS: Record<FinancialEventType, string> = {
  dividend: '\u{1F4B8}',
  bill: '\u{1F9FE}',
  tax_deadline: '\u{1F4CB}',
  goal_deadline: '\u{1F3AF}',
  custom: '\u{2728}',
};

const EVENT_VARIANTS: Record<FinancialEventType, 'positive' | 'negative' | 'warning' | 'info' | 'neutral'> = {
  dividend: 'positive',
  bill: 'negative',
  tax_deadline: 'warning',
  goal_deadline: 'info',
  custom: 'neutral',
};

const ALL_TYPES: FinancialEventType[] = ['dividend', 'bill', 'tax_deadline', 'goal_deadline', 'custom'];

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function FinancialCalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, currency } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const { valuesHidden } = useAuthStore();
  const { selectedMonth, setMonth, getEventsForMonth, getMonthlyIncome, getMonthlyExpenses, getAvailableMonths, addEvent, loadEvents } = useFinancialCalendarStore();

  useEffect(() => { loadEvents(); }, []);
  const [showSheet, setShowSheet] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState<FinancialEventType>('custom');
  const [newDay, setNewDay] = useState('15');

  const styles = useMemo(() => createStyles(colors), [colors]);
  const events = getEventsForMonth();
  const income = getMonthlyIncome();
  const expenses = getMonthlyExpenses();
  const months = getAvailableMonths();

  const displayVal = useCallback(
    (v: number) => (valuesHidden ? maskValue('', currency) : formatCurrency(v, currency)),
    [valuesHidden, currency],
  );

  const typeLabel = useCallback((type: FinancialEventType) => {
    const map: Record<FinancialEventType, string> = {
      dividend: t('calendar.dividend'),
      bill: t('calendar.bill'),
      tax_deadline: t('calendar.taxDeadline'),
      goal_deadline: t('calendar.goalDeadline'),
      custom: t('calendar.custom'),
    };
    return map[type];
  }, [t]);

  const formatMonthLabel = (m: string) => {
    const [y, mo] = m.split('-');
    return `${MONTH_NAMES[parseInt(mo, 10) - 1]} ${y}`;
  };

  const formatDay = (d: string) => {
    return d.split('-')[2] || d.substring(8, 10);
  };

  // Group events by date
  const grouped = useMemo(() => {
    const map = new Map<string, FinancialEvent[]>();
    events.forEach((e) => {
      const key = e.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return Array.from(map.entries());
  }, [events]);

  const handleAdd = useCallback(() => {
    if (!newTitle.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const colorMap: Record<FinancialEventType, string> = {
      dividend: '#00D4AA',
      bill: '#FF6B6B',
      tax_deadline: '#FFB347',
      goal_deadline: '#3A86FF',
      custom: '#A855F7',
    };
    addEvent({
      title: newTitle.trim(),
      date: `${selectedMonth}-${newDay.padStart(2, '0')}`,
      amount: parseFloat(newAmount.replace(/[^0-9.]/g, '')) || 0,
      type: newType,
      color: colorMap[newType],
    });
    setNewTitle(''); setNewAmount(''); setNewType('custom'); setNewDay('15');
    setShowSheet(false);
  }, [newTitle, newAmount, newType, newDay, selectedMonth, addEvent]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('calendar.title')}</Text>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowSheet(true); }}>
          <AppIcon name="add" size={24} color={accentColor} />
        </TouchableOpacity>
      </View>

      {/* Month Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthRow}>
        {months.map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.monthPill, selectedMonth === m && { backgroundColor: accentColor, borderColor: accentColor }]}
            onPress={() => { Haptics.selectionAsync(); setMonth(m); }}
          >
            <Text style={[styles.monthText, selectedMonth === m && { color: '#FFF' }]}>{formatMonthLabel(m)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <Card variant="glow">
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('calendar.income')}</Text>
              <Text style={[styles.summaryValue, { color: colors.positive }]}>{displayVal(income)}</Text>
            </View>
            <View style={styles.summarySep} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('calendar.expense')}</Text>
              <Text style={[styles.summaryValue, { color: colors.negative }]}>{displayVal(expenses)}</Text>
            </View>
          </View>
        </Card>

        {/* Event List */}
        {grouped.length === 0 ? (
          <Card><Text style={styles.emptyText}>{t('calendar.noEvents')}</Text></Card>
        ) : (
          grouped.map(([date, evts]) => (
            <View key={date}>
              <Text style={styles.dateHeader}>{formatDay(date)}</Text>
              {evts.map((evt) => (
                <Card key={evt.id}>
                  <View style={styles.eventRow}>
                    <View style={[styles.eventBorder, { backgroundColor: evt.color }]} />
                    <Text style={styles.eventIcon}>{EVENT_ICONS[evt.type]}</Text>
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventTitle} numberOfLines={1}>{evt.title}</Text>
                      {evt.amount > 0 && <Text style={styles.eventAmount}>{displayVal(evt.amount)}</Text>}
                    </View>
                    <Badge variant={EVENT_VARIANTS[evt.type]} value={typeLabel(evt.type)} size="sm" />
                  </View>
                </Card>
              ))}
            </View>
          ))
        )}

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>

      {/* Add Event Sheet */}
      {showSheet && (
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBg} activeOpacity={1} onPress={() => setShowSheet(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t('calendar.addEvent')}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>{t('calendar.eventTitle')}</Text>
              <TextInput style={styles.input} value={newTitle} onChangeText={setNewTitle} placeholder={t('calendar.eventTitle')} placeholderTextColor={colors.text.muted} />

              <Text style={styles.inputLabel}>{t('calendar.eventAmount')}</Text>
              <TextInput style={styles.input} value={newAmount} onChangeText={setNewAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.text.muted} />

              <Text style={styles.inputLabel}>{t('calendar.eventDate')}</Text>
              <TextInput style={styles.input} value={newDay} onChangeText={setNewDay} keyboardType="number-pad" placeholder="15" placeholderTextColor={colors.text.muted} maxLength={2} />

              <Text style={styles.inputLabel}>{t('calendar.eventType')}</Text>
              <View style={styles.typeRow}>
                {ALL_TYPES.map((tp) => (
                  <TouchableOpacity
                    key={tp}
                    style={[styles.typePill, newType === tp && { backgroundColor: accentColor, borderColor: accentColor }]}
                    onPress={() => setNewType(tp)}
                  >
                    <Text style={[styles.typeText, newType === tp && { color: '#FFF' }]}>{typeLabel(tp)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accentColor }]} onPress={handleAdd}>
                <Text style={styles.saveBtnText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
    content: { paddingHorizontal: spacing.xl, paddingBottom: 100, gap: spacing.md },
    monthRow: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, gap: spacing.sm, flexDirection: 'row' },
    monthPill: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
    monthText: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },
    summaryRow: { flexDirection: 'row', alignItems: 'flex-start' },
    summaryItem: { flex: 1 },
    summarySep: { width: 1, height: 36, backgroundColor: colors.border, marginHorizontal: spacing.lg },
    summaryLabel: { fontSize: 12, color: colors.text.muted, marginBottom: 4 },
    summaryValue: { fontSize: 20, fontWeight: '800' },
    emptyText: { color: colors.text.muted, textAlign: 'center', paddingVertical: spacing.xl },
    dateHeader: { fontSize: 14, fontWeight: '700', color: colors.text.secondary, marginTop: spacing.sm, marginBottom: spacing.xs },
    eventRow: { flexDirection: 'row', alignItems: 'center' },
    eventBorder: { width: 4, height: 40, borderRadius: 2, marginRight: spacing.md },
    eventIcon: { fontSize: 20, marginRight: spacing.sm },
    eventInfo: { flex: 1 },
    eventTitle: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
    eventAmount: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
    // Sheet
    sheetOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
    sheetBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, maxHeight: '80%' },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
    sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.lg },
    inputLabel: { fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginBottom: spacing.xs, marginTop: spacing.md },
    input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 14, color: colors.text.primary },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    typePill: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
    typeText: { fontSize: 12, fontWeight: '600', color: colors.text.secondary },
    saveBtn: { marginTop: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center' },
    saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  });
}
