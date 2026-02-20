# ZURT Wealth Intelligence — Prompt para Claude Code

Cole este prompt inteiro no Claude Code (terminal) com:
```
claude "$(cat PROMPT_CLAUDE_CODE.md)"
```
Ou abra o Claude Code e cole o conteúdo abaixo.

---

## PROMPT INÍCIO

Você é um engenheiro sênior de fintech construindo um app mobile de nível bancário. Crie do ZERO um aplicativo React Native (Expo SDK 52) chamado **ZURT Wealth Intelligence** — uma plataforma de consolidação patrimonial que agrega investimentos de múltiplas instituições financeiras brasileiras.

O app deve ter qualidade visual e técnica equivalente ao Robinhood, Nubank ou BTG Pactual Digital.

---

## STACK OBRIGATÓRIA

- **React Native** com **Expo SDK 52** (managed workflow)
- **TypeScript** (strict mode)
- **Expo Router** (file-based routing com app/ directory)
- **React Native Reanimated 3** (animações fluidas 60fps)
- **React Native Gesture Handler** (swipes, drags)
- **React Native SVG** (gráficos customizados)
- **Supabase** (auth, database, realtime)
- **Expo SecureStore** (armazenamento seguro de tokens/senhas)
- **Expo LocalAuthentication** (Face ID / biometria)
- **Expo Notifications** (push notifications)
- **Zustand** (state management)
- **React Native MMKV** (cache local ultra-rápido)
- **date-fns** (formatação de datas)

---

## DESIGN SYSTEM

### Paleta de cores (dark-first, identidade ZURT)
```
Background:     #060A0F (quase preto azulado)
Card:           #0A1018
Elevated:       #0F1820
Input:          #121A24
Border:         #1E2A3A
Accent:         #00D4AA (verde ZURT — usar como brand color)
Positive:       #00D4AA
Negative:       #FF4757
Warning:        #FFBE0B
Info:           #3A86FF
Text Primary:   #E8ECF1
Text Secondary: #8B95A5
Text Muted:     #5A6577
```

### Tipografia
- Usar fontes do sistema com fallback elegante
- Números sempre com `fontVariant: ['tabular-nums']` para alinhamento
- Hierarquia clara: 32px hero → 24px título → 16px subtítulo → 14px body → 12px caption → 10px micro

### Animações (CRÍTICO — é isso que diferencia de app amador)
- **Toda transição de tela** deve ter animação (shared element quando possível)
- **Cards** aparecem com stagger animation (um após o outro, 50ms delay)
- **Números** devem animar ao mudar (counting animation)
- **Pull-to-refresh** customizado com animação da logo ZURT
- **Skeleton loading** em toda tela que carrega dados (shimmer effect)
- **Haptic feedback** em ações importantes (botões, toggles, confirmações)
- **Gráficos** animam ao aparecer (draw-in de linhas)
- **Swipe-to-dismiss** em notificações
- **Bottom sheet** com gesture-driven animation para detalhes

---

## ARQUITETURA DE TELAS

### 1. 🔐 ONBOARDING + AUTH
```
/login          → Email + senha
/biometric      → Tela de ativação Face ID / Fingerprint
/pin            → PIN de 6 dígitos como fallback
```

**Fluxo:** App abre → se tem sessão, pede biometria → se falha, pede PIN → se não tem sessão, login.

A tela de login deve ter:
- Logo ZURT grande e animada (fade in + slight scale)
- Campo de email com validação
- Campo de senha com toggle de visibilidade
- Botão "Acessar" com loading state
- Botão de biometria com ícone de fingerprint grande e animado
- Link "Modo demonstração" para acessar com dados fictícios
- Transição suave para tela principal

### 2. 🏠 HOME (Tab principal)
```
/home
```

**Header:**
- Saudação com nome ("Olá, Diego 👋")
- Botão de busca
- Botão de notificação com badge de unread count

**Card Patrimônio Total (hero card com destaque máximo):**
- Valor total com animação de contagem
- Botão olho para ocultar/mostrar valores (persiste na sessão)
- Badge de variação: +X.XX% mês / +X.XX% 12m (verde ou vermelho)
- Linha divisória
- "Investido: R$ X" | "Lucro: R$ X" lado a lado
- Borda com glow sutil do accent color

**Gráfico de Evolução (interativo):**
- Line chart com gradient fill abaixo da linha
- Toggle: 1M / 3M / 6M / 1A / MAX
- Tooltip ao tocar mostrando valor + data
- Animação de draw-in quando aparece
- Linha de referência pontilhada no valor investido

