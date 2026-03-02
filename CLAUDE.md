# ZURT Wealth Intelligence — CLAUDE.md

> Este arquivo é a memória permanente do projeto. Leia INTEIRO antes de qualquer alteração.

## 🏗️ Visão Geral

ZURT é uma plataforma mobile de inteligência patrimonial que consolida investimentos de múltiplas instituições financeiras brasileiras via Open Finance. O app mobile consome um backend já existente e funcional em `zurt.com.br/api` (PostgreSQL no Digital Ocean).

## 📱 Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| Framework | React Native 0.81.5 via Expo SDK 54 |
| Linguagem | TypeScript 5.9 |
| Roteamento | expo-router 6 (file-based) |
| Estado | Zustand 5 |
| Persistência local | AsyncStorage + expo-secure-store |
| Autenticação | JWT (Bearer token) + Google OAuth + Biometria |
| Backend | Node.js + PostgreSQL (Digital Ocean) |
| API Base | `https://zurt.com.br/api` |
| i18n | 4 idiomas (pt, en, zh, ar) com RTL para árabe |
| Tema | Dark/Light/System + 6 cores de destaque |
| Dados de mercado | brapi.dev (fallback direto no app) |

## 📁 Estrutura de Pastas

```
zurt-app/
├── app/                    # Telas (expo-router file-based)
│   ├── _layout.tsx         # Root layout (auth, push, analytics, network)
│   ├── index.tsx           # Redirect / splash
│   ├── onboarding.tsx      # Onboarding flow
│   ├── (auth)/             # Grupo de autenticação
│   │   ├── _layout.tsx
│   │   ├── login.tsx       # Login/Register + Google OAuth
│   │   └── biometric.tsx   # Biometric auth
│   ├── (tabs)/             # Tab navigation principal
│   │   ├── _layout.tsx     # Tab bar config
│   │   ├── index.tsx       # Dashboard/Home
│   │   ├── agent.tsx       # ZURT Agent (AI chat)
│   │   ├── alerts.tsx      # Notificações
│   │   ├── cards.tsx       # Cartões de crédito
│   │   ├── wallet.tsx      # Carteira
│   │   └── profile.tsx     # Perfil/Configurações
│   └── [40+ modal screens] # connect-bank, goals, report, etc.
├── src/
│   ├── components/         # Componentes reutilizáveis
│   │   ├── ui/             # Button, Card, Input, Badge, Toggle, etc.
│   │   ├── charts/         # LineChart, AllocationBar, CircularProgress, etc.
│   │   ├── cards/          # AccountCard, AssetCard, CreditCard
│   │   ├── shared/         # Header, ErrorState, BottomSheet
│   │   ├── skeletons/      # Loading skeletons
│   │   ├── alerts/         # SmartAlert
│   │   └── icons/          # BankLogo
│   ├── services/
│   │   ├── api.ts          # ⭐ PRINCIPAL — todas as chamadas ao backend
│   │   ├── auth.ts         # Biometria + PIN + SecureStore
│   │   ├── analytics.ts    # Tracking de eventos
│   │   ├── benchmarks.ts   # CDI, IPCA, IBOV via brapi
│   │   ├── reportGenerator.ts # Geração de PDF patrimonial
│   │   └── supabase.ts     # ⚠️ CÓDIGO MORTO — NÃO USAR
│   ├── stores/             # Zustand stores (30+)
│   ├── theme/              # colors, spacing, typography
│   ├── types/              # TypeScript types
│   ├── i18n/               # translations.ts (pt, en, zh, ar)
│   ├── hooks/              # useAppLock, useIcon, useAnalytics
│   ├── data/               # demo.ts (dados de demonstração)
│   ├── utils/              # formatters, calculators, logger
│   └── assets/bank-logos/  # SVGs dos bancos
├── assets/                 # Ícones, splash, logo
├── Bancos SVG/             # Logos de bancos brasileiros (SVG)
├── .env                    # Variáveis de ambiente
├── app.json                # Expo config
├── CLAUDE.md               # ESTE ARQUIVO
└── package.json
```

## 🔑 Variáveis de Ambiente

```env
EXPO_PUBLIC_API_URL=https://zurt.com.br/api
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=878759393474-409rju4qa7lnc1s99d0alctsoquhrtr7.apps.googleusercontent.com
```

> ⚠️ O .env atual NÃO tem EXPO_PUBLIC_API_URL definido. O app faz fallback hardcoded para `https://zurt.com.br/api`.

## 🌐 API Backend — Endpoints Documentados

Base: `https://zurt.com.br/api`
Auth: `Authorization: Bearer <jwt_token>`

