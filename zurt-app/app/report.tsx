// =============================================================================
// ZURT Wealth Intelligence — Premium PDF Report Screen
// Dark theme, gold accents, 5-page layout with real store data + AI analysis
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
import { usePortfolioStore } from '../src/stores/portfolioStore';
import { useCardsStore } from '../src/stores/cardsStore';
import { useAgentStore } from '../src/stores/agentStore';
import { useAuthStore } from '../src/stores/authStore';
import { generateReportApi } from '../src/services/api';
import { AppIcon } from '../src/hooks/useIcon';
import { logger } from '../src/utils/logger';

// =============================================================================
// Helpers
// =============================================================================

function fmtBRL(value: number): string {
  const safe = typeof value === 'number' && isFinite(value) ? value : 0;
  return safe.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

function fmtPct(value: number): string {
  const safe = typeof value === 'number' && isFinite(value) ? value : 0;
  const formatted = Math.abs(safe).toFixed(2).replace('.', ',');
  return safe >= 0 ? `+${formatted}%` : `-${formatted}%`;
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function dateByExtension(): string {
  return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// =============================================================================
// HTML Builder
// =============================================================================

function buildReportHTML(opts: {
  summary: any;
  institutions: any[];
  allocations: any[];
  cards: any[];
  assets: any[];
  transactions: any[];
  aiInsights: string;
  userName: string;
  aiAnalysis?: string;
}): string {
  const { summary, institutions, allocations, cards, assets, transactions, aiInsights, userName, aiAnalysis } = opts;

  const now = new Date();
  const dateStr = dateByExtension();
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const shortDate = now.toLocaleDateString('pt-BR');

  // Computed values
  const totalValue = summary?.totalValue ?? 0;
  const totalInvested = summary?.investedValue ?? assets.reduce((s: number, a: any) => s + (a.investedValue ?? 0), 0);
  const profit = totalValue - totalInvested;
  const var1m = summary?.variation1m ?? 0;
  const var12m = summary?.variation12m ?? 0;

  const totalFaturas = cards.reduce((s: number, c: any) => s + (c.currentInvoice ?? 0), 0);
  const totalLimite = cards.reduce((s: number, c: any) => s + (c.limit ?? 0), 0);

  const top15Assets = [...assets].sort((a: any, b: any) => (b.currentValue ?? 0) - (a.currentValue ?? 0)).slice(0, 15);
  const recentTx = transactions.slice(0, 15);

  // AI content — merge API analysis with local agent messages
  let aiContent = '';
  if (aiAnalysis && aiAnalysis.trim().length > 20) {
    aiContent = aiAnalysis.replace(/\n/g, '<br>');
  } else if (aiInsights && aiInsights.trim().length > 10) {
    aiContent = aiInsights.replace(/\n/g, '<br>');
  }

  const pageHeader = (page: number) => `
    <div class="ph">
      <div class="ph-left"><span class="ph-logo">ZURT</span><span class="ph-sep">|</span><span class="ph-type">Wealth Intelligence</span></div>
      <div class="ph-right">${userName} &bull; ${shortDate}</div>
    </div>`;

  const pageFooter = (page: number) => `
    <div class="pf">
      <div class="pf-line"></div>
      <div class="pf-row">
        <span class="pf-brand">ZURT Wealth Intelligence</span>
        <span class="pf-conf">Confidencial</span>
        <span class="pf-page">Página ${page}</span>
      </div>
    </div>`;

  // ---- PAGE 1: COVER ----
  const coverHTML = `
  <div class="cover">
    <div class="cover-accent-top"></div>
    <div class="cover-body">
      <div class="cover-logo">ZURT</div>
      <div class="cover-tagline">WEALTH INTELLIGENCE</div>
      <div class="cover-sep"></div>
      <div class="cover-title">Relatório Patrimonial</div>
      <div class="cover-value-label">PATRIMÔNIO TOTAL</div>
      <div class="cover-value">${fmtBRL(totalValue)}</div>
      <div class="cover-var">
        <span class="${var1m >= 0 ? 'pos' : 'neg'}">30d: ${fmtPct(var1m)}</span>
        <span class="cover-var-dot">&bull;</span>
        <span class="${var12m >= 0 ? 'pos' : 'neg'}">12m: ${fmtPct(var12m)}</span>
      </div>
      <div class="cover-client-label">PREPARADO PARA</div>
      <div class="cover-client">${userName.toUpperCase()}</div>
      <div class="cover-date">${dateStr}</div>
    </div>
    <div class="cover-footer">Documento confidencial &bull; Uso exclusivo do cliente</div>
    <div class="cover-accent-bottom"></div>
  </div>`;

  // ---- PAGE 2: EXECUTIVE SUMMARY ----
  const instRows = institutions.map((inst: any) => {
    const pct = totalValue > 0 ? ((inst.totalValue ?? 0) / totalValue * 100).toFixed(1) : '0.0';
    return `<tr>
      <td><span class="cdot" style="background:${inst.color ?? '#1A73E8'}"></span>${inst.name ?? '-'}</td>
      <td class="td-r td-b">${fmtBRL(inst.totalValue ?? 0)}</td>
      <td class="td-r">${pct.replace('.', ',')}%</td>
    </tr>`;
  }).join('');

  const allocBar = allocations.map((a: any) =>
    `<div style="width:${Math.max(a.percentage ?? 0, 1)}%;height:100%;background:${a.color ?? '#3A86FF'}"></div>`
  ).join('');

  const summaryHTML = `
  <div class="page">
    ${pageHeader(2)}
    <div class="page-content">
      <div class="sh"><div class="sh-num">01</div><div><div class="sh-title">Resumo Executivo</div><div class="sh-sub">Visão consolidada do patrimônio</div></div></div>

      <div class="kpi-row">
        <div class="kpi kpi-hl">
          <div class="kpi-label">Patrimônio Total</div>
          <div class="kpi-val green">${fmtBRL(totalValue)}</div>
          <div class="kpi-badge ${var1m >= 0 ? 'badge-pos' : 'badge-neg'}">${fmtPct(var1m)} no mês</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Total Faturas</div>
          <div class="kpi-val red">${fmtBRL(totalFaturas)}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Instituições</div>
          <div class="kpi-val gold">${institutions.length}</div>
        </div>
      </div>

      <div class="block-title">Distribuição por Instituição</div>
      <div class="alloc-bar">${allocBar}</div>
      <table>
        <thead><tr><th>Instituição</th><th class="td-r">Saldo</th><th class="td-r">% Total</th></tr></thead>
        <tbody>${instRows}</tbody>
      </table>
    </div>
    ${pageFooter(2)}
  </div>`;

  // ---- PAGE 3: CREDIT CARDS ----
  const cardBlocks = cards.map((c: any) => {
    const used = c.currentInvoice ?? 0;
    const limit = c.limit ?? 0;
    const available = limit - used;
    const usagePct = limit > 0 ? (used / limit * 100) : 0;
    const barColor = usagePct > 80 ? '#FF6B6B' : usagePct > 50 ? '#FFD93D' : '#00E99B';
    return `
    <div class="card-block">
      <div class="card-header">
        <div class="card-name">${c.name ?? '-'} <span class="muted">****${c.lastFour ?? '0000'}</span></div>
        <div class="card-brand">${capitalize(c.brand ?? '-')}</div>
      </div>
      <div class="card-data">
        <div class="card-item"><div class="card-item-label">Fatura Atual</div><div class="card-item-val red">${fmtBRL(used)}</div></div>
        <div class="card-item"><div class="card-item-label">Limite</div><div class="card-item-val">${fmtBRL(limit)}</div></div>
        <div class="card-item"><div class="card-item-label">Disponível</div><div class="card-item-val green">${fmtBRL(available)}</div></div>
      </div>
      <div class="usage-bar-bg"><div class="usage-bar-fill" style="width:${Math.min(usagePct, 100)}%;background:${barColor}"></div></div>
      <div class="usage-label">${usagePct.toFixed(0)}% utilizado</div>
    </div>`;
  }).join('');

  const cardsHTML = cards.length > 0 ? `
  <div class="page">
    ${pageHeader(3)}
    <div class="page-content">
      <div class="sh"><div class="sh-num">02</div><div><div class="sh-title">Cartões de Crédito</div><div class="sh-sub">Faturas e limites consolidados</div></div></div>

      ${cardBlocks}

      <div class="totals-bar">
        <div class="totals-item"><div class="totals-label">Total Faturas</div><div class="totals-val red">${fmtBRL(totalFaturas)}</div></div>
        <div class="totals-sep"></div>
        <div class="totals-item"><div class="totals-label">Limite Total</div><div class="totals-val">${fmtBRL(totalLimite)}</div></div>
        <div class="totals-sep"></div>
        <div class="totals-item"><div class="totals-label">Disponível Total</div><div class="totals-val green">${fmtBRL(totalLimite - totalFaturas)}</div></div>
      </div>
    </div>
    ${pageFooter(3)}
  </div>` : '';

  // ---- PAGE 4: TRANSACTIONS ----
  const txRows = recentTx.map((tx: any) => {
    const isNeg = (tx.amount ?? 0) < 0;
    return `<tr>
      <td>${fmtDate(tx.date)}</td>
      <td class="td-name">${tx.description || tx.merchant || '-'}</td>
      <td>${tx.institution_name || '-'}</td>
      <td class="td-r td-b ${isNeg ? 'neg' : 'pos'}">${fmtBRL(tx.amount ?? 0)}</td>
    </tr>`;
  }).join('');

  const transactionsHTML = recentTx.length > 0 ? `
  <div class="page">
    ${pageHeader(4)}
    <div class="page-content">
      <div class="sh"><div class="sh-num">03</div><div><div class="sh-title">Movimentações Recentes</div><div class="sh-sub">Últimas ${recentTx.length} transações</div></div></div>

      <table class="table-striped">
        <thead><tr><th>Data</th><th>Descrição</th><th>Instituição</th><th class="td-r">Valor</th></tr></thead>
        <tbody>${txRows}</tbody>
      </table>
    </div>
    ${pageFooter(4)}
  </div>` : '';

  // ---- PAGE 5: AI ANALYSIS + DISCLAIMER ----
  const lastPage = 3 + (cards.length > 0 ? 1 : 0) + (recentTx.length > 0 ? 1 : 0) + 1;
  const aiSection = aiContent
    ? `<div class="ai-card"><div class="ai-header">Análise ZURT Intelligence</div><div class="ai-text">${aiContent}</div></div>`
    : `<div class="ai-card ai-empty"><div class="ai-header">Análise ZURT Intelligence</div><div class="ai-text">Conecte suas contas e converse com o ZURT Agent para receber análises personalizadas do seu patrimônio.</div></div>`;

  const aiDisclaimerHTML = `
  <div class="page">
    ${pageHeader(lastPage)}
    <div class="page-content">
      <div class="sh"><div class="sh-num">${String(lastPage - 1).padStart(2, '0')}</div><div><div class="sh-title">Análise & Aviso Legal</div><div class="sh-sub">Inteligência artificial e informações legais</div></div></div>

      ${aiSection}

      <div class="disclaimer">
        <div class="disclaimer-title">Aviso Legal & Confidencialidade</div>
        <p>Este relatório foi gerado automaticamente pela plataforma ZURT Wealth Intelligence com base nos dados
        sincronizados das contas e instituições financeiras do titular.</p>
        <p>Os valores, rentabilidades e análises apresentados são meramente informativos e não constituem
        recomendação, consultoria ou aconselhamento de investimento. Rentabilidade passada não garante
        rentabilidade futura.</p>
        <p>As informações podem apresentar atraso ou divergência em relação aos valores reais das instituições
        financeiras. Consulte sempre um profissional qualificado (CVM/CFA) antes de tomar decisões de investimento.</p>
        <p><strong>Confidencialidade:</strong> Este documento é pessoal e confidencial, destinado exclusivamente
        ao titular identificado na capa.</p>
      </div>

      <div class="gen-info">
        <div class="gen-brand">ZURT Wealth Intelligence</div>
        <div class="gen-date">Gerado em ${dateStr} às ${timeStr}</div>
      </div>
    </div>
    ${pageFooter(lastPage)}
  </div>`;

  // ---- FULL HTML ----
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    background: #0A0F1C;
    color: #E8E8E8;
    font-size: 10px;
    line-height: 1.5;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* ===== COVER ===== */
  .cover {
    width: 210mm; min-height: 297mm;
    background: linear-gradient(180deg, #0A0F1C 0%, #111827 50%, #0A0F1C 100%);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; position: relative;
    page-break-after: always;
    page-break-inside: avoid;
    box-sizing: border-box;
  }
  .cover-accent-top, .cover-accent-bottom {
    position: absolute; left: 50%; transform: translateX(-50%);
    width: 180px; height: 1px;
    background: linear-gradient(90deg, transparent, #C9A84C, transparent);
  }
  .cover-accent-top { top: 50px; }
  .cover-accent-bottom { bottom: 50px; }
  .cover-body { z-index: 1; }
  .cover-logo {
    font-size: 48px; font-weight: 900; color: #00E99B;
    letter-spacing: 12px; margin-bottom: 6px;
  }
  .cover-tagline {
    font-size: 11px; color: #C9A84C; letter-spacing: 6px; margin-bottom: 40px;
  }
  .cover-sep {
    width: 80px; height: 1px; background: #C9A84C; margin: 0 auto 40px;
  }
  .cover-title {
    font-size: 32px; font-weight: 300; color: #FFFFFF; margin-bottom: 40px;
  }
  .cover-value-label {
    font-size: 9px; color: #94A3B8; letter-spacing: 3px; margin-bottom: 8px;
  }
  .cover-value {
    font-size: 44px; font-weight: 800; color: #00E99B; margin-bottom: 8px;
  }
  .cover-var { font-size: 12px; margin-bottom: 40px; }
  .cover-var-dot { color: #64748B; margin: 0 8px; }
  .cover-client-label {
    font-size: 9px; color: #64748B; letter-spacing: 3px; margin-bottom: 4px;
  }
  .cover-client {
    font-size: 18px; font-weight: 600; color: #FFFFFF; letter-spacing: 4px; margin-bottom: 8px;
  }
  .cover-date { font-size: 12px; color: #94A3B8; }
  .cover-footer {
    position: absolute; bottom: 28px; font-size: 9px; color: #4A5568; letter-spacing: 0.5px;
  }

  /* ===== PAGE ===== */
  .page {
    width: 210mm; min-height: 297mm;
    padding: 28px 32px;
    page-break-after: always;
    page-break-inside: avoid;
    position: relative;
    background: #0A0F1C;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }
  .page:last-child { page-break-after: avoid; }
  .page-content { flex: 1; }
  .ph {
    display: flex; justify-content: space-between; align-items: center;
    padding-bottom: 10px; margin-bottom: 18px; border-bottom: 1px solid #C9A84C30;
    flex-shrink: 0;
  }
  .ph-left, .ph-right { display: flex; align-items: center; gap: 6px; font-size: 9px; color: #94A3B8; }
  .ph-logo { font-size: 13px; font-weight: 800; color: #00E99B; letter-spacing: 3px; }
  .ph-sep { color: #C9A84C40; }
  .ph-type { font-style: italic; color: #C9A84C; }
  .pf {
    margin-top: auto; flex-shrink: 0;
    padding-top: 8px;
  }
  .pf-line { height: 1px; background: #C9A84C20; margin-bottom: 6px; }
  .pf-row { display: flex; justify-content: space-between; font-size: 8px; color: #64748B; }
  .pf-brand { color: #C9A84C80; letter-spacing: 1px; }
  .pf-conf { font-style: italic; }
  .pf-page { color: #94A3B8; }

  /* ===== SECTION HEADING ===== */
  .sh { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 18px; }
  .sh-num { font-size: 26px; font-weight: 800; color: #C9A84C30; line-height: 1; min-width: 36px; }
  .sh-title { font-size: 17px; font-weight: 700; color: #FFFFFF; }
  .sh-sub { font-size: 10px; color: #94A3B8; font-style: italic; margin-top: 2px; }

  /* ===== KPI ===== */
  .kpi-row { display: flex; gap: 12px; margin-bottom: 20px; }
  .kpi {
    flex: 1; background: #111827; border: 1px solid #1E293B; border-radius: 8px;
    padding: 14px; text-align: center;
  }
  .kpi-hl { border-color: #00E99B30; background: linear-gradient(180deg, #111827, #0D1B1580); }
  .kpi-label { font-size: 8px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .kpi-val { font-size: 18px; font-weight: 800; color: #FFFFFF; }
  .kpi-val.green { color: #00E99B; }
  .kpi-val.red { color: #FF6B6B; }
  .kpi-val.gold { color: #C9A84C; }
  .kpi-badge {
    display: inline-block; padding: 2px 8px; border-radius: 10px;
    font-size: 9px; font-weight: 600; margin-top: 4px;
  }
  .badge-pos { background: #00E99B18; color: #00E99B; }
  .badge-neg { background: #FF6B6B18; color: #FF6B6B; }

  /* ===== TABLES ===== */
  .block-title {
    font-size: 12px; font-weight: 700; color: #C9A84C; letter-spacing: 0.5px;
    padding-bottom: 6px; border-bottom: 1px solid #C9A84C20; margin-bottom: 10px;
  }
  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left; font-size: 8px; font-weight: 700; color: #C9A84C;
    text-transform: uppercase; letter-spacing: 0.5px; padding: 7px 6px;
    border-bottom: 1px solid #C9A84C30;
  }
  td { padding: 6px; font-size: 10px; color: #E8E8E8; border-bottom: 1px solid #1E293B; }
  .table-striped tbody tr:nth-child(even) td { background: #11182780; }
  .td-r { text-align: right; }
  .td-b { font-weight: 700; }
  .td-name { font-weight: 600; color: #FFFFFF; }
  .cdot {
    display: inline-block; width: 8px; height: 8px; border-radius: 2px;
    margin-right: 6px; vertical-align: middle;
  }
  .muted { color: #64748B; font-size: 9px; }

  /* ===== ALLOC BAR ===== */
  .alloc-bar {
    display: flex; height: 10px; border-radius: 5px; overflow: hidden; margin-bottom: 12px;
  }

  /* ===== CARD BLOCKS ===== */
  .card-block {
    background: #111827; border: 1px solid #1E293B; border-radius: 8px;
    padding: 14px; margin-bottom: 12px;
  }
  .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .card-name { font-size: 13px; font-weight: 700; color: #FFFFFF; }
  .card-brand { font-size: 10px; color: #C9A84C; font-weight: 600; text-transform: uppercase; }
  .card-data { display: flex; gap: 16px; margin-bottom: 10px; }
  .card-item { flex: 1; }
  .card-item-label { font-size: 8px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
  .card-item-val { font-size: 14px; font-weight: 700; color: #FFFFFF; }
  .card-item-val.red { color: #FF6B6B; }
  .card-item-val.green { color: #00E99B; }
  .usage-bar-bg { height: 6px; background: #1E293B; border-radius: 3px; overflow: hidden; }
  .usage-bar-fill { height: 100%; border-radius: 3px; }
  .usage-label { font-size: 9px; color: #94A3B8; margin-top: 4px; text-align: right; }

  .totals-bar {
    display: flex; align-items: center; justify-content: center; gap: 20px;
    background: #111827; border: 1px solid #1E293B; border-radius: 8px;
    padding: 14px 20px; margin-top: 16px;
  }
  .totals-item { text-align: center; flex: 1; }
  .totals-label { font-size: 8px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
  .totals-val { font-size: 16px; font-weight: 800; color: #FFFFFF; }
  .totals-val.red { color: #FF6B6B; }
  .totals-val.green { color: #00E99B; }
  .totals-sep { width: 1px; height: 28px; background: #C9A84C20; }

  /* ===== AI SECTION ===== */
  .ai-card {
    background: linear-gradient(135deg, #0D2818, #111827); border: 1px solid #00E99B30;
    border-radius: 8px; padding: 18px; margin-bottom: 20px;
  }
  .ai-empty { border-color: #1E293B; background: #111827; }
  .ai-header {
    font-size: 13px; font-weight: 700; color: #00E99B; margin-bottom: 10px;
    padding-bottom: 6px; border-bottom: 1px solid #00E99B20;
  }
  .ai-text { font-size: 11px; color: #CBD5E1; line-height: 1.8; }

  /* ===== DISCLAIMER ===== */
  .disclaimer {
    background: #111827; border: 1px solid #1E293B; border-radius: 8px;
    padding: 16px; margin-bottom: 20px;
  }
  .disclaimer-title {
    font-size: 12px; font-weight: 700; color: #C9A84C; margin-bottom: 10px;
    padding-bottom: 6px; border-bottom: 1px solid #C9A84C20;
  }
  .disclaimer p {
    font-size: 9px; color: #94A3B8; line-height: 1.7; margin-bottom: 8px;
  }
  .gen-info { text-align: center; margin-top: 12px; }
  .gen-brand { font-size: 11px; font-weight: 700; color: #C9A84C; letter-spacing: 2px; }
  .gen-date { font-size: 9px; color: #94A3B8; margin-top: 2px; }

  /* ===== UTILS ===== */
  .pos { color: #00E99B; }
  .neg { color: #FF6B6B; }
  .green { color: #00E99B; }
  .red { color: #FF6B6B; }
  .gold { color: #C9A84C; }
</style>
</head>
<body>${coverHTML}${summaryHTML}${cardsHTML}${transactionsHTML}${aiDisclaimerHTML}</body>
</html>`;
}

// =============================================================================
// Main Screen Component
// =============================================================================

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useSettingsStore((s) => s.t);
  const colors = useSettingsStore((s) => s.colors);
  const language = useSettingsStore((s) => s.language);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedPeriod, setSelectedPeriod] = useState('1m');
  const [generating, setGenerating] = useState(false);

  // Pulsing animation for loading text
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (generating) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
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
      logger.log('[Report] Collecting data from stores...');

      // 1. Get data from local stores (always available)
      const { summary, institutions, allocations, assets, insights: portfolioInsights } = usePortfolioStore.getState();
      const { cards, dashboardTransactions } = useCardsStore.getState();
      const user = useAuthStore.getState().user;
      const agentState = useAgentStore.getState();

      const userName = user?.name || 'Investidor';

      // 2. Get AI insights from all possible sources
      const assistantMessages = agentState.messages
        ?.filter((m: any) => m.role === 'assistant')
        .map((m: any) => m.content)
        .filter(Boolean) ?? [];
      const localAiInsights = assistantMessages.length > 0
        ? assistantMessages[assistantMessages.length - 1]
        : portfolioInsights?.map((ins: any) => `[${capitalize(ins.type)}] ${ins.text}`).join('\n\n') || '';

      // 3. Try to get AI report analysis from API (non-blocking)
      let aiAnalysis = '';
      try {
        logger.log('[Report] Calling generateReportApi...');
        const apiData = await generateReportApi(selectedPeriod, language);
        aiAnalysis = apiData?.analysis ?? '';
        logger.log('[Report] API analysis received, length:', aiAnalysis.length);
      } catch (apiErr: any) {
        logger.log('[Report] API analysis failed (non-critical):', apiErr?.message);
        // Continue with local data — API failure is not fatal
      }

      const reportData = {
        summary: summary ?? { totalValue: 0, investedValue: 0, profit: 0, variation1m: 0, variation12m: 0, history: [] },
        institutions: institutions ?? [],
        allocations: allocations ?? [],
        cards: cards ?? [],
        assets: assets ?? [],
        transactions: dashboardTransactions ?? [],
        aiInsights: localAiInsights,
        userName,
        aiAnalysis,
      };

      logger.log('[Report] Data collected:', JSON.stringify({
        totalValue: reportData.summary.totalValue,
        institutions: reportData.institutions.length,
        cards: reportData.cards.length,
        assets: reportData.assets.length,
        transactions: reportData.transactions.length,
        hasAiAnalysis: !!aiAnalysis,
        hasLocalInsights: !!localAiInsights,
      }));

      // 4. Build HTML
      logger.log('[Report] Generating HTML...');
      const html = buildReportHTML(reportData);
      logger.log('[Report] HTML generated, length:', html.length);

      // 5. Generate PDF
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });
      logger.log('[Report] PDF created at:', uri);

      // 6. Share
      const fileName = 'ZURT_Relatorio_' + new Date().toISOString().split('T')[0] + '.pdf';
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: fileName,
        UTI: 'com.adobe.pdf',
      });
    } catch (error: any) {
      logger.log('[Report] Error generating PDF:', error?.message ?? error);
      Alert.alert(
        t('common.error'),
        t('report.error') + '\n\n' + (error?.message ?? ''),
        [{ text: t('common.ok') }],
      );
    } finally {
      setGenerating(false);
    }
  }, [selectedPeriod, language, t]);

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
            {t('report.generating')}
          </Animated.Text>
          <Text style={styles.loadingSubtext}>
            {t('report.generatingHint')}
          </Text>
        </View>
      </View>
    );
  }

  // ---- Main UI ----
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <AppIcon name="back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerBarTitle}>{t('report.title')}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>{t('report.subtitle')}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('report.previewTitle')}</Text>
          {previewItems.map((item, index) => (
            <View key={index} style={styles.previewItem}>
              <View style={styles.bulletDot} />
              <Text style={styles.previewText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.periodSection}>
          <Text style={styles.periodLabel}>{t('report.period')}</Text>
          <View style={styles.periodRow}>
            {periods.map((period) => {
              const isSelected = selectedPeriod === period.key;
              return (
                <TouchableOpacity
                  key={period.key}
                  style={[styles.periodChip, isSelected && styles.periodChipActive]}
                  onPress={() => setSelectedPeriod(period.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.periodChipText, isSelected && styles.periodChipTextActive]}>
                    {period.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={styles.generateButton} onPress={handleGenerate} activeOpacity={0.8}>
          <AppIcon name="report" size={20} color={colors.background} />
          <Text style={styles.generateButtonText}>{t('report.generate')}</Text>
        </TouchableOpacity>

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
    headerBarTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
    },
    subtitle: {
      fontSize: 14,
      color: colors.text.secondary,
      lineHeight: 20,
      marginBottom: spacing.xl,
    },
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
    generateButtonText: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.background,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      paddingHorizontal: 40,
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
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.xl,
    },
  });