**Alocação por Classe:**
- Barra horizontal segmentada por cores (fixed income, stocks, FIIs, crypto, etc)
- Lista abaixo com: dot colorido, nome, %, valor
- Cada item clicável para ver ativos daquela classe

**Contas Conectadas:**
- Card por instituição: ícone/logo, nome, quantidade de ativos, saldo
- Indicador de status (verde = conectado, amarelo = sincronizando, vermelho = erro)
- Botão "+ Conectar instituição" com borda dashed

**Insights (card especial):**
- "Seu CDB do Inter vence em 5 dias — R$ 25.000"
- "Sua alocação em renda fixa está 8% acima do recomendado"
- Cards com ícone, texto e ação (ex: "Ver detalhes →")

### 3. 💼 CARTEIRA (Tab)
```
/wallet
```

**Toggle:** "Por Classe" | "Por Instituição"

**Agrupamento expansível:**
- Grupo header: cor + ícone + nome + quantidade de ativos + total + % do patrimônio
- Toque expande para listar cada ativo:
  - Nome do ativo (PETR4, Tesouro Selic 2029, BTC, etc)
  - Quantidade (cotas, unidades)
  - Valor atual
  - Variação (% com cor)
  - Instituição de origem
- Cada ativo clicável → bottom sheet com detalhes completos

**Bottom Sheet de Detalhe do Ativo:**
- Nome completo + ticker
- Gráfico de preço (mini line chart)
- Preço médio de compra
- Quantidade
- Valor investido vs valor atual
- Rentabilidade
- Instituição
- Tipo (ação, FII, CDB, etc)

**Dados demo (incluir no mínimo 20 ativos variados):**
- Renda Fixa: Tesouro Selic 2029, CDB Inter 120% CDI, CDB BTG 110% CDI, LCI Nubank, Debênture VALE, CRA Raízen
- Ações: PETR4, VALE3, ITUB4, WEGE3, BBAS3, MGLU3, ABEV3
- FIIs: HGLG11, XPML11, KNRI11, MXRF11
- Cripto: BTC, ETH, SOL
- Internacional: VOO, QQQ, AAPL
- Previdência: VGBL Bradesco

### 4. 💳 CARTÕES (Tab)
```
/cards
```

**Cartões de crédito visuais (CRÍTICO — deve parecer cartão real):**
- Card com visual 3D (gradiente, padrão geométrico sutil no fundo)
- Nome do cartão (ex: "Nubank Ultravioleta")
- Últimos 4 dígitos
- Bandeira (Mastercard, Visa)
- Fatura atual em destaque
- Data de vencimento
- Barra de utilização (usado/limite) com gradiente
- Scroll horizontal entre cartões com snap

**Fatura detalhada:**
- Total da fatura atual
- Preview da próxima fatura
- Gastos por categoria com barra de progresso:
  - 🍕 Alimentação
  - 🚗 Transporte
  - 📺 Assinaturas
  - 🛍️ Compras
  - ⛽ Combustível
  - 💊 Saúde
  - ✈️ Viagem
  - 💻 Tecnologia
- Lista de transações com:
  - Data
  - Descrição
  - Categoria (com ícone)
  - Valor
  - Parcelamento (ex: "3/12")

**Cartões demo:**
1. Nubank Ultravioleta (roxo, Mastercard, limite 35K)
2. Inter Black (laranja, Mastercard, limite 20K)
3. BTG+ (preto/dourado, Visa, limite 50K)

### 5. 🔔 ALERTAS (Tab)
```
/alerts
```

**Tipos de notificação:**
- 💎 Distribuição (revenue share ZURT)
- ⚠️ Vencimento (CDB, títulos)
- 💳 Fatura (fechamento, vencimento)
- 💡 Insight (rebalanceamento, oportunidade)
- 🔔 Sistema

**Cada notificação:**
- Ícone colorido por tipo
- Título em bold
- Corpo com detalhe
- Data relativa ("há 2h", "ontem")
- Badge de não lido (dot verde)
- Swipe para dismiss

**Ações:**
- "Marcar todos como lido"
- Filtro por tipo

### 6. 👤 PERFIL (Tab)
```
/profile
```

**Card do usuário:**
- Avatar com iniciais (círculo accent)
- Nome completo
- Email
- Botão editar

**Seções:**
- 🔐 Segurança: Biometria (toggle), Alterar senha, PIN
- ⚙️ Preferências: Notificações push (toggle), Ocultar valores ao abrir (toggle), Idioma, Moeda padrão
- 🏦 Contas Conectadas: lista com status + botão "Conectar via Open Finance"
- 📊 ZURT Token: saldo de tokens, revenue share recebido, próxima distribuição
- ℹ️ Sobre: Termos, Privacidade, Ajuda, Suporte (WhatsApp)
- 🚪 Sair (vermelho)

