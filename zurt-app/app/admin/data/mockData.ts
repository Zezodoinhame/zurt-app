// ---------------------------------------------------------------------------
// Admin Panel — Local Data (B3 checklist only, stored in AsyncStorage)
// ---------------------------------------------------------------------------

import type { B3ChecklistItem } from './types';

export type { B3ChecklistItem };

export const defaultB3Checklist: B3ChecklistItem[] = [
  { id: 'cnpj', label: 'CNPJ ativo (ZURT)', completed: true },
  { id: 'b3_account', label: 'Conta no B3 Developers', completed: true },
  { id: 'sandbox', label: 'Pacote de Acesso (sandbox)', completed: false },
  { id: 'landing', label: 'Landing page zurt.com.br no ar', completed: false },
  { id: 'privacy', label: 'Politica de Privacidade publicada', completed: false },
  { id: 'spf', label: 'SPF + DKIM + DMARC configurados', completed: false },
  { id: 'security', label: 'SecurityScorecard nota A/B', completed: false },
  { id: 'assessment', label: 'Self-assessment preenchido', completed: false },
  { id: 'contract', label: 'Contrato B3 assinado', completed: false },
  { id: 'certs', label: 'Certificados de producao recebidos', completed: false },
];
