---
name: fix-bug
description: Processo para investigar e corrigir bugs no app ZURT. Use quando o usuário reportar um bug, erro, comportamento inesperado, tela quebrada, ou qualquer problema no aplicativo.
---

# Processo de Correção de Bug — ZURT

## Passo 1: Entender o problema
- Leia o CLAUDE.md para contexto do projeto
- Identifique qual tela/store/componente está envolvido
- Verifique se o bug é em modo real, demo, ou ambos

## Passo 2: Investigar
- Leia o arquivo relevante COMPLETAMENTE
- Verifique os endpoints na seção API do CLAUDE.md
- Trace o fluxo de dados: tela → store → api.ts → backend
- Procure por:
  - Endpoints errados (comparar com CLAUDE.md)
  - Chaves i18n faltando (texto aparecendo como "chave.subchave")
  - Cores hardcoded em vez de usar colors do tema
  - Estado isLoading que pode ficar preso (missing finally)
  - Modo demo não tratado
  - Entidades HTML não decodificadas (&#8216; etc.)
  - CDATA não limpo (]]>)
  - Markdown renderizando como texto bruto

## Passo 3: Corrigir
- Faça a MENOR mudança possível para resolver o bug
- NÃO refatore código que funciona
- NÃO mude a UX sem ser pedido
- NÃO substitua telas inteiras — faça correções cirúrgicas
- Mantenha o padrão do projeto (ver CLAUDE.md)

## Passo 4: Validar
- Confirme que TypeScript compila (tsc --noEmit)
- Confirme que modo demo ainda funciona
- Confirme que mensagens de erro estão em português
- Liste EXATAMENTE o que foi mudado e por quê

## Regras ABSOLUTAS
- Mensagens de erro SEMPRE em português
- NUNCA usar supabase.ts (código morto, já foi removido)
- NUNCA fazer requests diretas com fetch() — usar apiRequest()
- NUNCA remover funcionalidade existente ao corrigir um bug
- NUNCA desconectar stores do backend (usar dados reais, não só demo)
