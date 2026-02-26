import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { type ThemeColors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useMarketStore } from '../../src/stores/marketStore';
import { brapiService } from '../../src/services/brapiService';
import { AppIcon } from '../../src/hooks/useIcon';
import { formatBRL, formatPct } from '../../src/utils/formatters';

// ---------------------------------------------------------------------------
// Filter tabs
// ---------------------------------------------------------------------------
type AssetFilter = 'all' | 'stock' | 'fund' | 'bdr';

const FILTERS: { key: AssetFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'stock', label: 'Acoes' },
  { key: 'fund', label: 'FIIs' },
  { key: 'bdr', label: 'BDRs' },
];

interface SearchResult {
  stock: string;
  name: string;
  close: number;
  change: number;
  volume: number;
  market_cap: number;
  logo: string;
  sector: string;
  type: string;
}

// ===========================================================================
// SearchScreen
// ===========================================================================

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<AssetFilter>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params: any = { search: query, limit: 30 };
        if (filter !== 'all') params.type = filter;
        const data = await brapiService.listQuotes(params);
        setResults(data.stocks || []);
      } catch (err: any) {
        console.log('[Search] Error:', err.message);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, filter]);

  const handleSelect = useCallback(
    (ticker: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/market/${ticker}`);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: SearchResult }) => (
      <TouchableOpacity
        style={styles.resultRow}
        activeOpacity={0.7}
        onPress={() => handleSelect(item.stock)}
      >
        <View style={styles.resultLogo}>
          <Text style={styles.resultLogoText}>
            {item.stock.substring(0, 2)}
          </Text>
        </View>
        <View style={styles.resultInfo}>
          <Text style={styles.resultTicker}>{item.stock}</Text>
          <Text style={styles.resultName} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
        <View style={styles.resultPriceCol}>
          <Text style={styles.resultPrice}>
            {item.close > 0 ? formatBRL(item.close) : '---'}
          </Text>
          {item.change !== undefined && item.change !== null && (
            <Text
              style={[
                styles.resultChange,
                { color: item.change >= 0 ? colors.positive : colors.negative },
              ]}
            >
              {formatPct(item.change)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    ),
    [colors, styles, handleSelect],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <AppIcon name="back" size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.searchInputWrap}>
          <AppIcon name="search" size={16} color={colors.text.muted} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Buscar ativo..."
            placeholderTextColor={colors.text.muted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <AppIcon name="close" size={16} color={colors.text.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : results.length === 0 && query.length >= 2 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Nenhum ativo encontrado</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.stock}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

// ===========================================================================
// Styles
// ===========================================================================

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    backBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchInputWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    searchInput: {
      flex: 1,
      paddingVertical: spacing.md,
      color: colors.text.primary,
      fontSize: 15,
    },

    // -- Filters ----------------------------------------------------------
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    filterBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterBtnActive: {
      backgroundColor: colors.accent + '20',
      borderColor: colors.accent + '40',
    },
    filterText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    filterTextActive: {
      color: colors.accent,
    },

    // -- Results ----------------------------------------------------------
    listContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 100,
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border + '50',
    },
    resultLogo: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    resultLogoText: {
      color: colors.text.secondary,
      fontSize: 12,
      fontWeight: '700',
    },
    resultInfo: {
      flex: 1,
      marginRight: spacing.sm,
    },
    resultTicker: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text.primary,
    },
    resultName: {
      fontSize: 12,
      color: colors.text.secondary,
      marginTop: 2,
    },
    resultPriceCol: {
      alignItems: 'flex-end',
    },
    resultPrice: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    resultChange: {
      fontSize: 11,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
      marginTop: 2,
    },

    // -- States -----------------------------------------------------------
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 60,
    },
    emptyWrap: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 60,
    },
    emptyText: {
      color: colors.text.secondary,
      fontSize: 14,
    },
  });
