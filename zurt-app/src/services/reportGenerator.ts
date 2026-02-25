// =============================================================================
// ZURT Wealth Intelligence — Premium PDF Report Generator
// Multi-page report with cover page, page breaks, all financial data
// Uses expo-print + expo-sharing to generate & share a patrimonial PDF
// =============================================================================

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { PortfolioSummary, Institution, Allocation, CreditCard, Asset } from '../types';
import type { User } from '../types';

interface ReportData {
  summary: PortfolioSummary;
  institutions: Institution[];
  allocations: Allocation[];
  cards: CreditCard[];
  assets: Asset[];
}

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

  const accent = accentColor || '#00D4AA';
  const top10 = [...assets].sort((a, b) => b.currentValue - a.currentValue).slice(0, 10);
  const allAssetsSorted = [...assets].sort((a, b) => b.currentValue - a.currentValue);

  // Performance by class
  const classPerfMap = new Map<string, { value: number; invested: number; label: string; color: string }>();
  allocations.forEach((alloc) => {
    const classAssets = assets.filter((a) => a.class === alloc.class);
    const value = classAssets.reduce((s, a) => s + a.currentValue, 0);
    const invested = classAssets.reduce((s, a) => s + (a.investedValue ?? a.currentValue), 0);
    classPerfMap.set(alloc.class, { value, invested, label: alloc.label, color: alloc.color });
  });

  const sectionNum = { n: 0 };
  const sec = () => ++sectionNum.n;

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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif;
      background: #080D14;
      color: #FFFFFF;
      font-size: 11px;
      line-height: 1.5;
    }

    /* Cover page */
    .cover {
      width: 100%;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: linear-gradient(160deg, #080D14 0%, #0D1A2A 50%, #080D14 100%);
      page-break-after: always;
      text-align: center;
      padding: 60px;
    }
    .cover-logo {
      font-size: 56px;
      font-weight: 900;
      color: ${accent};
      letter-spacing: 8px;
      margin-bottom: 8px;
    }
    .cover-tagline {
      font-size: 14px;
      color: #A0AEC0;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 60px;
    }
    .cover-line {
      width: 120px;
      height: 2px;
      background: ${accent};
      margin: 0 auto 40px;
    }
    .cover-title {
      font-size: 24px;
      font-weight: 700;
      color: #FFFFFF;
      margin-bottom: 8px;
    }
    .cover-subtitle {
      font-size: 14px;
      color: #A0AEC0;
    }
    .cover-user {
      margin-top: 60px;
      font-size: 16px;
      font-weight: 600;
      color: #FFFFFF;
    }
    .cover-date {
      font-size: 12px;
      color: #CBD5E1;
      margin-top: 6px;
    }
    .cover-value {
      margin-top: 40px;
      font-size: 36px;
      font-weight: 800;
      color: ${accent};
    }
    .cover-value-label {
      font-size: 11px;
      color: #CBD5E1;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 4px;
    }

    /* Content pages */
    .page {
      padding: 40px;
      page-break-before: always;
    }
    .page:first-of-type { page-break-before: auto; }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1A2A3A;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .page-header-logo {
      font-size: 16px;
      font-weight: 800;
      color: ${accent};
      letter-spacing: 2px;
    }
    .page-header-info {
      font-size: 10px;
      color: #CBD5E1;
    }
    .section {
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: ${accent};
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid #1A2A3A;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
    }
    th {
      text-align: left;
      font-size: 9px;
      font-weight: 600;
      color: #A0AEC0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 6px 8px;
      border-bottom: 1px solid #1A2A3A;
    }
    th:last-child, td:last-child { text-align: right; }
    td {
      padding: 6px 8px;
      font-size: 11px;
      color: #FFFFFF;
      border-bottom: 1px solid #0F1820;
    }
    .hero-grid {
      display: flex;
      gap: 16px;
      margin-bottom: 8px;
    }
    .hero-box {
      flex: 1;
      background: #0D1520;
      border-radius: 8px;
      padding: 14px;
      border: 1px solid #1A2A3A;
    }
    .hero-label {
      font-size: 9px;
      color: #A0AEC0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .hero-value {
      font-size: 18px;
      font-weight: 700;
      color: #FFFFFF;
    }
    .hero-value.accent { color: ${accent}; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      margin-top: 4px;
    }
    .badge-positive { background: ${accent}20; color: ${accent}; }
    .badge-negative { background: #FF6B6B20; color: #FF6B6B; }
    .positive { color: ${accent}; }
    .negative { color: #FF6B6B; }
    .alloc-bar {
      display: flex;
      height: 14px;
      border-radius: 7px;
      overflow: hidden;
      margin-bottom: 10px;
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
    .footer {
      margin-top: 30px;
      padding-top: 12px;
      border-top: 1px solid #1A2A3A;
      text-align: center;
    }
    .footer-brand {
      font-size: 10px;
      color: ${accent};
      font-weight: 600;
      letter-spacing: 1px;
    }
    .footer-date {
      font-size: 9px;
      color: #CBD5E1;
      margin-top: 2px;
    }
    .kpi-row {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }
    .kpi-card {
      flex: 1;
      background: #0D1520;
      border: 1px solid #1A2A3A;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }
    .kpi-value {
      font-size: 20px;
      font-weight: 800;
      color: ${accent};
    }
    .kpi-label {
      font-size: 9px;
      color: #A0AEC0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
  </style>
</head>
<body>

  <!-- ============================== COVER PAGE ============================== -->
  <div class="cover">
    <div class="cover-logo">ZURT</div>
    <div class="cover-tagline">Wealth Intelligence</div>
    <div class="cover-line"></div>
    <div class="cover-title">Relatório Patrimonial</div>
    <div class="cover-subtitle">Visão completa dos seus investimentos</div>
    <div class="cover-value">${fmt(summary.totalValue)}</div>
    <div class="cover-value-label">Patrimônio total</div>
    <div class="cover-user">${user.name}</div>
    <div class="cover-date">${dateStr}</div>
  </div>

  <!-- ============================== PAGE 1: RESUMO ============================== -->
  <div class="page">
    <div class="page-header">
      <div class="page-header-logo">ZURT</div>
      <div class="page-header-info">${user.name} | ${dateStr}</div>
    </div>

    <div class="section">
      <div class="section-title">${sec()}. Resumo Patrimonial</div>
      <div class="hero-grid">
        <div class="hero-box">
          <div class="hero-label">Patrimônio Total</div>
          <div class="hero-value accent">${fmt(summary.totalValue)}</div>
          <div>
            <span class="badge ${summary.variation1m >= 0 ? 'badge-positive' : 'badge-negative'}">
              Mês: ${fmtPct(summary.variation1m)}
            </span>
            <span class="badge ${summary.variation12m >= 0 ? 'badge-positive' : 'badge-negative'}" style="margin-left:4px">
              12M: ${fmtPct(summary.variation12m)}
            </span>
          </div>
        </div>
        <div class="hero-box">
          <div class="hero-label">Total Investido</div>
          <div class="hero-value">${fmt(summary.investedValue)}</div>
        </div>
        <div class="hero-box">
          <div class="hero-label">Lucro / Prejuízo</div>
          <div class="hero-value ${summary.profit >= 0 ? 'positive' : 'negative'}">
            ${fmt(summary.profit)}
          </div>
        </div>
      </div>

      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-value">${institutions.length}</div>
          <div class="kpi-label">Instituições</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${assets.length}</div>
          <div class="kpi-label">Ativos</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${allocations.length}</div>
          <div class="kpi-label">Classes</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${cards.length}</div>
          <div class="kpi-label">Cartões</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">${sec()}. Alocação por Classe</div>
      <div class="alloc-bar">
        ${allocations.map((a) => `<div class="alloc-segment" style="width:${a.percentage}%;background:${a.color}"></div>`).join('')}
      </div>
      <table>
        <thead>
          <tr>
            <th>Classe</th>
            <th>%</th>
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
            <td><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${a.color};margin-right:6px;vertical-align:middle;"></span>${a.label}</td>
            <td>${a.percentage.toFixed(1).replace('.', ',')}%</td>
            <td>${fmt(invested)}</td>
            <td>${fmt(a.value)}</td>
            <td class="${result >= 0 ? 'positive' : 'negative'}">${fmt(result)}</td>
          </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <div class="footer-brand">ZURT — Wealth Intelligence</div>
      <div class="footer-date">Página 1 | ${dateStr} às ${timeStr}</div>
    </div>
  </div>

  <!-- ============================== PAGE 2: INVESTIMENTOS ============================== -->
  <div class="page">
    <div class="page-header">
      <div class="page-header-logo">ZURT</div>
      <div class="page-header-info">${user.name} | ${dateStr}</div>
    </div>

    <div class="section">
      <div class="section-title">${sec()}. Top 10 Investimentos</div>
      <table>
        <thead>
          <tr>
            <th>Ativo</th>
            <th>Ticker</th>
            <th>Classe</th>
            <th>Investido</th>
            <th>Valor Atual</th>
            <th>Variação</th>
          </tr>
        </thead>
        <tbody>
          ${top10.map((a) => `
          <tr>
            <td>${a.name}</td>
            <td>${a.ticker || '-'}</td>
            <td>${a.class}</td>
            <td>${fmt(a.investedValue ?? 0)}</td>
            <td>${fmt(a.currentValue)}</td>
            <td class="${a.variation >= 0 ? 'positive' : 'negative'}">${fmtPct(a.variation)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">${sec()}. Contas Conectadas</div>
      <table>
        <thead>
          <tr>
            <th>Instituição</th>
            <th>Ativos</th>
            <th>Status</th>
            <th>Valor Total</th>
          </tr>
        </thead>
        <tbody>
          ${institutions.map((inst) => {
            const statusLabel = inst.status === 'connected' ? 'Conectado' : inst.status === 'syncing' ? 'Sincronizando' : 'Erro';
            const statusClass = inst.status === 'connected' ? 'status-connected' : inst.status === 'syncing' ? 'status-syncing' : 'status-error';
            return `
          <tr>
            <td><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${inst.color};margin-right:6px;vertical-align:middle;"></span>${inst.name}</td>
            <td>${inst.assetCount}</td>
            <td><span class="status-dot ${statusClass}"></span>${statusLabel}</td>
            <td>${fmt(inst.totalValue)}</td>
          </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    ${cards.length > 0 ? `
    <div class="section">
      <div class="section-title">${sec()}. Cartões de Crédito</div>
      <table>
        <thead>
          <tr>
            <th>Cartão</th>
            <th>Bandeira</th>
            <th>Limite</th>
            <th>Fatura Atual</th>
            <th>Uso</th>
          </tr>
        </thead>
        <tbody>
          ${cards.map((c) => {
            const usage = c.limit > 0 ? ((c.currentInvoice / c.limit) * 100).toFixed(0) : '0';
            return `
          <tr>
            <td>${c.name} (****${c.lastFour})</td>
            <td>${c.brand.charAt(0).toUpperCase() + c.brand.slice(1)}</td>
            <td>${fmt(c.limit)}</td>
            <td>${fmt(c.currentInvoice)}</td>
            <td>${usage}%</td>
          </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <div class="footer">
      <div class="footer-brand">ZURT — Wealth Intelligence</div>
      <div class="footer-date">Página 2 | ${dateStr} às ${timeStr}</div>
    </div>
  </div>

  <!-- ============================== PAGE 3: ALL ASSETS ============================== -->
  ${allAssetsSorted.length > 10 ? `
  <div class="page">
    <div class="page-header">
      <div class="page-header-logo">ZURT</div>
      <div class="page-header-info">${user.name} | ${dateStr}</div>
    </div>

    <div class="section">
      <div class="section-title">${sec()}. Todos os Ativos (${allAssetsSorted.length})</div>
      <table>
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
          ${allAssetsSorted.map((a) => `
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

    <div class="footer">
      <div class="footer-brand">ZURT — Wealth Intelligence</div>
      <div class="footer-date">Página 3 | ${dateStr} às ${timeStr}</div>
    </div>
  </div>
  ` : ''}

  <!-- ============================== DISCLAIMER ============================== -->
  <div class="page">
    <div class="page-header">
      <div class="page-header-logo">ZURT</div>
      <div class="page-header-info">${user.name} | ${dateStr}</div>
    </div>

    <div class="section" style="margin-top: 40px;">
      <div class="section-title">Aviso Legal</div>
      <p style="font-size: 10px; color: #CBD5E1; line-height: 1.8;">
        Este relatório foi gerado automaticamente pelo ZURT com base nos dados sincronizados
        das suas contas e instituições financeiras. Os valores apresentados são meramente
        informativos e não constituem recomendação de investimento. Rentabilidade passada não
        garante rentabilidade futura. Consulte sempre um profissional qualificado antes de
        tomar decisões de investimento. Os dados podem apresentar atraso ou divergência em
        relação aos valores reais das instituições financeiras.
      </p>
    </div>

    <div class="footer" style="margin-top: auto;">
      <div class="footer-brand">ZURT — Wealth Intelligence</div>
      <div class="footer-date">Gerado em ${dateStr} às ${timeStr}</div>
      <div style="font-size: 9px; color: #94A3B8; margin-top: 8px;">
        Documento confidencial. Uso exclusivo do titular.
      </div>
    </div>
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