### Autenticação
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /auth/login | Login com email + senha, retorna { token, user } |
| POST | /auth/register | Registro, retorna { token, user } |
| POST | /auth/google | Login com Google idToken |
| GET | /users/me | Perfil do usuário autenticado |
| PATCH | /users/me | Atualizar perfil |
| POST | /users/push-token | Registrar push token |
| DELETE | /users/push-token | Remover push token |
| PATCH | /users/push-preferences | Atualizar preferências de push |

### Dashboard (endpoint principal)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /dashboard/finance | Retorna summary, institutions, assets, allocations, insights, cards, transactions |

### Open Finance / Conexões
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /connections | Listar conexões |
| GET | /connections/institutions?search= | Buscar instituições |
| POST | /connections/connect-token | Gerar token de conexão (Pluggy) |
| POST | /connections | Criar conexão com itemId |
| POST | /connections/{id}/sync | Sincronizar conexão |
| DELETE | /connections/{id} | Remover conexão |

### Finanças
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /finance/sync | Sincronizar todos os dados |
| GET | /finance/transactions | Listar transações (query: limit, offset) |

### Cartões
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /cards | Listar cartões + categorySpending |

### Investimentos
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /investments/holdings | Posições detalhadas |
| GET | /investments/summary | Resumo dos investimentos |

### Metas
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /goals | Listar metas |
| POST | /goals | Criar meta |
| PATCH | /goals/{id} | Atualizar meta |
| DELETE | /goals/{id} | Remover meta |

### Assinaturas (plano ZURT)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /subscriptions/me | Assinatura atual |
| GET | /subscriptions/history | Histórico de pagamentos |
| GET | /plans | Listar planos disponíveis |

### IA / Agent
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /ai/insights | Insights iniciais (body: { message?, language }) |
| POST | /ai/chat | Chat com o Agent (body: { message, conversationId?, language }) |
| POST | /ai/report | Gerar relatório com IA (body: { period, language }) |
| POST | /ai/check-alerts | Verificar alertas inteligentes |

### Notificações
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /notifications | Listar notificações |
| PATCH | /notifications/{id}/read | Marcar como lida |
| PATCH | /notifications/read-all | Marcar todas como lidas |
| DELETE | /notifications/{id} | Excluir notificação |

### Família
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /family | Dados do grupo familiar |
| POST | /family/create | Criar grupo (body: { name }) |
| POST | /family/invite | Convidar membro (body: { email, role }) |
| GET | /family/summary | Resumo patrimonial familiar |
| GET | /family/pending | Convites pendentes |
| POST | /family/accept/{token} | Aceitar convite |
| POST | /family/reject/{token} | Rejeitar convite |
| PUT | /family/member/{id}/visibility | Alterar visibilidade |
| DELETE | /family/member/{id} | Remover membro |
| GET | /family/member/{id}/profile | Perfil do membro |

### Mercado
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /market/asset/{ticker} | Detalhes de ativo (proxy para brapi) |

### Customer / Mensagens
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /customer/messages/conversations | Listar conversas |
| GET | /customer/messages/conversations/{id} | Detalhes da conversa |
| POST | /customer/messages/conversations/{id}/messages | Enviar mensagem |
| GET | /customer/invitations | Listar convites |
| GET | /customer/referral-link | Link de indicação |

### Relatórios
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /reports | Listar relatórios gerados |

### Analytics
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /analytics/event | Registrar evento |
| POST | /analytics/session | Registrar sessão |

## 🔄 Fluxo de Autenticação

1. Login via email/senha OU Google OAuth → backend retorna JWT
2. Token salvo via `expo-secure-store`
3. Todas as requests incluem `Authorization: Bearer <token>`
4. Se 401 → auto-logout via `setOnUnauthorized`
5. `restoreSession()` no boot: lê token do SecureStore → GET /users/me
6. Modo Demo: usa `demoUser` + dados locais, NENHUMA chamada real ao backend

## 🎯 Status dos Stores — O Que Funciona vs TODO

### ✅ CONECTADOS AO BACKEND (funcionais)
- `authStore` — login, register, Google, restore session
- `portfolioStore` — via GET /dashboard/finance
- `cardsStore` — via /dashboard/finance + GET /finance/transactions
- `goalsStore` — CRUD completo via /goals
- `agentStore` — via /ai/insights + /ai/chat
- `notificationStore` — via /notifications (CRUD)
- `pushStore` — via /users/push-token

### ⚠️ TODO: NÃO CONECTADOS (usam só demo data)
- `backtestStore` — "TODO: call API when endpoint is ready"
- `cashFlowStore` — "TODO: fetch from API when endpoint is ready"
- `comparisonStore` — "TODO: fetch from API when endpoint is ready"
- `consultantStore` — "TODO: fetch from API when endpoint is ready"
- `correlationStore` — "TODO: fetch from API when endpoint is ready"
- `dividendStore` — "TODO: fetch from API when endpoint is ready"
- `rebalanceStore` — "TODO: fetch from API when endpoint is ready"
- `scenarioStore` — "TODO: fetch presets from API when endpoint is ready"

