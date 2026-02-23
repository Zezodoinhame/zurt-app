import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useBadgesStore } from '../src/stores/badgesStore';
import { Card } from '../src/components/ui/Card';
import { AppIcon } from '../src/hooks/useIcon';
import type { BadgeCategory, Badge } from '../src/types';

const SCREEN_WIDTH = Dimensions.get('window').width;

type FilterCategory = BadgeCategory | 'all';

const FILTER_PILLS: { key: FilterCategory; labelKey: string }[] = [
  { key: 'all', labelKey: 'badges.all' },
  { key: 'milestones', labelKey: 'badges.milestones' },
  { key: 'consistency', labelKey: 'badges.consistency' },
  { key: 'education', labelKey: 'badges.education' },
  { key: 'tax', labelKey: 'badges.tax' },
];

export default function BadgesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useSettingsStore();
  const colors = useSettingsStore((s) => s.colors);
  const { badges, loadBadges, getEarnedCount } = useBadgesStore();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [filter, setFilter] = useState<FilterCategory>('all');

  useEffect(() => {
    loadBadges();
  }, []);

  const handleFilter = useCallback((cat: FilterCategory) => {
    Haptics.selectionAsync();
    setFilter(cat);
  }, []);

  const filtered = filter === 'all' ? badges : badges.filter((b) => b.category === filter);
  const earned = getEarnedCount();
  const earnedEmojis = badges.filter((b) => b.status === 'earned').map((b) => b.emoji).join(' ');

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppIcon name="back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('badges.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero */}
        <Card variant="glow" delay={100}>
          <Text style={styles.heroCount}>
            {earned}/{badges.length}
          </Text>
          <Text style={styles.heroLabel}>{t('badges.earned')}</Text>
          <Text style={styles.earnedEmojis}>{earnedEmojis}</Text>
        </Card>

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_PILLS.map((pill) => {
            const isSelected = filter === pill.key;
            return (
              <TouchableOpacity
                key={pill.key}
                style={[
                  styles.filterPill,
                  isSelected && styles.filterPillSelected,
                ]}
                onPress={() => handleFilter(pill.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterText,
                    isSelected && styles.filterTextSelected,
                  ]}
                >
                  {t(pill.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Badge Grid */}
        <View style={styles.grid}>
          {filtered.map((badge, i) => (
            <BadgeCard key={badge.id} badge={badge} colors={colors} index={i} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function BadgeCard({ badge, colors, index }: { badge: Badge; colors: ThemeColors; index: number }) {
  const isEarned = badge.status === 'earned';
  const isLocked = badge.status === 'locked';
  const isInProgress = badge.status === 'inProgress';

  return (
    <View
      style={[
        badgeStyles.card,
        {
          backgroundColor: colors.card,
          borderColor: isEarned ? colors.accent : colors.border,
          borderWidth: isEarned ? 1.5 : 1,
          opacity: isLocked ? 0.5 : 1,
        },
      ]}
    >
      <Text style={badgeStyles.emoji}>{isLocked ? '\uD83D\uDD12' : badge.emoji}</Text>
      <Text style={[badgeStyles.title, { color: colors.text.primary }]} numberOfLines={1}>
        {badge.title}
      </Text>
      <Text style={[badgeStyles.desc, { color: colors.text.muted }]} numberOfLines={2}>
        {badge.description}
      </Text>

      {isEarned && badge.earnedAt && (
        <View style={badgeStyles.statusRow}>
          <AppIcon name="success" size={12} color={colors.positive} />
          <Text style={[badgeStyles.statusText, { color: colors.positive }]}>
            {badge.earnedAt}
          </Text>
        </View>
      )}

      {isInProgress && badge.progress != null && (
        <View style={badgeStyles.progressContainer}>
          <View style={[badgeStyles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                badgeStyles.progressFill,
                { width: `${badge.progress}%`, backgroundColor: colors.accent },
              ]}
            />
          </View>
          <Text style={[badgeStyles.progressText, { color: colors.text.muted }]}>
            {badge.progress}%
          </Text>
        </View>
      )}

      {isLocked && (
        <Text style={[badgeStyles.lockedText, { color: colors.text.muted }]}>
          Bloqueado
        </Text>
      )}
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  card: {
    width: (SCREEN_WIDTH - spacing.xl * 2 - spacing.sm) / 2,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  emoji: { fontSize: 32, marginBottom: spacing.xs },
  title: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  desc: { fontSize: 11, lineHeight: 15, marginBottom: spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontSize: 10, fontWeight: '600' },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: 4, borderRadius: 2 },
  progressText: { fontSize: 10, fontWeight: '600', fontVariant: ['tabular-nums'] },
  lockedText: { fontSize: 10, fontWeight: '600' },
});

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 100,
    },
    heroCount: {
      fontSize: 36,
      fontWeight: '800',
      color: colors.text.primary,
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
    },
    heroLabel: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    earnedEmojis: {
      fontSize: 22,
      textAlign: 'center',
      lineHeight: 30,
    },
    filterRow: {
      paddingVertical: spacing.lg,
      gap: spacing.sm,
    },
    filterPill: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterPillSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    filterText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    filterTextSelected: {
      color: colors.background,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
  });
