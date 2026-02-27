import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { logger } from '../utils/logger';

export interface PortfolioExportRow {
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  profitLoss: number;
  profitPct: number;
}

export interface CardExpenseRow {
  date: string;
  description: string;
  category: string;
  amount: number;
  card: string;
}

export const exportService = {
  // ---------------------------------------------------------------------------
  // Portfolio → XLSX
  // ---------------------------------------------------------------------------
  async exportPortfolioXLSX(data: {
    assets: PortfolioExportRow[];
    totalValue: number;
    date: string;
  }) {
    const rows = data.assets.map((a) => ({
      Ativo: a.ticker,
      Nome: a.name,
      Quantidade: a.quantity,
      'Preço Médio': a.avgPrice,
      'Preço Atual': a.currentPrice,
      'Valor Total': a.totalValue,
      'Lucro/Prejuízo': a.profitLoss,
      'Rentabilidade %': a.profitPct,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Total row at the end
    XLSX.utils.sheet_add_aoa(
      ws,
      [['', '', '', '', 'TOTAL', data.totalValue, '', '']],
      { origin: -1 },
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Carteira');

    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const fileName = `ZURT_Carteira_${data.date}.xlsx`;
    const file = new File(Paths.document, fileName);

    file.create({ overwrite: true });
    file.write(wbout, { encoding: 'base64' });

    await Sharing.shareAsync(file.uri, {
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Exportar Carteira ZURT',
    });

    logger.log('[Export] Portfolio XLSX shared:', fileName);
  },

  // ---------------------------------------------------------------------------
  // Card expenses → CSV
  // ---------------------------------------------------------------------------
  async exportCardExpensesCSV(transactions: CardExpenseRow[]) {
    const header = 'Data,Descrição,Categoria,Valor,Cartão\n';
    const rows = transactions
      .map(
        (t) =>
          `${t.date},"${t.description}","${t.category}",${t.amount.toFixed(2)},"${t.card}"`,
      )
      .join('\n');

    const csv = header + rows;
    const fileName = `ZURT_Gastos_${new Date().toISOString().split('T')[0]}.csv`;
    const file = new File(Paths.document, fileName);

    file.create({ overwrite: true });
    file.write(csv);

    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Exportar Gastos ZURT',
    });

    logger.log('[Export] Card expenses CSV shared:', fileName);
  },
};