### 📱 LOCAL-ONLY (AsyncStorage, funcionam sem backend)
- `billsStore`, `budgetStore`, `debtStore`, `diaryStore`
- `emergencyFundStore`, `financialCalendarStore`
- `fireStore`, `compoundStore`, `realEstateStore`, `retirementStore`
- `priceAlertStore`, `savingsChallengeStore`, `subscriptionStore`
- `watchlistStore`, `cryptoStore` (com dados live da BRAPI/CoinGecko)
- `familyStore` (zustand persist)

## 📐 Convenções de Código

### Componentes
- Functional components com hooks
- `useMemo` para StyleSheet com theme (ex: `createStyles(colors)`)
- `useCallback` para handlers
- Props tipadas com TypeScript

### Stores (Zustand)
- `create<StateType>((set, get) => ({...}))`
- Padrão: `isLoading`, `error`, `loadX()`, `refresh()`
- Demo mode check: `const isDemoMode = useAuthStore.getState().isDemoMode;`
- Persistência local: `AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data))`

### API Calls (src/services/api.ts)
- `apiRequest<T>(path, options?, retries?, timeout?)` — função base
- `fetchWithFallback(cacheKey, path, transform, fallback)` — com cache + demo fallback
- Todos os endpoints usam `Authorization: Bearer <token>`
- Demo mode: retorna dados locais, NÃO faz fetch
- Timeout: 15s normal, 30s para endpoints de IA

### Estilo Visual
- Fundo escuro padrão: `#080D14`
- Cor accent padrão: `#00D4AA`
- Cards com borda sutil: `borderColor: colors.border`
- Fonte do sistema (sem custom fonts)
- Ícones: sistema próprio via `AppIcon` + emojis

### i18n
- Chaves em dot notation: `t('home.totalPatrimony')`
- 4 idiomas: pt (padrão), en, zh, ar
- RTL automático para árabe

## ⚠️ Coisas Para NÃO Fazer

1. **NÃO usar supabase.ts** — é código morto com URLs placeholder
2. **NÃO criar novas telas** sem necessidade — já existem 40+
3. **NÃO mudar a estrutura do api.ts** sem motivo — ele funciona
4. **NÃO hardcodar tokens/keys** — usar .env
5. **NÃO ignorar o modo demo** — toda feature precisa funcionar em demo
6. **NÃO instalar dependências sem necessidade** — o projeto já é pesado
7. **NÃO fazer requests diretas com fetch()** — usar `apiRequest()` do api.ts
8. **NÃO criar stores novos sem necessidade** — já existem 30+
9. **NÃO esquecer de tipar** — TypeScript strict
10. **NÃO alterar o tema sem usar useSettingsStore** — `colors` vem de lá

## 🎨 Design System

### Cores (Dark Theme)
```typescript
background: '#080D14'
card: '#0D1520'
cardElevated: '#111B2A'
border: '#1A2A3A'
accent: '#00D4AA'  // configurável pelo usuário
positive: '#00D4AA'
negative: '#FF6B6B'
warning: '#FFD93D'
info: '#3A86FF'
text.primary: '#FFFFFF'
text.secondary: '#94A3B8'
text.muted: '#64748B'
```

### Spacing
```typescript
xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, section: 32
```

### Border Radius
```typescript
sm: 8, md: 12, lg: 16, xl: 20, full: 9999
```

## 🔒 Segurança
- JWT armazenado no expo-secure-store (não AsyncStorage)
- PIN com expo-secure-store
- Biometria com expo-local-authentication
- Auto-lock via useAppLock
- 401 → auto-logout
- BRAPI token hardcoded (precisa migrar para .env futuramente)

## 📋 Prioridades de Desenvolvimento

### FASE 1 — Core funcional (PRIORIDADE MÁXIMA)
1. Garantir que login/registro funciona sem erros
2. Dashboard carregando dados reais do /dashboard/finance
3. Conexão Open Finance (connect-bank) funcional
4. ZURT Agent respondendo via /ai/chat
5. Notificações push funcionais

### FASE 2 — Polimento
6. Corrigir encoding de caracteres (ã, ç aparecendo quebrados)
7. Melhorar tratamento de erros (offline, timeout)
8. Animações e transições suaves
9. Testes de fluxo completo

### FASE 3 — Features secundárias
10. Conectar stores TODO ao backend (quando endpoints existirem)
11. Melhorias no relatório PDF
12. Consultant view para assessores