---

## DADOS DEMO COMPLETOS

Crie um arquivo `src/data/demo.ts` com dados realistas e completos:

### Patrimônio
```
Total: R$ 847.350,00
Investido: R$ 720.000,00
Lucro: R$ 127.350,00
Variação 1m: +2.34%
Variação 12m: +18.7%
```

### Histórico mensal (12 meses)
De R$ 580.000 a R$ 847.350 com crescimento orgânico

### Contas
- XP Investimentos: R$ 312.500 (8 ativos)
- BTG Pactual: R$ 245.000 (5 ativos)
- Nubank: R$ 128.350 (4 ativos)
- Inter: R$ 89.500 (3 ativos)
- Binance: R$ 72.000 (6 ativos)

### Instituições brasileiras (cores reais das marcas)
```
Nubank:   #8A05BE
Itaú:     #003399 (com laranja #FF6600)
Bradesco: #CC092F
BTG:      #0D1B2A (com dourado)
XP:       #1A1A1A (com amarelo #FFD700)
Inter:    #FF6600
C6 Bank:  #1A1A1A (com carbono)
Rico:     #FF4500
Clear:    #00A651
Binance:  #F3BA2F
```

### 3 Cartões de crédito com transações completas (15+ transações cada)

### 15+ Notificações variadas dos últimos 7 dias

---

## REQUISITOS TÉCNICOS NÃO-NEGOCIÁVEIS

1. **TypeScript strict** — zero `any`, tipos em tudo
2. **Zustand stores** — separar por domínio (auth, portfolio, cards, notifications)
3. **Skeleton screens** — shimmer loading em TODA tela que carrega dados
4. **Error boundaries** — tratamento de erro em cada tela
5. **Pull-to-refresh** — em Home, Carteira e Alertas
6. **Formatação brasileira** — R$, vírgula como decimal, ponto como milhar
7. **Acessibilidade** — accessibilityLabel em botões e ícones
8. **Safe area** — respeitar notch e barra de navegação
9. **Keyboard avoiding** — inputs nunca ficam atrás do teclado
10. **Haptic feedback** — em toggles, botões de ação e confirmações

---

## ESTRUTURA DE PASTAS

```
zurt-app/
├── app/                          # Expo Router (file-based)
│   ├── _layout.tsx               # Root layout
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── biometric.tsx
│   └── (tabs)/
│       ├── _layout.tsx           # Tab navigator
│       ├── index.tsx             # Home
│       ├── wallet.tsx
│       ├── cards.tsx
│       ├── alerts.tsx
│       └── profile.tsx
├── src/
│   ├── components/
│   │   ├── ui/                   # Botões, inputs, cards base
│   │   ├── charts/               # Gráficos (LineChart, PieChart, BarChart)
│   │   ├── cards/                # CreditCard visual, AssetCard, AccountCard
│   │   ├── skeletons/            # Skeleton loaders
│   │   └── shared/               # Header, BottomSheet, Badge, etc
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── portfolioStore.ts
│   │   ├── cardsStore.ts
│   │   └── notificationStore.ts
│   ├── services/
│   │   ├── supabase.ts
│   │   ├── auth.ts
│   │   └── api.ts
│   ├── data/
│   │   └── demo.ts               # Todos os dados demo
│   ├── theme/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── formatters.ts         # formatBRL, formatPct, formatDate
│   │   └── animations.ts         # Presets de animação reutilizáveis
│   └── types/
│       └── index.ts              # Tipos globais
├── assets/
│   ├── icon.png
│   └── splash.png
├── app.json
├── tsconfig.json
├── package.json
└── babel.config.js
```

---

## INSTRUÇÕES PARA O CLAUDE CODE

1. Crie TODOS os arquivos. Não pule nenhum.
2. O app deve funcionar com `npx expo start` sem erros.
3. Use dados demo — o app deve ser funcional sem backend.
4. Foque 50% do esforço em ANIMAÇÕES e POLISH visual.
5. Cada tela deve ter skeleton loading.
6. Teste mentalmente cada fluxo: login → home → carteira → cartão → alerta → perfil.
7. Não use bibliotecas de gráfico externas. Faça com SVG + Reanimated.
8. O resultado deve parecer um app de banco real, não um protótipo.

**Comece criando a estrutura de pastas, depois o tema, depois os stores, depois os componentes, e por último as telas.**

## PROMPT FIM
