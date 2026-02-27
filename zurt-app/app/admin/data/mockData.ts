// ---------------------------------------------------------------------------
// Admin Panel — Mock Data & Types
// ---------------------------------------------------------------------------

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'suspended';
  role: 'admin' | 'tester' | 'user';
  plan: 'FREE' | 'PRO';
  createdAt: string;
  lastLogin: string;
  openFinance: boolean;
  b3Connected: boolean;
  patrimony: number;
  devices: string[];
  totalLogins: number;
  photoUrl: string | null;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface B3ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

export const mockUsers: AdminUser[] = [
  {
    id: '1',
    name: 'Diego Oliveira',
    email: 'diego@dama.com.br',
    phone: '(92) 99999-0001',
    status: 'active',
    role: 'admin',
    plan: 'PRO',
    createdAt: '2026-02-26',
    lastLogin: '2026-02-27 00:32',
    openFinance: true,
    b3Connected: false,
    patrimony: -36909.39,
    devices: ['iOS 17.4'],
    totalLogins: 47,
    photoUrl: null,
  },
  {
    id: '2',
    name: 'Marcelo Augusto',
    email: 'marcelo@dama.com.br',
    phone: '(92) 99999-0002',
    status: 'active',
    role: 'tester',
    plan: 'PRO',
    createdAt: '2026-02-27',
    lastLogin: '2026-02-27 10:15',
    openFinance: false,
    b3Connected: false,
    patrimony: 0,
    devices: ['Android 14'],
    totalLogins: 12,
    photoUrl: null,
  },
  {
    id: '3',
    name: 'Andre Cabral',
    email: 'andre@dama.com.br',
    phone: '(92) 99999-0003',
    status: 'active',
    role: 'tester',
    plan: 'FREE',
    createdAt: '2026-02-27',
    lastLogin: '2026-02-27 08:45',
    openFinance: false,
    b3Connected: false,
    patrimony: 0,
    devices: ['iOS 18.0'],
    totalLogins: 5,
    photoUrl: null,
  },
];

export const mockLogs: LogEntry[] = [
  { id: '1', timestamp: '2026-02-27T00:32:14', level: 'info', message: 'Login: Diego Oliveira (iOS)' },
  { id: '2', timestamp: '2026-02-27T00:28:33', level: 'info', message: 'Open Finance sync: Pluggy success' },
  { id: '3', timestamp: '2026-02-27T00:15:22', level: 'info', message: 'Novo usuario: Marcelo Augusto (Google Sign-In)' },
  { id: '4', timestamp: '2026-02-26T23:50:11', level: 'warn', message: 'Open Finance: timeout Santander' },
  { id: '5', timestamp: '2026-02-26T22:00:44', level: 'error', message: 'Google Login falhou: invalid_grant' },
  { id: '6', timestamp: '2026-02-26T20:30:08', level: 'warn', message: 'WebSocket reconnect: context lost' },
  { id: '7', timestamp: '2026-02-26T18:12:55', level: 'info', message: 'Push token registrado: Andre Cabral' },
  { id: '8', timestamp: '2026-02-26T16:45:30', level: 'error', message: 'Pluggy webhook: connection_error item_id=abc123' },
  { id: '9', timestamp: '2026-02-26T14:20:10', level: 'info', message: 'Relatorio PDF gerado: Diego Oliveira' },
  { id: '10', timestamp: '2026-02-26T12:00:00', level: 'info', message: 'Sync agendado executado com sucesso' },
];

export const mockActivityFeed = [
  { id: '1', userName: 'Diego Oliveira', action: 'Fez login no app', timestamp: '2026-02-27 00:32', initial: 'D' },
  { id: '2', userName: 'Diego Oliveira', action: 'Sincronizou Open Finance', timestamp: '2026-02-27 00:28', initial: 'D' },
  { id: '3', userName: 'Marcelo Augusto', action: 'Cadastrou-se via Google', timestamp: '2026-02-27 00:15', initial: 'M' },
  { id: '4', userName: 'Andre Cabral', action: 'Fez login no app', timestamp: '2026-02-27 08:45', initial: 'A' },
  { id: '5', userName: 'Diego Oliveira', action: 'Gerou relatorio patrimonial', timestamp: '2026-02-26 14:20', initial: 'D' },
];

export const defaultB3Checklist: B3ChecklistItem[] = [
  { id: 'cnpj', label: 'CNPJ ativo', completed: true },
  { id: 'b3_account', label: 'Conta B3 Developers', completed: true },
  { id: 'sandbox', label: 'Pacote de Acesso sandbox', completed: false },
  { id: 'landing', label: 'Landing page no ar', completed: false },
  { id: 'privacy', label: 'Politica de Privacidade', completed: false },
  { id: 'spf', label: 'SPF/DKIM/DMARC', completed: false },
  { id: 'security', label: 'SecurityScorecard A/B', completed: false },
  { id: 'assessment', label: 'Self-assessment', completed: false },
  { id: 'contract', label: 'Contrato B3', completed: false },
  { id: 'certs', label: 'Certificados producao', completed: false },
];
