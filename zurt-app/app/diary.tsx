import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useDiaryStore } from '../src/stores/diaryStore';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { AppIcon } from '../src/hooks/useIcon';
import type { DiaryMood, DiaryTag, DiaryDecision } from '../src/types';

const MOOD_MAP: Record<DiaryMood, { emoji: string }> = {
  confident: { emoji: '\u{1F600}' },
  anxious: { emoji: '\u{1F630}' },
  uncertain: { emoji: '\u{1F914}' },
  calm: { emoji: '\u{1F60E}' },
  focused: { emoji: '\u{1F3AF}' },
};

const ALL_TAGS: DiaryTag[] = ['stock', 'crypto', 'fund', 'rebalance', 'macro', 'custom'];
const ALL_MOODS: DiaryMood[] = ['confident', 'anxious', 'uncertain', 'calm', 'focused'];
const ALL_DECISIONS: DiaryDecision[] = ['buy', 'sell', 'hold'];

export default function DiaryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const { entries, selectedTag, loadEntries, addEntry, removeEntry, setTagFilter, getFilteredEntries } = useDiaryStore();
  const [showSheet, setShowSheet] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<DiaryMood>('calm');
  const [tags, setTags] = useState<DiaryTag[]>([]);
  const [ticker, setTicker] = useState('');
  const [decision, setDecision] = useState<DiaryDecision | undefined>(undefined);

  useEffect(() => { loadEntries(); }, []);

  const styles = useMemo(() => createStyles(colors), [colors]);
  const filtered = getFilteredEntries();

  const handleAdd = useCallback(() => {
    if (!title.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addEntry({ title: title.trim(), content: content.trim(), mood, tags, ticker: ticker.trim() || undefined, decision });
    setTitle(''); setContent(''); setMood('calm'); setTags([]); setTicker(''); setDecision(undefined);
    setShowSheet(false);
  }, [title, content, mood, tags, ticker, decision, addEntry]);

  const toggleTag = useCallback((tag: DiaryTag) => {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('diary.title')}</Text>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowSheet(true); }}>
          <AppIcon name="add" size={24} color={accentColor} />
        </TouchableOpacity>
      </View>

      {/* Tag filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRow}>
        <TouchableOpacity style={[styles.tagPill, selectedTag === 'all' && { backgroundColor: accentColor, borderColor: accentColor }]} onPress={() => { Haptics.selectionAsync(); setTagFilter('all'); }}>
          <Text style={[styles.tagText, selectedTag === 'all' && { color: colors.background }]}>{t('diary.allTags')}</Text>
        </TouchableOpacity>
        {ALL_TAGS.map((tag) => (
          <TouchableOpacity key={tag} style={[styles.tagPill, selectedTag === tag && { backgroundColor: accentColor, borderColor: accentColor }]} onPress={() => { Haptics.selectionAsync(); setTagFilter(tag); }}>
            <Text style={[styles.tagText, selectedTag === tag && { color: colors.background }]}>{t(`diary.tag_${tag}`)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 60 }}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>{'\uD83D\uDCD3'}</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, textAlign: 'center', marginBottom: 8 }}>Diário de Investimentos</Text>
            <Text style={{ fontSize: 14, color: colors.text.secondary, textAlign: 'center', lineHeight: 20 }}>
              Registre suas decisões de investimento, o raciocínio por trás delas, e como você se sentiu. Acompanhe padrões ao longo do tempo.
            </Text>
          </View>
        ) : (
          filtered.map((entry) => (
            <Card key={entry.id}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryMood}>{MOOD_MAP[entry.mood]?.emoji ?? ''}</Text>
                <View style={styles.entryHeaderInfo}>
                  <Text style={styles.entryTitle} numberOfLines={1}>{entry.title}</Text>
                  <Text style={styles.entryDate}>{formatDate(entry.createdAt)}{entry.ticker ? ` \u{2022} ${entry.ticker}` : ''}</Text>
                </View>
                {entry.decision && (
                  <Badge
                    value={t(`diary.${entry.decision}`)}
                    variant={entry.decision === 'buy' ? 'positive' : entry.decision === 'sell' ? 'negative' : 'neutral'}
                    size="sm"
                  />
                )}
              </View>
              <Text style={styles.entryContent} numberOfLines={3}>{entry.content}</Text>
              <View style={styles.entryTags}>
                {entry.tags.map((tag) => (
                  <View key={tag} style={styles.entryTagPill}>
                    <Text style={styles.entryTagText}>{t(`diary.tag_${tag}`)}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ))
        )}
        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>

      {/* Add Entry Sheet */}
      {showSheet && (
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBg} activeOpacity={1} onPress={() => setShowSheet(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t('diary.addEntry')}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>{t('diary.entryTitle')}</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder={t('diary.entryTitle')} placeholderTextColor={colors.text.muted} />

              <Text style={styles.inputLabel}>{t('diary.content')}</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={content} onChangeText={setContent} placeholder={t('diary.content')} placeholderTextColor={colors.text.muted} multiline />

              <Text style={styles.inputLabel}>{t('diary.ticker')}</Text>
              <TextInput style={styles.input} value={ticker} onChangeText={setTicker} placeholder="PETR4" placeholderTextColor={colors.text.muted} autoCapitalize="characters" />

              <Text style={styles.inputLabel}>{t('diary.mood')}</Text>
              <View style={styles.moodRow}>
                {ALL_MOODS.map((m) => (
                  <TouchableOpacity key={m} style={[styles.moodBtn, mood === m && { borderColor: accentColor, backgroundColor: accentColor + '20' }]} onPress={() => setMood(m)}>
                    <Text style={styles.moodEmoji}>{MOOD_MAP[m].emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>{t('diary.decision')}</Text>
              <View style={styles.moodRow}>
                {ALL_DECISIONS.map((d) => (
                  <TouchableOpacity key={d} style={[styles.tagPill, decision === d && { backgroundColor: accentColor, borderColor: accentColor }]} onPress={() => setDecision(decision === d ? undefined : d)}>
                    <Text style={[styles.tagText, decision === d && { color: colors.background }]}>{t(`diary.${d}`)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>{t('diary.tags')}</Text>
              <View style={styles.moodRow}>
                {ALL_TAGS.map((tag) => (
                  <TouchableOpacity key={tag} style={[styles.tagPill, tags.includes(tag) && { backgroundColor: accentColor, borderColor: accentColor }]} onPress={() => toggleTag(tag)}>
                    <Text style={[styles.tagText, tags.includes(tag) && { color: colors.background }]}>{t(`diary.tag_${tag}`)}</Text>
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
    tagRow: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, gap: 8, flexDirection: 'row' },
    tagPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, minWidth: 60, alignItems: 'center' as const },
    tagText: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },
    emptyText: { color: colors.text.muted, textAlign: 'center', paddingVertical: spacing.xl },
    entryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
    entryMood: { fontSize: 28, marginRight: spacing.md },
    entryHeaderInfo: { flex: 1 },
    entryTitle: { fontSize: 15, fontWeight: '700', color: colors.text.primary },
    entryDate: { fontSize: 12, color: colors.text.muted, marginTop: 2 },
    entryContent: { fontSize: 13, color: colors.text.secondary, lineHeight: 20, marginBottom: spacing.sm },
    entryTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    entryTagPill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full, backgroundColor: colors.border },
    entryTagText: { fontSize: 11, color: colors.text.secondary },
    // Sheet
    sheetOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
    sheetBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, maxHeight: '85%' },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
    sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.lg },
    inputLabel: { fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginBottom: spacing.xs, marginTop: spacing.md },
    input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 14, color: colors.text.primary },
    moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    moodBtn: { width: 48, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    moodEmoji: { fontSize: 24 },
    saveBtn: { marginTop: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center' },
    saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  });
}
