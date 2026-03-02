---
name: react-native-patterns
description: Padrões e convenções do projeto ZURT React Native. Use quando criar ou modificar componentes, telas, ou stores. Ativa automaticamente quando o usuário pede para criar telas, componentes, ou mexer em stores Zustand.
---

# Padrões React Native — ZURT

Leia o CLAUDE.md na raiz do projeto para contexto completo.

## Componentes
- Functional components com hooks, NUNCA class components
- Props tipadas com TypeScript interface
- Estilos via `useMemo(() => createStyles(colors), [colors])`
- Cores SEMPRE do tema: `const colors = useSettingsStore((s) => s.colors)`
- NUNCA hardcodar cores (#fff, #000, rgba, etc.)

## Stores (Zustand)
```typescript
create<StateType>((set, get) => ({
  isLoading: false,
  error: null,
  data: [],
  loadData: async () => {
    const isDemoMode = useAuthStore.getState().isDemoMode;
    if (isDemoMode) {
      set({ data: demoData });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const result = await apiRequest<T>('/endpoint');
      set({ data: result, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message ?? 'Erro ao carregar dados.' });
    }
  }
}))
```

## Telas
- Sempre usar `useSafeAreaInsets()` para padding top
- Pull-to-refresh com `RefreshControl`
- Loading: usar Skeleton components de `src/components/skeletons/`
- Error: usar `ErrorState` de `src/components/shared/`
- Empty: mensagem + botão de ação
- Todos os textos via `t('chave.subchave')` — NUNCA hardcoded em português

## API
- SEMPRE usar `apiRequest()` de `src/services/api.ts`
- NUNCA usar fetch() direto
- NUNCA hardcodar tokens — usar .env
- Timeout: 15s normal, 30s para endpoints de IA (/ai/*)

## i18n
- Chaves em dot notation: `t('home.totalPatrimony')`
- 4 idiomas obrigatórios: pt (padrão), en, zh, ar
- Adicionar traduções em src/i18n/translations.ts

## Checklist antes de finalizar qualquer mudança
- [ ] Funciona em modo demo?
- [ ] Funciona em dark E light theme?
- [ ] Textos estão no i18n (4 idiomas)?
- [ ] TypeScript sem erros?
- [ ] Sem console.log (usar logger)?
- [ ] Mensagens de erro em português?
