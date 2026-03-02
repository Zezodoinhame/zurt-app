---
name: add-screen
description: Processo para adicionar novas telas ao app ZURT. Use quando o usuário pedir para criar uma nova tela, feature, módulo, ou ferramenta no aplicativo.
disable-model-invocation: true
---

# Adicionar Tela — ZURT

## ANTES de codar, responda ao usuário:
1. Quais arquivos serão criados/modificados?
2. Precisa de novo endpoint no backend?
3. Precisa de novo store Zustand?
4. A tela funciona sem backend (modo demo)?

Só implemente DEPOIS da aprovação do usuário.

## Estrutura obrigatória

```
app/nova-tela.tsx              ← Tela (expo-router)
src/stores/novaTelaStore.ts    ← Store Zustand (se precisar de estado)
src/i18n/translations.ts       ← Adicionar chaves em pt, en, zh, ar
```

## Template de tela

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { SkeletonCard } from '../src/components/skeletons/Skeleton';
import { ErrorState } from '../src/components/shared/ErrorState';

export default function NovaTela() {
  const insets = useSafeAreaInsets();
  const colors = useSettingsStore((s) => s.colors);
  const { t, currency } = useSettingsStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {}}
            tintColor={colors.accent}
          />
        }
      >
        <Text style={styles.title}>{t('novaTela.title')}</Text>
        {/* Conteúdo aqui */}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 100, paddingHorizontal: spacing.xl },
  title: { fontSize: 24, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.lg },
});
```

## Template de store

```typescript
import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { apiRequest } from '../services/api';
import { logger } from '../utils/logger';

interface NovaTelaState {
  isLoading: boolean;
  error: string | null;
  data: any[];
  loadData: () => Promise<void>;
}

export const useNovaTelaStore = create<NovaTelaState>((set, get) => ({
  isLoading: false,
  error: null,
  data: [],

  loadData: async () => {
    const isDemoMode = useAuthStore.getState().isDemoMode;
    if (isDemoMode) {
      set({ data: demoData, isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const result = await apiRequest<any[]>('/endpoint');
      set({ data: result, isLoading: false });
    } catch (err: any) {
      logger.warn('[NovaTela] Erro:', err?.message);
      set({ isLoading: false, error: err?.message ?? 'Erro ao carregar dados.' });
    }
  },
}));
```

## Checklist obrigatório
- [ ] Usa colors do tema (useSettingsStore) — zero cores hardcoded?
- [ ] Usa t() para todos os textos — zero português hardcoded?
- [ ] Traduções adicionadas em pt, en, zh, ar?
- [ ] Funciona em dark e light theme?
- [ ] Tem loading state (Skeleton)?
- [ ] Tem error state (ErrorState)?
- [ ] Tem empty state?
- [ ] Modo demo funciona?
- [ ] Pull-to-refresh implementado?
- [ ] TypeScript sem erros?

$ARGUMENTS
