---
name: audit-i18n
description: Auditar traduções do app ZURT. Encontra chaves i18n faltando, textos hardcoded em português, e inconsistências entre idiomas. Use quando textos aparecem como chaves brutas na tela ou quando o usuário pedir auditoria de traduções.
context: fork
agent: Explore
---

# Auditoria de i18n — ZURT

ultrathink

## Tarefa

Faça uma auditoria completa de internacionalização no projeto:

1. **Chaves i18n usadas como texto bruto** — Busque em TODOS os arquivos .tsx dentro de app/ e src/components/ por strings que contêm "." e parecem ser chaves i18n renderizadas sem t(). Exemplos: "spendingInsights.savings", "cards.title" aparecendo na tela literalmente.

2. **Textos hardcoded em português** — Busque por props como label={}, title={}, placeholder={} com texto em português em vez de t().

3. **Chaves faltando** — Abra src/i18n/translations.ts e verifique que todas as chaves existentes em pt também existem em en, zh e ar.

4. **Entidades HTML** — Busque por &#NNNN; ou &amp; &quot; aparecendo em textos renderizados (não decodificados).

5. **CDATA residual** — Busque por ]]> ou <![CDATA[ em textos.

## Prioridade de telas
Foque nas telas que o usuário vê primeiro:
- app/(tabs)/index.tsx (Dashboard)
- app/(tabs)/cards.tsx (Cartões)
- app/(tabs)/agent.tsx (Agent)
- app/(tabs)/alerts.tsx (Alertas)
- app/(tabs)/profile.tsx (Perfil)
- app/spending-insights.tsx ou similar
- app/news.tsx ou app/market-news.tsx ou similar

## Formato do relatório
Para cada problema:
- 📍 Arquivo:Linha
- 🐛 Problema (ex: "texto hardcoded 'Cartões' deveria ser t('cards.title')")
- ✅ Correção sugerida
