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
  plan: 'PRO' | 'FREE';
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
  {
    id: '4',
    name: 'Teste Alpha',
    email: 'alpha@test.com',
    phone: '',
    status: 'active',
    role: 'tester',
    plan: 'PRO',
    createdAt: '2026-02-27',
    lastLogin: '2026-02-27 14:20',
    openFinance: true,
    b3Connected: false,
    patrimony: 152340.87,
    devices: ['iOS 17.2'],
    totalLogins: 33,
    photoUrl: null,
  },
  {
    id: '5',
    name: 'Teste Beta',
    email: 'beta@test.com',
    phone: '',
    status: 'inactive',
    role: 'tester',
    plan: 'FREE',
    createdAt: '2026-02-27',
    lastLogin: '2026-02-26 22:00',
    openFinance: false,
    b3Connected: false,
    patrimony: 0,
    devices: ['Android 15'],
    totalLogins: 2,
    photoUrl: null,
  },
];

export const mockLogs: LogEntry[] = [
  { id: '1', timestamp: '2026-02-27 00:32:14', level: 'info', message: 'Login: Diego Oliveira (iOS)' },
  { id: '2', timestamp: '2026-02-27 00:28:33', level: 'info', message: 'Open Finance sync: Pluggy success' },
  { id: '3', timestamp: '2026-02-27 00:15:22', level: 'info', message: 'Novo usuario: Marcelo Augusto (Google Sign-In)' },
  { id: '4', timestamp: '2026-02-26 23:50:11', level: 'warn', message: 'Open Finance: timeout Santander' },
  { id: '5', timestamp: '2026-02-26 22:00:44', level: 'error', message: 'Google Login falhou: invalid_grant' },
  { id: '6', timestamp: '2026-02-26 20:30:08', level: 'warn', message: 'WebSocket reconnect: context lost' },
  { id: '7', timestamp: '2026-02-26 19:15:03', level: 'info', message: 'App version check: 1.0.0-beta.3' },
  { id: '8', timestamp: '2026-02-26 18:00:55', level: 'error', message: 'Pluggy webhook failed: 500 Internal Server Error' },
];

export const mockActivityFeed = [
  { id: '1', userName: 'Diego', action: 'fez login', timestamp: '00:32', initial: 'D' },
  { id: '2', userName: 'Alpha', action: 'sync Open Finance', timestamp: '00:28', initial: 'A' },
  { id: '3', userName: 'Marcelo', action: 'criou conta', timestamp: '00:15', initial: 'M' },
  { id: '4', userName: 'Beta', action: 'erro de conexao', timestamp: '23:50', initial: 'B' },
  { id: '5', userName: 'Andre', action: 'fez login', timestamp: '08:45', initial: 'A' },
];

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
