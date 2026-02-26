// =============================================================================
// ZURT Wealth Intelligence — Premium PDF Report Generator
// Elite wealth management report (UBS / Credit Suisse / BTG Private tier)
// Uses expo-print + expo-sharing to generate & share a patrimonial PDF
// =============================================================================

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { PortfolioSummary, Institution, Allocation, CreditCard, Asset, Insight } from '../types';
import type { DashboardTransaction } from './api';
import type { User } from '../types';

export interface ReportData {
  summary: PortfolioSummary;
  institutions: Institution[];
  allocations: Allocation[];
  cards: CreditCard[];
  assets: Asset[];
  transactions?: DashboardTransaction[];
  insights?: Insight[];
}

// =============================================================================
// Formatters
// =============================================================================

function fmt(value: number): string {
  const safe = typeof value === 'number' && isFinite(value) ? value : 0;
  return safe.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtPct(value: number): string {
  const safe = typeof value === 'number' && isFinite(value) ? value : 0;
  const formatted = Math.abs(safe).toFixed(2).replace('.', ',');
  return safe >= 0 ? `+${formatted}%` : `-${formatted}%`;
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// =============================================================================
// HTML Builder
// =============================================================================

function buildReportHTML(data: ReportData, user: User, accentColor: string): string {
  const { summary, institutions, allocations, cards, assets, transactions = [], insights = [] } = data;
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const shortDate = now.toLocaleDateString('pt-BR');

  const gold = '#C9A84C';
  const goldLight = '#D4B96A';
  const goldDark = '#A68B3C';

  const top10 = [...assets].sort((a, b) => b.currentValue - a.currentValue).slice(0, 10);
  const allAssetsSorted = [...assets].sort((a, b) => b.currentValue - a.currentValue);
  const recentTx = transactions.slice(0, 15);

  // Performance by class
  const classPerfMap = new Map<string, { value: number; invested: number; label: string; color: string }>();
  allocations.forEach((alloc) => {
    const classAssets = assets.filter((a) => a.class === alloc.class);
    const value = classAssets.reduce((s, a) => s + a.currentValue, 0);
    const invested = classAssets.reduce((s, a) => s + (a.investedValue ?? a.currentValue), 0);
    classPerfMap.set(alloc.class, { value, invested, label: alloc.label, color: alloc.color });
  });

  // Total invested
  const totalInvested = assets.reduce((s, a) => s + (a.investedValue ?? 0), 0);
  const totalProfit = summary.totalValue - totalInvested;
  const profitPct = totalInvested > 0 ? ((totalProfit / totalInvested) * 100) : 0;

  // Cards totals
  const totalCardLimit = cards.reduce((s, c) => s + c.limit, 0);
  const totalCardUsed = cards.reduce((s, c) => s + c.currentInvoice, 0);
  const cardUsagePct = totalCardLimit > 0 ? ((totalCardUsed / totalCardLimit) * 100) : 0;

  let pageNum = 0;
  const nextPage = () => ++pageNum;

  const pageHeader = (page: number) => `
    <div class="page-header">
      <div class="page-header-left">
        <span class="header-logo">ZURT</span>
        <span class="header-sep">|</span>
        <span class="header-type">Wealth Intelligence</span>
      </div>
      <div class="page-header-right">
        <span>${user.name}</span>
        <span class="header-sep">|</span>
        <span>${shortDate}</span>
      </div>
    </div>`;

  const pageFooter = (page: number) => `
    <div class="page-footer">
      <div class="footer-line"></div>
      <div class="footer-content">
        <span class="footer-brand">ZURT Wealth Intelligence</span>
        <span class="footer-confidential">Confidencial</span>
        <span class="footer-page">Página ${page}</span>
      </div>
    </div>`;

  // ======================== COVER ========================
  const coverHTML = `
  <div class="cover">
    <div class="cover-top-line"></div>
    <div class="cover-content">
      <div class="cover-logo">ZURT</div>
      <div class="cover-tagline">WEALTH INTELLIGENCE</div>
      <div class="cover-divider">
        <div class="cover-divider-line"></div>
        <div class="cover-divider-diamond">&#9670;</div>
        <div class="cover-divider-line"></div>
      </div>
      <div class="cover-title">Relatório Patrimonial</div>
      <div class="cover-subtitle">Análise Consolidada de Investimentos</div>
      <div class="cover-value-section">
        <div class="cover-value-label">PATRIMÔNIO TOTAL</div>
        <div class="cover-value">${fmt(summary.totalValue)}</div>
        <div class="cover-variation">
          <span class="${summary.variation1m >= 0 ? 'positive' : 'negative'}">
            30d: ${fmtPct(summary.variation1m)}
          </span>
          <span class="cover-var-sep">•</span>
          <span class="${summary.variation12m >= 0 ? 'positive' : 'negative'}">
            12m: ${fmtPct(summary.variation12m)}
          </span>
        </div>
      </div>
      <div class="cover-client">
        <div class="cover-client-label">PREPARADO PARA</div>
        <div class="cover-client-name">${user.name}</div>
      </div>
      <div class="cover-date">${dateStr}</div>
    </div>
    <div class="cover-bottom-line"></div>
  </div>`;

  // ======================== PAGE 1: EXECUTIVE SUMMARY ========================
  const p1 = nextPage();
  const execSummaryHTML = `
  <div class="page">
    ${pageHeader(p1)}
    <div class="section-heading">
      <div class="section-number">01</div>
      <div>
        <div class="section-title">Resumo Executivo</div>
        <div class="section-subtitle">Visão consolidada do patrimônio</div>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card kpi-highlight">
        <div class="kpi-icon">&#9670;</div>
        <div class="kpi-label">Patrimônio Total</div>
        <div class="kpi-value gold">${fmt(summary.totalValue)}</div>
        <div class="kpi-badge ${summary.variation1m >= 0 ? 'badge-positive' : 'badge-negative'}">
          ${fmtPct(summary.variation1m)} no mês
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Investido</div>
        <div class="kpi-value">${fmt(summary.investedValue)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Lucro / Prejuízo</div>
        <div class="kpi-value ${totalProfit >= 0 ? 'positive' : 'negative'}">${fmt(totalProfit)}</div>
        <div class="kpi-sub">${fmtPct(profitPct)} sobre investido</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Rentabilidade 12 Meses</div>
        <div class="kpi-value ${summary.variation12m >= 0 ? 'positive' : 'negative'}">${fmtPct(summary.variation12m)}</div>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-item">
        <div class="stat-value gold">${institutions.length}</div>
        <div class="stat-label">Instituições</div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-value gold">${assets.length}</div>
        <div class="stat-label">Ativos</div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-value gold">${allocations.length}</div>
        <div class="stat-label">Classes</div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-value gold">${cards.length}</div>
        <div class="stat-label">Cartões</div>
      </div>
    </div>

    <div class="section-block">
      <div class="section-block-title">Alocação por Classe de Ativo</div>
      <div class="alloc-bar">
        ${allocations.map((a) => `<div class="alloc-segment" style="width:${Math.max(a.percentage, 1)}%;background:${a.color}"></div>`).join('')}
      </div>
      <table>
        <thead>
          <tr>
            <th>Classe</th>
            <th>Alocação</th>
            <th>Investido</th>
            <th>Valor Atual</th>
            <th>Resultado</th>
          </tr>
        </thead>
        <tbody>
          ${allocations.map((a) => {
            const perf = classPerfMap.get(a.class);
            const invested = perf?.invested ?? 0;
            const result = a.value - invested;
            return `
          <tr>
            <td><span class="color-dot" style="background:${a.color}"></span>${a.label}</td>
            <td>${a.percentage.toFixed(1).replace('.', ',')}%</td>
            <td>${fmt(invested)}</td>
            <td>${fmt(a.value)}</td>
            <td class="${result >= 0 ? 'positive' : 'negative'}">${fmt(result)}</td>
          </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    ${pageFooter(p1)}
  </div>`;

  // ======================== PAGE 2: INVESTMENT PORTFOLIO ========================
  const p2 = nextPage();
  const portfolioHTML = `
  <div class="page">
    ${pageHeader(p2)}
    <div class="section-heading">
      <div class="section-number">02</div>
      <div>
        <div class="section-title">Carteira de Investimentos</div>
        <div class="section-subtitle">Top ${top10.length} ativos por valor</div>
      </div>
    </div>

    <table class="table-striped">
      <thead>
        <tr>
          <th>Ativo</th>
          <th>Ticker</th>
          <th>Classe</th>
          <th>Qtd</th>
          <th>Preço Médio</th>
          <th>Preço Atual</th>
          <th>Investido</th>
          <th>Valor Atual</th>
          <th>Var.</th>
        </tr>
      </thead>
      <tbody>
        ${top10.map((a) => `
        <tr>
          <td class="td-name">${a.name}</td>
          <td class="td-ticker">${a.ticker || '-'}</td>
          <td>${a.class || '-'}</td>
          <td>${a.quantity?.toLocaleString('pt-BR') ?? '-'}</td>
          <td>${a.averagePrice ? fmt(a.averagePrice) : '-'}</td>
          <td>${a.currentPrice ? fmt(a.currentPrice) : '-'}</td>
          <td>${fmt(a.investedValue ?? 0)}</td>
          <td class="td-bold">${fmt(a.currentValue)}</td>
          <td class="${a.variation >= 0 ? 'positive' : 'negative'} td-bold">${fmtPct(a.variation)}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    ${allAssetsSorted.length > 10 ? `
    <div class="section-block" style="margin-top:20px">
      <div class="section-block-title">Demais Ativos (${allAssetsSorted.length - 10})</div>
      <table class="table-compact">
        <thead>
          <tr>
            <th>Ativo</th>
            <th>Ticker</th>
            <th>Instituição</th>
            <th>Valor</th>
            <th>Var.</th>
          </tr>
        </thead>
        <tbody>
          ${allAssetsSorted.slice(10).map((a) => `
          <tr>
            <td>${a.name}</td>
            <td>${a.ticker || '-'}</td>
            <td>${a.institution || '-'}</td>
            <td>${fmt(a.currentValue)}</td>
            <td class="${a.variation >= 0 ? 'positive' : 'negative'}">${fmtPct(a.variation)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${pageFooter(p2)}
  </div>`;

  // ======================== PAGE 3: INSTITUTIONS ========================
  const p3 = nextPage();
  const institutionsHTML = `
  <div class="page">
    ${pageHeader(p3)}
    <div class="section-heading">
      <div class="section-number">03</div>
      <div>
        <div class="section-title">Contas & Instituições</div>
        <div class="section-subtitle">Detalhamento por instituição financeira</div>
      </div>
    </div>

    <table class="table-striped">
      <thead>
        <tr>
          <th>Instituição</th>
          <th>Ativos</th>
          <th>Status</th>
          <th>Valor Total</th>
          <th>% Patrimônio</th>
        </tr>
      </thead>
      <tbody>
        ${institutions.map((inst) => {
          const statusLabel = inst.status === 'connected' ? 'Conectado' : inst.status === 'syncing' ? 'Sincronizando' : 'Erro';
          const statusClass = inst.status === 'connected' ? 'status-ok' : inst.status === 'syncing' ? 'status-warn' : 'status-err';
          const pct = summary.totalValue > 0 ? ((inst.totalValue / summary.totalValue) * 100).toFixed(1) : '0.0';
          return `
        <tr>
          <td><span class="color-dot" style="background:${inst.color}"></span>${inst.name}</td>
          <td>${inst.assetCount}</td>
          <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
          <td class="td-bold">${fmt(inst.totalValue)}</td>
          <td>${pct.replace('.', ',')}%</td>
        </tr>`;
        }).join('')}
      </tbody>
    </table>

    ${cards.length > 0 ? `
    <div class="section-block" style="margin-top:28px">
      <div class="section-block-title">Cartões de Crédito</div>

      <div class="card-summary-row">
        <div class="card-summary-item">
          <div class="card-summary-label">Limite Total</div>
          <div class="card-summary-value">${fmt(totalCardLimit)}</div>
        </div>
        <div class="card-summary-item">
          <div class="card-summary-label">Fatura Atual Total</div>
          <div class="card-summary-value ${cardUsagePct > 80 ? 'negative' : ''}">${fmt(totalCardUsed)}</div>
        </div>
        <div class="card-summary-item">
          <div class="card-summary-label">Utilização Média</div>
          <div class="card-summary-value ${cardUsagePct > 80 ? 'negative' : cardUsagePct > 50 ? 'warning' : 'positive'}">${cardUsagePct.toFixed(0)}%</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Cartão</th>
            <th>Bandeira</th>
            <th>Limite</th>
            <th>Fatura Atual</th>
            <th>Próx. Fatura</th>
            <th>Utilização</th>
          </tr>
        </thead>
        <tbody>
          ${cards.map((c) => {
            const usage = c.limit > 0 ? ((c.currentInvoice / c.limit) * 100) : 0;
            const usageClass = usage > 80 ? 'negative' : usage > 50 ? 'warning' : 'positive';
            return `
          <tr>
            <td class="td-name">${c.name} <span class="text-muted">****${c.lastFour}</span></td>
            <td>${capitalize(c.brand)}</td>
            <td>${fmt(c.limit)}</td>
            <td>${fmt(c.currentInvoice)}</td>
            <td>${fmt(c.nextInvoice ?? 0)}</td>
            <td class="${usageClass} td-bold">${usage.toFixed(0)}%</td>
          </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${pageFooter(p3)}
  </div>`;

  // ======================== PAGE 4: TRANSACTIONS (optional) ========================
  const hasTransactions = recentTx.length > 0;
  let p4 = 0;
  const transactionsHTML = hasTransactions ? (() => {
    p4 = nextPage();
    return `
  <div class="page">
    ${pageHeader(p4)}
    <div class="section-heading">
      <div class="section-number">04</div>
      <div>
        <div class="section-title">Movimentações Recentes</div>
        <div class="section-subtitle">Últimas ${recentTx.length} transações</div>
      </div>
    </div>

    <table class="table-striped">
      <thead>
        <tr>
          <th>Data</th>
          <th>Descrição</th>
          <th>Instituição</th>
          <th>Categoria</th>
          <th>Valor</th>
        </tr>
      </thead>
      <tbody>
        ${recentTx.map((tx) => {
          const isNeg = tx.amount < 0;
          return `
        <tr>
          <td>${fmtDate(tx.date)}</td>
          <td class="td-name">${tx.description || tx.merchant || '-'}</td>
          <td>${tx.institution_name || '-'}</td>
          <td>${capitalize(tx.category || '-')}</td>
          <td class="${isNeg ? 'negative' : 'positive'} td-bold">${fmt(tx.amount)}</td>
        </tr>`;
        }).join('')}
      </tbody>
    </table>

    ${pageFooter(p4)}
  </div>`;
  })() : '';

  // ======================== PAGE 5: AI INSIGHTS (optional) ========================
  const hasInsights = insights.length > 0;
  let p5 = 0;
  const insightsHTML = hasInsights ? (() => {
    p5 = nextPage();
    const insightIcon: Record<string, string> = {
      warning: '&#9888;',
      opportunity: '&#9733;',
      info: '&#8505;',
    };
    return `
  <div class="page">
    ${pageHeader(p5)}
    <div class="section-heading">
      <div class="section-number">${String(p5).padStart(2, '0')}</div>
      <div>
        <div class="section-title">Análise ZURT Intelligence</div>
        <div class="section-subtitle">Insights gerados por inteligência artificial</div>
      </div>
    </div>

    <div class="insights-grid">
      ${insights.map((ins) => {
        const typeClass = ins.type === 'warning' ? 'insight-warning' : ins.type === 'opportunity' ? 'insight-opportunity' : 'insight-info';
        const typeLabel = ins.type === 'warning' ? 'Alerta' : ins.type === 'opportunity' ? 'Oportunidade' : 'Informação';
        return `
      <div class="insight-card ${typeClass}">
        <div class="insight-header">
          <span class="insight-icon">${insightIcon[ins.type] ?? '&#8505;'}</span>
          <span class="insight-type">${typeLabel}</span>
        </div>
        <div class="insight-text">${ins.text}</div>
      </div>`;
      }).join('')}
    </div>

    <div class="ai-disclaimer">
      <strong>Nota:</strong> Os insights acima foram gerados por inteligência artificial com base nos dados
      da sua carteira. Eles não constituem recomendação de investimento. Consulte sempre um profissional
      qualificado.
    </div>

    ${pageFooter(p5)}
  </div>`;
  })() : '';

  // ======================== DISCLAIMER PAGE ========================
  const pDisclaimer = nextPage();
  const disclaimerHTML = `
  <div class="page disclaimer-page">
    ${pageHeader(pDisclaimer)}
    <div class="disclaimer-content">
      <div class="disclaimer-icon">&#9670;</div>
      <div class="disclaimer-title">Aviso Legal & Confidencialidade</div>
      <div class="disclaimer-text">
        <p>Este relatório foi gerado automaticamente pela plataforma <strong>ZURT Wealth Intelligence</strong>
        com base nos dados sincronizados das contas e instituições financeiras do titular.</p>
        <p>Os valores, rentabilidades e análises apresentados são meramente informativos e não constituem
        recomendação, consultoria ou aconselhamento de investimento. Rentabilidade passada não garante
        rentabilidade futura.</p>
        <p>As informações contidas neste documento podem apresentar atraso, divergência ou imprecisão em
        relação aos valores reais mantidos nas instituições financeiras de origem. A ZURT não se
        responsabiliza por decisões tomadas com base exclusivamente nas informações deste relatório.</p>
        <p>Consulte sempre um profissional qualificado (CVM/CFA) antes de tomar decisões de investimento.</p>
        <p><strong>Confidencialidade:</strong> Este documento é pessoal e confidencial, destinado exclusivamente
        ao titular identificado na capa. A reprodução, distribuição ou divulgação não autorizada é proibida.</p>
      </div>
      <div class="disclaimer-footer-block">
        <div class="disclaimer-brand">ZURT Wealth Intelligence</div>
        <div class="disclaimer-generated">Gerado em ${dateStr} às ${timeStr}</div>
        <div class="disclaimer-id">ID: ${now.getTime().toString(36).toUpperCase()}</div>
      </div>
    </div>
    ${pageFooter(pDisclaimer)}
  </div>`;

  // ======================== FULL HTML ========================
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @page { margin: 0; size: A4; }
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Georgia', 'Times New Roman', -apple-system, serif;
      background: #080D14;
      color: #E8E8E8;
      font-size: 10px;
      line-height: 1.55;
    }

    /* ===== COVER ===== */
    .cover {
      width: 100%;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: linear-gradient(170deg, #080D14 0%, #0C1422 30%, #0A1018 60%, #080D14 100%);
      page-break-after: always;
      text-align: center;
      position: relative;
    }
    .cover-top-line, .cover-bottom-line {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      width: 200px;
      height: 1px;
      background: linear-gradient(90deg, transparent, ${gold}, transparent);
    }
    .cover-top-line { top: 60px; }
    .cover-bottom-line { bottom: 60px; }
    .cover-content { padding: 40px; }
    .cover-logo {
      font-family: -apple-system, 'Helvetica Neue', sans-serif;
      font-size: 64px;
      font-weight: 900;
      color: ${gold};
      letter-spacing: 16px;
      margin-bottom: 4px;
    }
    .cover-tagline {
      font-family: -apple-system, sans-serif;
      font-size: 11px;
      color: ${goldLight};
      letter-spacing: 6px;
      text-transform: uppercase;
      margin-bottom: 48px;
    }
    .cover-divider {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 48px;
    }
    .cover-divider-line {
      width: 80px;
      height: 1px;
      background: ${gold}40;
    }
    .cover-divider-diamond {
      color: ${gold};
      font-size: 10px;
    }
    .cover-title {
      font-size: 28px;
      font-weight: 700;
      color: #FFFFFF;
      letter-spacing: 1px;
      margin-bottom: 6px;
    }
    .cover-subtitle {
      font-size: 13px;
      color: #94A3B8;
      font-style: italic;
      margin-bottom: 48px;
    }
    .cover-value-section { margin-bottom: 48px; }
    .cover-value-label {
      font-family: -apple-system, sans-serif;
      font-size: 9px;
      color: #94A3B8;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .cover-value {
      font-size: 42px;
      font-weight: 800;
      color: ${gold};
      font-family: -apple-system, sans-serif;
    }
    .cover-variation {
      margin-top: 8px;
      font-size: 12px;
      font-family: -apple-system, sans-serif;
    }
    .cover-var-sep { color: #64748B; margin: 0 8px; }
    .cover-client { margin-bottom: 12px; }
    .cover-client-label {
      font-family: -apple-system, sans-serif;
      font-size: 9px;
      color: #64748B;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .cover-client-name {
      font-size: 18px;
      font-weight: 600;
      color: #FFFFFF;
    }
    .cover-date {
      font-size: 12px;
      color: #94A3B8;
    }

    /* ===== PAGE LAYOUT ===== */
    .page {
      padding: 36px 40px;
      page-break-before: always;
      position: relative;
      min-height: 100vh;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 10px;
      margin-bottom: 24px;
      border-bottom: 1px solid ${gold}30;
    }
    .page-header-left, .page-header-right {
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: -apple-system, sans-serif;
      font-size: 9px;
      color: #94A3B8;
    }
    .header-logo {
      font-size: 13px;
      font-weight: 800;
      color: ${gold};
      letter-spacing: 3px;
    }
    .header-sep { color: ${gold}40; }
    .header-type {
      font-style: italic;
      color: ${goldLight};
    }

    .page-footer {
      position: absolute;
      bottom: 20px;
      left: 40px;
      right: 40px;
    }
    .footer-line {
      height: 1px;
      background: ${gold}20;
      margin-bottom: 8px;
    }
    .footer-content {
      display: flex;
      justify-content: space-between;
      font-family: -apple-system, sans-serif;
      font-size: 8px;
      color: #64748B;
    }
    .footer-brand { color: ${gold}80; letter-spacing: 1px; }
    .footer-confidential { font-style: italic; }
    .footer-page { color: #94A3B8; }

    /* ===== SECTIONS ===== */
    .section-heading {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 20px;
    }
    .section-number {
      font-family: -apple-system, sans-serif;
      font-size: 28px;
      font-weight: 800;
      color: ${gold}30;
      line-height: 1;
      min-width: 40px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #FFFFFF;
      letter-spacing: 0.5px;
    }
    .section-subtitle {
      font-size: 10px;
      color: #94A3B8;
      font-style: italic;
      margin-top: 2px;
    }
    .section-block {
      margin-bottom: 20px;
    }
    .section-block-title {
      font-family: -apple-system, sans-serif;
      font-size: 12px;
      font-weight: 700;
      color: ${gold};
      letter-spacing: 0.5px;
      padding-bottom: 6px;
      border-bottom: 1px solid ${gold}20;
      margin-bottom: 10px;
    }

    /* ===== KPI GRID ===== */
    .kpi-grid {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }
    .kpi-card {
      flex: 1;
      background: #0D1520;
      border: 1px solid #1A2A3A;
      border-radius: 8px;
      padding: 14px;
      text-align: center;
    }
    .kpi-highlight {
      border-color: ${gold}40;
      background: linear-gradient(180deg, #0D1520 0%, #12192480 100%);
    }
    .kpi-icon {
      color: ${gold};
      font-size: 14px;
      margin-bottom: 4px;
    }
    .kpi-label {
      font-family: -apple-system, sans-serif;
      font-size: 8px;
      color: #94A3B8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .kpi-value {
      font-family: -apple-system, sans-serif;
      font-size: 16px;
      font-weight: 800;
      color: #FFFFFF;
    }
    .kpi-value.gold { color: ${gold}; }
    .kpi-sub {
      font-family: -apple-system, sans-serif;
      font-size: 9px;
      color: #94A3B8;
      margin-top: 2px;
    }
    .kpi-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-family: -apple-system, sans-serif;
      font-size: 9px;
      font-weight: 600;
      margin-top: 4px;
    }
    .badge-positive { background: #00D4AA18; color: #00D4AA; }
    .badge-negative { background: #FF6B6B18; color: #FF6B6B; }

    /* ===== STATS ROW ===== */
    .stats-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 24px;
      background: #0D1520;
      border: 1px solid #1A2A3A;
      border-radius: 8px;
      padding: 14px 20px;
      margin-bottom: 20px;
    }
    .stat-item { text-align: center; flex: 1; }
    .stat-value {
      font-family: -apple-system, sans-serif;
      font-size: 22px;
      font-weight: 800;
      color: #FFFFFF;
    }
    .stat-value.gold { color: ${gold}; }
    .stat-label {
      font-family: -apple-system, sans-serif;
      font-size: 8px;
      color: #94A3B8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    .stat-divider {
      width: 1px;
      height: 30px;
      background: ${gold}20;
    }

    /* ===== TABLES ===== */
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      text-align: left;
      font-family: -apple-system, sans-serif;
      font-size: 8px;
      font-weight: 700;
      color: ${gold};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 7px 6px;
      border-bottom: 1px solid ${gold}30;
    }
    th:last-child, td:last-child { text-align: right; }
    td {
      padding: 6px;
      font-size: 10px;
      color: #E8E8E8;
      border-bottom: 1px solid #0F1820;
    }
    .table-striped tbody tr:nth-child(even) td {
      background: #0D152040;
    }
    .table-compact td { font-size: 9px; padding: 4px 6px; }
    .td-name { font-weight: 600; color: #FFFFFF; }
    .td-ticker { color: ${goldLight}; font-weight: 600; }
    .td-bold { font-weight: 700; }
    .text-muted { color: #64748B; font-size: 9px; }

    .color-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 2px;
      margin-right: 6px;
      vertical-align: middle;
    }

    /* ===== STATUS ===== */
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-family: -apple-system, sans-serif;
      font-size: 8px;
      font-weight: 600;
    }
    .status-ok { background: #00D4AA18; color: #00D4AA; }
    .status-warn { background: #FFD93D18; color: #FFD93D; }
    .status-err { background: #FF6B6B18; color: #FF6B6B; }

    /* ===== ALLOC BAR ===== */
    .alloc-bar {
      display: flex;
      height: 10px;
      border-radius: 5px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    .alloc-segment { height: 100%; }

    /* ===== CARD SUMMARY ===== */
    .card-summary-row {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
    }
    .card-summary-item {
      flex: 1;
      background: #0D1520;
      border: 1px solid #1A2A3A;
      border-radius: 8px;
      padding: 10px;
      text-align: center;
    }
    .card-summary-label {
      font-family: -apple-system, sans-serif;
      font-size: 8px;
      color: #94A3B8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .card-summary-value {
      font-family: -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 700;
      color: #FFFFFF;
    }

    /* ===== INSIGHTS ===== */
    .insights-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 20px;
    }
    .insight-card {
      background: #0D1520;
      border-radius: 8px;
      padding: 14px;
      border-left: 3px solid #64748B;
    }
    .insight-warning { border-left-color: #FFD93D; }
    .insight-opportunity { border-left-color: #00D4AA; }
    .insight-info { border-left-color: #3A86FF; }
    .insight-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }
    .insight-icon { font-size: 14px; }
    .insight-type {
      font-family: -apple-system, sans-serif;
      font-size: 9px;
      font-weight: 700;
      color: #94A3B8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .insight-text {
      font-size: 11px;
      color: #E8E8E8;
      line-height: 1.6;
    }
    .ai-disclaimer {
      background: #0D1520;
      border: 1px solid #1A2A3A;
      border-radius: 8px;
      padding: 12px;
      font-size: 9px;
      color: #94A3B8;
      line-height: 1.6;
      font-style: italic;
    }

    /* ===== DISCLAIMER PAGE ===== */
    .disclaimer-page { display: flex; flex-direction: column; }
    .disclaimer-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 40px 60px;
    }
    .disclaimer-icon {
      color: ${gold};
      font-size: 24px;
      margin-bottom: 16px;
    }
    .disclaimer-title {
      font-size: 18px;
      font-weight: 700;
      color: #FFFFFF;
      margin-bottom: 24px;
    }
    .disclaimer-text {
      text-align: left;
      max-width: 440px;
    }
    .disclaimer-text p {
      font-size: 10px;
      color: #CBD5E1;
      line-height: 1.8;
      margin-bottom: 12px;
    }
    .disclaimer-footer-block {
      margin-top: 32px;
      text-align: center;
    }
    .disclaimer-brand {
      font-family: -apple-system, sans-serif;
      font-size: 12px;
      font-weight: 700;
      color: ${gold};
      letter-spacing: 2px;
    }
    .disclaimer-generated {
      font-size: 10px;
      color: #94A3B8;
      margin-top: 4px;
    }
    .disclaimer-id {
      font-family: -apple-system, monospace;
      font-size: 8px;
      color: #64748B;
      margin-top: 4px;
    }

    /* ===== UTILITIES ===== */
    .positive { color: #00D4AA; }
    .negative { color: #FF6B6B; }
    .warning { color: #FFD93D; }
    .gold { color: ${gold}; }
  </style>
</head>
<body>
  ${coverHTML}
  ${execSummaryHTML}
  ${portfolioHTML}
  ${institutionsHTML}
  ${transactionsHTML}
  ${insightsHTML}
  ${disclaimerHTML}
</body>
</html>`;
}

// =============================================================================
// Public API
// =============================================================================

export async function generatePatrimonialReport(
  data: ReportData,
  user: User,
  accentColor: string = '#00D4AA',
): Promise<void> {
  const html = buildReportHTML(data, user, accentColor);
  const dateSlug = new Date().toISOString().split('T')[0];
  const { uri } = await Print.printToFileAsync({
    html,
    width: 595,
    height: 842,
  });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `ZURT_Relatorio_Patrimonial_${dateSlug}`,
    UTI: 'com.adobe.pdf',
  });
}
