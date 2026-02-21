// =============================================================================
// ZURT Wealth Intelligence - Premium PDF Report Generation Screen
// =============================================================================

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { type ThemeColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';
import { useSettingsStore } from '../src/stores/settingsStore';
import { generateReportApi } from '../src/services/api';

// =============================================================================
// Types
// =============================================================================

interface ReportData {
  analysis: string;
  portfolio: any;
  market: any;
  generatedAt: string;
  investorName: string;
}

// =============================================================================
// Helper: Format date in Brazilian Portuguese
// =============================================================================

function formatDateBR(date: string): string {
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ];
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} de ${month} de ${year}`;
}

// =============================================================================
// Helper: Format currency in Brazilian format
// =============================================================================

function formatCurrencyBR(value: number): string {
  if (value == null || isNaN(value)) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// =============================================================================
// Helper: Parse AI analysis text into sections
// =============================================================================

function parseAnalysisSections(analysis: string): {
  resumo: string;
  patrimonio: string;
  investimentos: string;
  cartoes: string;
  mercado: string;
  recomendacoes: string;
  perspectivas: string;
} {
  const defaults = {
    resumo: '',
    patrimonio: '',
    investimentos: '',
    cartoes: '',
    mercado: '',
    recomendacoes: '',
    perspectivas: '',
  };

  if (!analysis) return defaults;

  // Try to split by numbered headers like "1. RESUMO EXECUTIVO", "2. ANALISE DO PATRIMONIO"
  const sectionPattern = /\d+\.\s*[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]+/g;
  const matches = [...analysis.matchAll(sectionPattern)];

  if (matches.length === 0) {
    // No structured sections found, put everything in resumo
    defaults.resumo = analysis;
    return defaults;
  }

  const sections: { title: string; start: number; end: number; content: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const start = (match.index ?? 0) + match[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? analysis.length) : analysis.length;
    const title = match[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const content = analysis.substring(start, end).trim();
    sections.push({ title, start, end, content });
  }

  for (const section of sections) {
    const t = section.title;
    if (t.includes('resumo') || t.includes('executivo')) {
      defaults.resumo = section.content;
    } else if (t.includes('patrimonio') || t.includes('patrimônio')) {
      defaults.patrimonio = section.content;
    } else if (t.includes('investimento')) {
      defaults.investimentos = section.content;
    } else if (t.includes('cartao') || t.includes('cartoes') || t.includes('cartões')) {
      defaults.cartoes = section.content;
    } else if (t.includes('mercado') || t.includes('cenario') || t.includes('cenário')) {
      defaults.mercado = section.content;
    } else if (t.includes('recomenda')) {
      defaults.recomendacoes = section.content;
    } else if (t.includes('perspectiva') || t.includes('conclus')) {
      defaults.perspectivas = section.content;
    }
  }

  // If resumo is still empty, use the first section
  if (!defaults.resumo && sections.length > 0) {
    defaults.resumo = sections[0].content;
  }

  return defaults;
}

// =============================================================================
// HTML Builder: Summary Cards
// =============================================================================

function buildSummaryCards(portfolio: any): string {
  const contas = portfolio?.contas ?? portfolio?.accounts ?? [];
  const investimentos = portfolio?.investimentos ?? portfolio?.investments ?? [];
  const cartoes = portfolio?.cartoes ?? portfolio?.cards ?? [];

  const totalContas = Array.isArray(contas)
    ? contas.reduce((sum: number, c: any) => sum + (parseFloat(c.saldo ?? c.balance ?? c.current_balance ?? '0') || 0), 0)
    : 0;
  const totalInvestimentos = Array.isArray(investimentos)
    ? investimentos.reduce((sum: number, i: any) => sum + (parseFloat(i.valor ?? i.value ?? i.current_value ?? '0') || 0), 0)
    : 0;
  const patrimonioLiquido = totalContas + totalInvestimentos;
  const totalCartoes = Array.isArray(cartoes)
    ? cartoes.reduce((sum: number, c: any) => sum + (parseFloat(c.fatura ?? c.invoice ?? c.openDebt ?? '0') || 0), 0)
    : 0;

  return `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0;">
      <div style="background: #F7FAFC; border-radius: 10px; padding: 16px; border: 1px solid #E2E8F0;">
        <div style="font-size: 10px; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Patrimonio Liquido</div>
        <div style="font-size: 20px; font-weight: 700; color: #080D14;">${formatCurrencyBR(patrimonioLiquido)}</div>
      </div>
      <div style="background: #F7FAFC; border-radius: 10px; padding: 16px; border: 1px solid #E2E8F0;">
        <div style="font-size: 10px; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Investimentos</div>
        <div style="font-size: 20px; font-weight: 700; color: #080D14;">${formatCurrencyBR(totalInvestimentos)}</div>
      </div>
      <div style="background: #F7FAFC; border-radius: 10px; padding: 16px; border: 1px solid #E2E8F0;">
        <div style="font-size: 10px; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Conta Corrente</div>
        <div style="font-size: 20px; font-weight: 700; color: #080D14;">${formatCurrencyBR(totalContas)}</div>
      </div>
      <div style="background: #F7FAFC; border-radius: 10px; padding: 16px; border: 1px solid #E2E8F0;">
        <div style="font-size: 10px; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Cartoes</div>
        <div style="font-size: 20px; font-weight: 700; color: #E53E3E;">${formatCurrencyBR(totalCartoes)}</div>
      </div>
    </div>
  `;
}

// =============================================================================
// HTML Builder: Market Indicator Chips
// =============================================================================

function buildMarketChips(market: any): string {
  if (!market) return '';

  const indicators = [
    { label: 'IBOV', value: market.ibov ?? market.ibovespa ?? null, suffix: 'pts' },
    { label: 'Selic', value: market.selic ?? null, suffix: '% a.a.' },
    { label: 'Dolar', value: market.dolar ?? market.usd ?? market.dollar ?? null, suffix: '' },
    { label: 'IPCA', value: market.ipca ?? null, suffix: '% a.a.' },
    { label: 'BTC', value: market.btc ?? market.bitcoin ?? null, suffix: '' },
  ];

  const chips = indicators
    .filter((ind) => ind.value != null)
    .map((ind) => {
      const formattedValue = typeof ind.value === 'number'
        ? (ind.suffix === 'pts'
          ? ind.value.toLocaleString('pt-BR')
          : ind.suffix.includes('%')
            ? `${ind.value.toFixed(2).replace('.', ',')}${ind.suffix}`
            : formatCurrencyBR(ind.value))
        : String(ind.value);
      return `
        <div style="display: inline-block; background: linear-gradient(135deg, #00D4AA10, #00D4AA20); border: 1px solid #00D4AA40; border-radius: 20px; padding: 6px 14px; margin: 4px; font-size: 11px;">
          <span style="color: #718096; font-weight: 600;">${ind.label}</span>
          <span style="color: #080D14; font-weight: 700; margin-left: 6px;">${formattedValue}</span>
        </div>
      `;
    })
    .join('');

  return `
    <div style="margin: 16px 0; text-align: center;">
      <div style="font-size: 11px; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; font-weight: 600;">Indicadores de Mercado</div>
      ${chips}
    </div>
  `;
}

// =============================================================================
// HTML Builder: Accounts Table
// =============================================================================

function buildAccountsTable(contas: any[]): string {
  if (!Array.isArray(contas) || contas.length === 0) {
    return '<p style="color: #718096; font-size: 12px; font-style: italic;">Nenhuma conta disponivel.</p>';
  }

  const rows = contas
    .map((c, i) => {
      const banco = c.banco ?? c.institution_name ?? c.institution ?? c.name ?? '-';
      const tipo = c.tipo ?? c.type ?? c.account_type ?? 'Corrente';
      const saldo = parseFloat(c.saldo ?? c.balance ?? c.current_balance ?? '0') || 0;
      const bgColor = i % 2 === 0 ? '#FFFFFF' : '#F7FAFC';
      return `
        <tr style="background: ${bgColor};">
          <td style="padding: 8px 12px; font-size: 12px; color: #2D3748; border-bottom: 1px solid #E2E8F0;">${banco}</td>
          <td style="padding: 8px 12px; font-size: 12px; color: #718096; border-bottom: 1px solid #E2E8F0;">${tipo}</td>
          <td style="padding: 8px 12px; font-size: 12px; color: #2D3748; font-weight: 600; text-align: right; border-bottom: 1px solid #E2E8F0;">${formatCurrencyBR(saldo)}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <table style="width: 100%; border-collapse: collapse; margin: 12px 0; border-radius: 8px; overflow: hidden;">
      <thead>
        <tr style="background: #080D14;">
          <th style="padding: 10px 12px; font-size: 11px; color: #FFFFFF; text-align: left; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Banco</th>
          <th style="padding: 10px 12px; font-size: 11px; color: #FFFFFF; text-align: left; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Tipo</th>
          <th style="padding: 10px 12px; font-size: 11px; color: #FFFFFF; text-align: right; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Saldo</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// =============================================================================
