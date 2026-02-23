// =============================================================================
// ZURT Wealth Intelligence — PDF Report Generator
// Uses expo-print + expo-sharing to generate & share a patrimonial PDF
// =============================================================================

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { PortfolioSummary, Institution, Allocation, CreditCard, Asset } from '../types';
import type { User } from '../types';
import { formatBRL, formatPct } from '../utils/formatters';

interface ReportData {
  summary: PortfolioSummary;
  institutions: Institution[];
  allocations: Allocation[];
  cards: CreditCard[];
  assets: Asset[];
}

function formatBRLReport(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPctReport(value: number): string {
  const formatted = Math.abs(value).toFixed(2).replace('.', ',');
  return value >= 0 ? `+${formatted}%` : `-${formatted}%`;
}

function getTop5Assets(assets: Asset[]): Asset[] {
  return [...assets].sort((a, b) => b.currentValue - a.currentValue).slice(0, 5);
}

function buildReportHTML(data: ReportData, user: User, accentColor: string): string {
  const { summary, institutions, allocations, cards, assets } = data;
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const top5 = getTop5Assets(assets);
  const accent = accentColor || '#00D4AA';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif;
      background: #080D14;
      color: #FFFFFF;
      padding: 40px;
      font-size: 12px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid ${accent};
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header-left { }
    .header-logo {
      font-size: 28px;
      font-weight: 800;
      color: ${accent};
      letter-spacing: 2px;
    }
    .header-subtitle {
      font-size: 11px;
      color: #A0AEC0;
      margin-top: 4px;
    }
    .header-right {
      text-align: right;
    }
    .header-user {
      font-size: 14px;
      font-weight: 600;
      color: #FFFFFF;
    }
    .header-date {
      font-size: 11px;
      color: #A0AEC0;
      margin-top: 2px;
    }
    .section {
      margin-bottom: 28px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: ${accent};
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #1A2A3A;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    th {
      text-align: left;
      font-size: 10px;
      font-weight: 600;
      color: #A0AEC0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 10px;
      border-bottom: 1px solid #1A2A3A;
    }
    th:last-child, td:last-child { text-align: right; }
    td {
      padding: 8px 10px;
      font-size: 12px;
      color: #FFFFFF;
      border-bottom: 1px solid #0F1820;
    }
    .hero-grid {
      display: flex;
      gap: 20px;
      margin-bottom: 10px;
    }
    .hero-box {
      flex: 1;
      background: #0D1520;
      border-radius: 10px;
      padding: 16px;
      border: 1px solid #1A2A3A;
    }
    .hero-label {
      font-size: 10px;
      color: #A0AEC0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .hero-value {
      font-size: 22px;
      font-weight: 700;
      color: #FFFFFF;
    }
    .hero-value.accent { color: ${accent}; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      margin-top: 6px;
    }
    .badge-positive { background: ${accent}20; color: ${accent}; }
    .badge-negative { background: #FF6B6B20; color: #FF6B6B; }
    .positive { color: ${accent}; }
    .negative { color: #FF6B6B; }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #1A2A3A;
      text-align: center;
    }
    .footer-brand {
      font-size: 11px;
      color: ${accent};
      font-weight: 600;
      letter-spacing: 1px;
    }
    .footer-date {
      font-size: 10px;
      color: #64748B;
      margin-top: 4px;
    }
    .alloc-bar {
      display: flex;
      height: 12px;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    .alloc-segment { height: 100%; }
    .status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
      vertical-align: middle;
    }
    .status-connected { background: ${accent}; }
    .status-syncing { background: #FFD93D; }
    .status-error { background: #FF6B6B; }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      <div class="header-logo">ZURT</div>
      <div class="header-subtitle">Wealth Intelligence</div>
    </div>
    <div class="header-right">
      <div class="header-user">${user.name}</div>
      <div class="header-date">${dateStr}</div>
    </div>
  </div>

  <!-- SECTION 1: Patrimônio Total -->
  <div class="section">
    <div class="section-title">1. Patrimônio Total</div>
    <div class="hero-grid">
      <div class="hero-box">
        <div class="hero-label">Patrimônio Total</div>
        <div class="hero-value accent">${formatBRLReport(summary.totalValue)}</div>
        <div>
          <span class="badge ${summary.variation1m >= 0 ? 'badge-positive' : 'badge-negative'}">
            Mês: ${formatPctReport(summary.variation1m)}
          </span>
          <span class="badge ${summary.variation12m >= 0 ? 'badge-positive' : 'badge-negative'}" style="margin-left:6px">
            12M: ${formatPctReport(summary.variation12m)}
          </span>
        </div>
      </div>
      <div class="hero-box">
        <div class="hero-label">Investido</div>
        <div class="hero-value">${formatBRLReport(summary.investedValue)}</div>
      </div>
      <div class="hero-box">
        <div class="hero-label">Lucro</div>
        <div class="hero-value ${summary.profit >= 0 ? 'positive' : 'negative'}">
          ${formatBRLReport(summary.profit)}
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 2: Alocação por Classe -->
  <div class="section">
    <div class="section-title">2. Alocação por Classe</div>
    <div class="alloc-bar">
      ${allocations.map((a) => `<div class="alloc-segment" style="width:${a.percentage}%;background:${a.color}"></div>`).join('')}
    </div>
    <table>
      <thead>
        <tr>
          <th>Classe</th>
          <th>%</th>
          <th>Valor</th>
        </tr>
      </thead>
      <tbody>
        ${allocations.map((a) => `
        <tr>
          <td><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${a.color};margin-right:8px;vertical-align:middle;"></span>${a.label}</td>
          <td>${a.percentage.toFixed(1).replace('.', ',')}%</td>
          <td>${formatBRLReport(a.value)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <!-- SECTION 3: Top 5 Investimentos -->
  <div class="section">
    <div class="section-title">3. Top 5 Investimentos</div>
    <table>
      <thead>
        <tr>
          <th>Ativo</th>
          <th>Ticker</th>
          <th>Valor Atual</th>
          <th>Variação</th>
        </tr>
      </thead>
      <tbody>
        ${top5.map((a) => `
        <tr>
          <td>${a.name}</td>
          <td>${a.ticker}</td>
          <td>${formatBRLReport(a.currentValue)}</td>
          <td class="${a.variation >= 0 ? 'positive' : 'negative'}">${formatPctReport(a.variation)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <!-- SECTION 4: Contas Conectadas -->
  <div class="section">
    <div class="section-title">4. Contas Conectadas</div>
    <table>
      <thead>
        <tr>
          <th>Instituição</th>
          <th>Ativos</th>
          <th>Status</th>
          <th>Saldo</th>
        </tr>
      </thead>
      <tbody>
        ${institutions.map((inst) => {
          const statusClass = inst.status === 'connected' ? 'status-connected' : inst.status === 'syncing' ? 'status-syncing' : 'status-error';
          const statusLabel = inst.status === 'connected' ? 'Conectado' : inst.status === 'syncing' ? 'Sincronizando' : 'Erro';
          return `
        <tr>
          <td><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${inst.color};margin-right:8px;vertical-align:middle;"></span>${inst.name}</td>
          <td>${inst.assetCount}</td>
          <td><span class="status-dot ${statusClass}"></span>${statusLabel}</td>
          <td>${formatBRLReport(inst.totalValue)}</td>
        </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>

  <!-- SECTION 5: Cartões -->
  ${cards.length > 0 ? `
  <div class="section">
    <div class="section-title">5. Resumo de Cartões</div>
    <table>
      <thead>
        <tr>
          <th>Cartão</th>
          <th>Bandeira</th>
          <th>Limite</th>
          <th>Fatura Atual</th>
        </tr>
      </thead>
      <tbody>
        ${cards.map((c) => `
        <tr>
          <td>${c.name} (****${c.lastFour})</td>
          <td>${c.brand.charAt(0).toUpperCase() + c.brand.slice(1)}</td>
          <td>${formatBRLReport(c.limit)}</td>
          <td>${formatBRLReport(c.currentInvoice)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-brand">Gerado por ZURT — Wealth Intelligence</div>
    <div class="footer-date">${dateStr} às ${timeStr}</div>
  </div>
</body>
</html>`;
}

export async function generatePatrimonialReport(
  data: ReportData,
  user: User,
  accentColor: string = '#00D4AA',
): Promise<void> {
  const html = buildReportHTML(data, user, accentColor);
  const { uri } = await Print.printToFileAsync({
    html,
    width: 595,
    height: 842,
  });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Relatório Patrimonial ZURT',
  });
}
