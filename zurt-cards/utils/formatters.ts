// utils/formatters.ts

export const formatBRL = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatPct = (value: number): string => {
  return `${(value * 100).toFixed(0)}%`;
};

export const getUsageColor = (pct: number): string => {
  if (pct > 0.8) return '#FF4757';
  if (pct > 0.5) return '#FFA502';
  return '#2ED573';
};
