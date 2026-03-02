# ZURT — Tela de Cartões (Apple Wallet Style)

## Visão Geral

Tela de cartões de crédito estilo Apple Wallet para o app ZURT.
Os cartões ficam empilhados e, ao tocar, expandem mostrando detalhes da fatura.

## Estrutura de Arquivos

```
Copie estes arquivos para o projeto zurt-app:

data/cardsData.ts              → src/data/cardsData.ts
utils/formatters.ts            → src/utils/formatters.ts
components/cards/
  CreditCardVisual.tsx         → src/components/cards/CreditCardVisual.tsx
  CardDetailPanel.tsx          → src/components/cards/CardDetailPanel.tsx
  MiniCardRow.tsx              → src/components/cards/MiniCardRow.tsx
  SpendingCategories.tsx       → src/components/cards/SpendingCategories.tsx
screens/CardsScreen.tsx        → src/screens/CardsScreen.tsx (ou app/(tabs)/cards.tsx)
```

## Dependências Necessárias

```bash
npx expo install expo-linear-gradient react-native-svg react-native-safe-area-context @expo/vector-icons
```

## Como integrar

### Se usar Expo Router (file-based routing):

No arquivo `app/(tabs)/cards.tsx`:

```tsx
export { default } from '../../src/screens/CardsScreen';
```

### Se usar React Navigation:

No seu tab navigator, adicione:

```tsx
import CardsScreen from '../screens/CardsScreen';

<Tab.Screen name="Cartões" component={CardsScreen} />
```

## Funcionalidades

- **Stack empilhado** — Cartões sobrepostos mostrando o topo de cada um
- **Expand/Collapse** — Toque no cartão para ver detalhes
- **Painel de detalhes** — Fatura atual, disponível, % utilização, vencimento, status
- **Ocultar valores** — Botão de privacidade
- **Mini cards** — Lista compacta dos outros cartões quando um está expandido
- **Categorias** — Tab de gastos por categoria com barra empilhada
- **Visual realista** — Gradientes, chip SVG, bandeiras (Visa/Mastercard), contactless, texturas (metal/carbon)

## Bancos incluídos (demo)

1. Nubank Ultravioleta (Mastercard)
2. BTG Pactual Black (Mastercard)
3. XP Visa Infinite
4. Inter Black (Mastercard)
5. C6 Carbon Black (Mastercard)
6. Santander AAdvantage Black (Mastercard)

## Integração com Open Finance (Pluggy)

Para dados reais, substituir `DEMO_CARDS` em `cardsData.ts` pelos dados
retornados pela API da Pluggy:

```typescript
// Endpoint Pluggy para cartões de crédito
// GET /accounts?type=CREDIT
// Retorna: institution, number, balance, creditLimit, etc.

// Mapear para o tipo CreditCard:
const mapPluggyToCard = (account: PluggyAccount): CreditCard => ({
  id: account.id,
  banco: account.institution.name,
  limiteTotal: account.creditLimit,
  limiteUsado: account.balance,
  faturaAtual: account.currencyCode === 'BRL' ? account.balance : 0,
  // ...etc
});
```

## Instrução para Claude Code

```
Integre a tela de cartões estilo Apple Wallet no projeto zurt-app.
Os arquivos estão na pasta zurt-cards/. Copie cada arquivo para a
localização correta conforme o README. Instale as dependências
(expo-linear-gradient, react-native-svg). Substitua a tela cards.tsx
atual pelo novo CardsScreen. Garanta que funciona no Expo Go.
```