// HTML Builder: Investments Table
// =============================================================================

function buildInvestmentsTable(investimentos: any[]): string {
  if (!Array.isArray(investimentos) || investimentos.length === 0) {
    return '<p style="color: #718096; font-size: 12px; font-style: italic;">Nenhum investimento disponivel.</p>';
  }

  const rows = investimentos
    .map((inv, i) => {
      const ativo = inv.ativo ?? inv.name ?? inv.ticker ?? inv.symbol ?? '-';
      const tipo = inv.tipo ?? inv.type ?? inv.asset_class ?? inv.class ?? '-';
      const valor = parseFloat(inv.valor ?? inv.value ?? inv.current_value ?? '0') || 0;
      const instituicao = inv.instituicao ?? inv.institution ?? inv.institution_name ?? '-';
      const bgColor = i % 2 === 0 ? '#FFFFFF' : '#F7FAFC';
      return `
        <tr style="background: ${bgColor};">
          <td style="padding: 8px 12px; font-size: 12px; color: #2D3748; font-weight: 500; border-bottom: 1px solid #E2E8F0;">${ativo}</td>
          <td style="padding: 8px 12px; font-size: 12px; color: #718096; border-bottom: 1px solid #E2E8F0;">${tipo}</td>
          <td style="padding: 8px 12px; font-size: 12px; color: #2D3748; font-weight: 600; text-align: right; border-bottom: 1px solid #E2E8F0;">${formatCurrencyBR(valor)}</td>
          <td style="padding: 8px 12px; font-size: 12px; color: #718096; border-bottom: 1px solid #E2E8F0;">${instituicao}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <table style="width: 100%; border-collapse: collapse; margin: 12px 0; border-radius: 8px; overflow: hidden;">
      <thead>
        <tr style="background: #080D14;">
          <th style="padding: 10px 12px; font-size: 11px; color: #FFFFFF; text-align: left; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Ativo</th>
          <th style="padding: 10px 12px; font-size: 11px; color: #FFFFFF; text-align: left; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Tipo</th>
          <th style="padding: 10px 12px; font-size: 11px; color: #FFFFFF; text-align: right; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Valor</th>
          <th style="padding: 10px 12px; font-size: 11px; color: #FFFFFF; text-align: left; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Instituicao</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// =============================================================================
// HTML Builder: Cards Table
// =============================================================================

function buildCardsTable(cartoes: any[]): string {
  if (!Array.isArray(cartoes) || cartoes.length === 0) {
    return '<p style="color: #718096; font-size: 12px; font-style: italic;">Nenhum cartao disponivel.</p>';
  }

  const rows = cartoes
    .map((c, i) => {
      const bandeira = c.bandeira ?? c.brand ?? c.flag ?? '-';
      const final4 = c.final ?? c.last4 ?? c.lastFour ?? c.last_four ?? '-';
      const instituicao = c.instituicao ?? c.institution ?? c.institution_name ?? c.name ?? '-';
      const bgColor = i % 2 === 0 ? '#FFFFFF' : '#F7FAFC';
      return `
        <tr style="background: ${bgColor};">
          <td style="padding: 8px 12px; font-size: 12px; color: #2D3748; font-weight: 500; border-bottom: 1px solid #E2E8F0; text-transform: capitalize;">${bandeira}</td>
          <td style="padding: 8px 12px; font-size: 12px; color: #718096; border-bottom: 1px solid #E2E8F0;">**** ${final4}</td>
          <td style="padding: 8px 12px; font-size: 12px; color: #2D3748; border-bottom: 1px solid #E2E8F0;">${instituicao}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <table style="width: 100%; border-collapse: collapse; margin: 12px 0; border-radius: 8px; overflow: hidden;">
      <thead>
        <tr style="background: #080D14;">
          <th style="padding: 10px 12px; font-size: 11px; color: #FFFFFF; text-align: left; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Bandeira</th>
          <th style="padding: 10px 12px; font-size: 11px; color: #FFFFFF; text-align: left; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Final</th>
          <th style="padding: 10px 12px; font-size: 11px; color: #FFFFFF; text-align: left; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Instituicao</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// =============================================================================
// HTML Builder: Recommendations
// =============================================================================

function buildRecommendations(text: string): string {
  if (!text) return '';

  // Try to split by numbered recommendations like "1.", "2.", etc.
  const lines = text.split(/\n/).filter((l) => l.trim());
  const numbered = lines.filter((l) => /^\d+[\.\)]\s/.test(l.trim()));

  if (numbered.length > 0) {
    const cards = numbered
      .map((line) => {
        const cleaned = line.replace(/^\d+[\.\)]\s*/, '').trim();
        return `
          <div style="background: linear-gradient(135deg, #F0FFF4, #F7FAFC); border-left: 4px solid #00D4AA; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px;">
            <p style="font-size: 12px; color: #2D3748; line-height: 1.6; margin: 0;">${cleaned}</p>
          </div>
        `;
      })
      .join('');
    return cards;
  }

  // If no numbered items, just wrap paragraphs
  const paragraphs = lines
    .map((line) => {
      return `
        <div style="background: linear-gradient(135deg, #F0FFF4, #F7FAFC); border-left: 4px solid #00D4AA; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px;">
          <p style="font-size: 12px; color: #2D3748; line-height: 1.6; margin: 0;">${line.trim()}</p>
        </div>
      `;
    })
    .join('');
  return paragraphs;
}

// =============================================================================
// HTML Builder: Main Report
// =============================================================================

function buildReportHTML(data: ReportData): string {
  const sections = parseAnalysisSections(data.analysis ?? '');
  const portfolio = data.portfolio ?? {};
  const contas = portfolio.contas ?? portfolio.accounts ?? [];
  const investimentos = portfolio.investimentos ?? portfolio.investments ?? [];
  const cartoes = portfolio.cartoes ?? portfolio.cards ?? [];
  const dateFormatted = formatDateBR(data.generatedAt);
  const investorName = data.investorName || 'Investidor';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #2D3748;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ---- Cover Page ---- */
    .cover-page {
      width: 100%;
      min-height: 100vh;
      background: linear-gradient(135deg, #080D14 0%, #0D1520 50%, #1A2A3A 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 40px;
      page-break-after: always;
      position: relative;
      overflow: hidden;
    }
    .cover-page::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -30%;
      width: 80%;
      height: 80%;
      background: radial-gradient(circle, #00D4AA08 0%, transparent 70%);
      border-radius: 50%;
    }
    .cover-page::after {
      content: '';
      position: absolute;
      bottom: -40%;
      left: -20%;
      width: 60%;
      height: 60%;
      background: radial-gradient(circle, #00D4AA05 0%, transparent 70%);
      border-radius: 50%;
    }
    .cover-logo {
      font-size: 48px;
      font-weight: 800;
      color: #00D4AA;
      letter-spacing: 8px;
      margin-bottom: 8px;
      z-index: 1;
    }
    .cover-subtitle {
      font-size: 14px;
      color: #A0AEC0;
      letter-spacing: 4px;
      text-transform: uppercase;
      margin-bottom: 60px;
      z-index: 1;
    }
    .cover-divider {
      width: 80px;
      height: 2px;
      background: linear-gradient(90deg, transparent, #00D4AA, transparent);
      margin-bottom: 60px;
      z-index: 1;
    }
    .cover-report-title {
      font-size: 28px;
      font-weight: 700;
      color: #FFFFFF;
      text-align: center;
      margin-bottom: 8px;
      z-index: 1;
    }
    .cover-report-subtitle {
      font-size: 14px;
      color: #A0AEC0;
      text-align: center;
      margin-bottom: 48px;
      z-index: 1;
    }
    .cover-investor {
      font-size: 18px;
      font-weight: 600;
      color: #E2E8F0;
      margin-bottom: 8px;
      z-index: 1;
    }
    .cover-date {
      font-size: 13px;
      color: #718096;
      z-index: 1;
    }
    .cover-footer {
      position: absolute;
      bottom: 30px;
      font-size: 10px;
      color: #4A5568;
      z-index: 1;
    }

    /* ---- Content Pages ---- */
    .page {
      width: 100%;
      min-height: 100vh;
      padding: 40px;
      page-break-after: always;
      position: relative;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #E2E8F0;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .page-header-logo {
      font-size: 16px;
      font-weight: 800;
      color: #00D4AA;
      letter-spacing: 3px;
    }
    .page-header-title {
      font-size: 11px;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: #080D14;
      margin-bottom: 6px;
    }
    .section-subtitle {
      font-size: 12px;
      color: #718096;
      margin-bottom: 20px;
    }
    .analysis-text {
      font-size: 12px;
      color: #4A5568;
      line-height: 1.8;
      text-align: justify;
      margin-bottom: 20px;
    }
    .subsection-title {
      font-size: 15px;
      font-weight: 700;
      color: #080D14;
      margin-top: 24px;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #E2E8F0;
    }

    /* ---- Disclaimer ---- */
    .disclaimer {
      background: #FFF5F5;
      border: 1px solid #FEB2B2;
      border-radius: 8px;
      padding: 14px 16px;
      margin-top: 24px;
    }
    .disclaimer-title {
      font-size: 11px;
      font-weight: 700;
      color: #C53030;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .disclaimer-text {
      font-size: 10px;
      color: #742A2A;
      line-height: 1.6;
    }

    /* ---- Page Footer ---- */
    .page-footer {
      position: absolute;
      bottom: 20px;
      left: 40px;
      right: 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      color: #A0AEC0;
      border-top: 1px solid #E2E8F0;
      padding-top: 8px;
    }
  </style>
</head>
<body>

  <!-- ============ COVER PAGE ============ -->
  <div class="cover-page">
    <div class="cover-logo">ZURT</div>
    <div class="cover-subtitle">Wealth Intelligence</div>
    <div class="cover-divider"></div>
    <div class="cover-report-title">Relatorio Patrimonial</div>
    <div class="cover-report-subtitle">Analise completa do seu patrimonio financeiro</div>
    <div class="cover-investor">${investorName}</div>
    <div class="cover-date">${dateFormatted}</div>
    <div class="cover-footer">Documento gerado automaticamente pela plataforma ZURT - Confidencial</div>
  </div>

  <!-- ============ PAGE 2: RESUMO ============ -->
  <div class="page">
    <div class="page-header">
      <div class="page-header-logo">ZURT</div>
      <div class="page-header-title">Relatorio Patrimonial</div>
    </div>

    <div class="section-title">Resumo Executivo</div>
    <div class="section-subtitle">Visao geral do seu patrimonio e indicadores de mercado</div>

    ${buildSummaryCards(portfolio)}

    ${sections.resumo ? `<div class="analysis-text">${sections.resumo.replace(/\n/g, '<br>')}</div>` : ''}

    ${buildMarketChips(data.market)}

    ${sections.mercado ? `
      <div class="subsection-title">Cenario de Mercado</div>
      <div class="analysis-text">${sections.mercado.replace(/\n/g, '<br>')}</div>
    ` : ''}

    <div class="page-footer">
      <span>ZURT Wealth Intelligence</span>
      <span>Pagina 2</span>
      <span>${dateFormatted}</span>
    </div>
  </div>

  <!-- ============ PAGE 3: PATRIMONIO ============ -->
  <div class="page">
    <div class="page-header">
      <div class="page-header-logo">ZURT</div>
      <div class="page-header-title">Detalhamento do Patrimonio</div>
    </div>

    <div class="section-title">Detalhamento do Patrimonio</div>
    <div class="section-subtitle">Contas bancarias, investimentos e cartoes de credito</div>

    ${sections.patrimonio ? `<div class="analysis-text">${sections.patrimonio.replace(/\n/g, '<br>')}</div>` : ''}

    <div class="subsection-title">Contas Bancarias</div>
    ${buildAccountsTable(contas)}

    <div class="subsection-title">Investimentos</div>
    ${buildInvestmentsTable(investimentos)}

    ${sections.investimentos ? `<div class="analysis-text">${sections.investimentos.replace(/\n/g, '<br>')}</div>` : ''}

    <div class="subsection-title">Cartoes de Credito</div>
    ${buildCardsTable(cartoes)}

    ${sections.cartoes ? `<div class="analysis-text">${sections.cartoes.replace(/\n/g, '<br>')}</div>` : ''}

    <div class="page-footer">
      <span>ZURT Wealth Intelligence</span>
      <span>Pagina 3</span>
      <span>${dateFormatted}</span>
    </div>
  </div>

  <!-- ============ PAGE 4: RECOMENDACOES ============ -->
  <div class="page">
    <div class="page-header">
      <div class="page-header-logo">ZURT</div>
      <div class="page-header-title">Recomendacoes e Perspectivas</div>
    </div>

    <div class="section-title">Recomendacoes</div>
    <div class="section-subtitle">Sugestoes personalizadas para otimizacao do seu patrimonio</div>

    ${sections.recomendacoes ? buildRecommendations(sections.recomendacoes) : `
      <div style="background: linear-gradient(135deg, #F0FFF4, #F7FAFC); border-left: 4px solid #00D4AA; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px;">
        <p style="font-size: 12px; color: #2D3748; line-height: 1.6; margin: 0;">Conecte mais contas e investimentos para receber recomendacoes personalizadas baseadas no seu perfil.</p>
      </div>
    `}

    ${sections.perspectivas ? `
      <div class="subsection-title">Perspectivas</div>
      <div class="analysis-text">${sections.perspectivas.replace(/\n/g, '<br>')}</div>
    ` : ''}

    <div class="disclaimer">
      <div class="disclaimer-title">Aviso Legal</div>
      <div class="disclaimer-text">
        Este relatorio e gerado automaticamente pela plataforma ZURT com base nos dados financeiros conectados pelo usuario
        e em analises de inteligencia artificial. As informacoes contidas neste documento nao constituem recomendacao de investimento,
        consultoria financeira, ou aconselhamento profissional de qualquer natureza. Rentabilidade passada nao e garantia de resultados
        futuros. Todas as decisoes de investimento devem ser tomadas com base no seu proprio julgamento e, quando apropriado, com o auxilio
        de um profissional certificado pela CVM (Comissao de Valores Mobiliarios). A ZURT nao se responsabiliza por perdas ou danos
        decorrentes do uso das informacoes apresentadas neste relatorio. Os dados de mercado sao fornecidos por fontes publicas e podem
        apresentar atraso. Documento confidencial — uso exclusivo do titular.
      </div>
    </div>

    <div class="page-footer">
      <span>ZURT Wealth Intelligence</span>
      <span>Pagina 4</span>
      <span>${dateFormatted}</span>
    </div>
  </div>

</body>
</html>
  `;
}

// =============================================================================
// Main Screen Component
// =============================================================================

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useSettingsStore((s) => s.t);
  const colors = useSettingsStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedPeriod, setSelectedPeriod] = useState('1m');
  const [generating, setGenerating] = useState(false);

  // Pulsing animation for loading text
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (generating) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [generating, pulseAnim]);

  const periods = useMemo(
    () => [
      { key: '1m', label: t('report.lastMonth') },
      { key: '3m', label: t('report.last3Months') },
      { key: '6m', label: t('report.last6Months') },
      { key: '1y', label: t('report.lastYear') },
    ],
    [t],
  );

  const previewItems = useMemo(
    () => [
      t('report.item1'),
      t('report.item2'),
      t('report.item3'),
      t('report.item4'),
      t('report.item5'),
      t('report.item6'),
    ],
    [t],
  );

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      // Step 1: Call API to generate report data
      const data: ReportData = await generateReportApi(selectedPeriod);

      // Step 2: Build premium HTML from report data
      const html = buildReportHTML(data);

      // Step 3: Generate PDF file
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      // Step 4: Share via system share dialog
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Relatorio ZURT',
        UTI: 'com.adobe.pdf',
      });
    } catch (err: any) {
      console.log('[Report] Error generating report:', err?.message ?? err);
      Alert.alert(
        t('report.errorTitle') || 'Erro',
        t('report.errorMessage') || 'Nao foi possivel gerar o relatorio. Tente novamente.',
        [{ text: 'OK' }],
      );
    } finally {
      setGenerating(false);
    }
  }, [selectedPeriod, t]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, [router]);

  // ---- Loading State ----
  if (generating) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.headerBar}>
          <View style={styles.backBtn} />
          <Text style={styles.headerBarTitle}>{t('report.title')}</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Animated.Text style={[styles.loadingText, { opacity: pulseAnim }]}>
            {t('report.generating') || 'Gerando relatorio...'}
          </Animated.Text>
          <Text style={styles.loadingSubtext}>
            {t('report.generatingHint') || 'Isso pode levar alguns segundos'}
          </Text>
        </View>
      </View>
    );
  }

  // ---- Main UI ----
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerBarTitle}>{t('report.title')}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Subtitle */}
        <Text style={styles.subtitle}>
          {t('report.subtitle')}
        </Text>

        {/* Preview Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {t('report.previewTitle') || 'O que o relatorio inclui'}
          </Text>
          {previewItems.map((item, index) => (
            <View key={index} style={styles.previewItem}>
              <View style={styles.bulletDot} />
              <Text style={styles.previewText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Period Selector */}
        <View style={styles.periodSection}>
          <Text style={styles.periodLabel}>
            {t('report.period') || 'Periodo de analise'}
          </Text>
          <View style={styles.periodRow}>
            {periods.map((period) => {
              const isSelected = selectedPeriod === period.key;
              return (
                <TouchableOpacity
                  key={period.key}
                  style={[
                    styles.periodChip,
                    isSelected && styles.periodChipActive,
                  ]}
                  onPress={() => setSelectedPeriod(period.key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.periodChipText,
                      isSelected && styles.periodChipTextActive,
                    ]}
                  >
                    {period.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={styles.generateButton}
          onPress={handleGenerate}
          activeOpacity={0.8}
        >
          <Text style={styles.generateButtonEmoji}>{'\uD83D\uDCC4'}</Text>
          <Text style={styles.generateButtonText}>
            {t('report.generate') || 'Gerar Relatorio'}
          </Text>
        </TouchableOpacity>

        {/* Bottom spacing */}
        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // Header bar
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backIcon: {
      fontSize: 22,
      color: colors.text.primary,
    },
    headerBarTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
    },

    // Subtitle
    subtitle: {
      fontSize: 14,
      color: colors.text.secondary,
      lineHeight: 20,
      marginBottom: spacing.xl,
    },

    // Card
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xl,
      marginBottom: spacing.xl,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: spacing.lg,
    },

    // Preview items
    previewItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
    },
    bulletDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
      marginTop: 6,
      marginRight: spacing.md,
    },
    previewText: {
      flex: 1,
      fontSize: 14,
      color: colors.text.secondary,
      lineHeight: 20,
    },

    // Period selector
    periodSection: {
      marginBottom: spacing.xxl,
    },
    periodLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: spacing.md,
    },
    periodRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    periodChip: {
      flex: 1,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },
    periodChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent + '15',
    },
    periodChipText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    periodChipTextActive: {
      color: colors.accent,
    },

    // Generate button
    generateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      borderRadius: radius.lg,
      paddingVertical: spacing.lg + 2,
      paddingHorizontal: spacing.xxl,
      gap: spacing.sm,
    },
    generateButtonEmoji: {
      fontSize: 20,
    },
    generateButtonText: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.background,
    },

    // Loading
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.xxxl,
    },
    loadingText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      marginTop: spacing.lg,
    },
    loadingSubtext: {
      fontSize: 13,
      color: colors.text.secondary,
      textAlign: 'center',
    },

    // Scroll
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.xl,
    },
  });
