// =============================================================================
// ZURT Plan Definitions
// =============================================================================

export const PLANS = {
  basic: {
    id: 'basic' as const,
    name: 'Basico',
    price: 14.90,
    priceLabel: 'R$ 14,90/mes',
    color: '#3B82F6',
    icon: '\u26A1',
    badge: null as string | null,
    features: {
      maxConnections: 2,
      aiQueriesPerDay: 10,
      reportsPerMonth: 3,
      openFinance: true,
      marketData: true,
      cardAnalysis: true,
      exportData: false,
      alerts: true,
      alertsLimit: 3,
      prioritySupport: false,
      consultorMeeting: false,
    },
    description: '2 conexoes bancarias · 10 consultas IA/dia · 3 relatorios/mes',
    highlights: [
      '2 conexoes bancarias',
      '10 consultas ao ZURT Agent por dia',
      '3 relatorios PDF por mes',
      'Dados de mercado em tempo real',
      'Analise de cartoes e gastos',
    ],
  },
  pro: {
    id: 'pro' as const,
    name: 'Pro',
    price: 19.90,
    priceLabel: 'R$ 19,90/mes',
    color: '#00D4AA',
    icon: '\uD83D\uDE80',
    badge: 'POPULAR',
    features: {
      maxConnections: 5,
      aiQueriesPerDay: 25,
      reportsPerMonth: 5,
      openFinance: true,
      marketData: true,
      cardAnalysis: true,
      exportData: true,
      alerts: true,
      alertsLimit: 10,
      prioritySupport: false,
      consultorMeeting: false,
    },
    description: '5 conexoes bancarias · 25 consultas IA/dia · 5 relatorios/mes',
    highlights: [
      '5 conexoes bancarias',
      '25 consultas ao ZURT Agent por dia',
      '5 relatorios PDF por mes',
      'Exportacao de dados CSV/Excel',
      'Alertas personalizados',
      'Tudo do plano Basico',
    ],
  },
  unlimited: {
    id: 'unlimited' as const,
    name: 'Unlimited',
    price: 49.90,
    priceLabel: 'R$ 49,90/mes',
    color: '#8B5CF6',
    icon: '\uD83D\uDC51',
    badge: 'MELHOR CUSTO-BENEFICIO',
    features: {
      maxConnections: -1,
      aiQueriesPerDay: -1,
      reportsPerMonth: -1,
      openFinance: true,
      marketData: true,
      cardAnalysis: true,
      exportData: true,
      alerts: true,
      alertsLimit: -1,
      prioritySupport: true,
      consultorMeeting: false,
    },
    description: 'Conexoes ilimitadas · IA ilimitada · Relatorios ilimitados',
    highlights: [
      'Conexoes bancarias ilimitadas',
      'Consultas ao ZURT Agent ilimitadas',
      'Relatorios PDF ilimitados',
      'Suporte prioritario',
      'Exportacao de dados',
      'Tudo do plano Pro',
    ],
  },
  enterprise: {
    id: 'enterprise' as const,
    name: 'Enterprise',
    price: 149.90,
    priceLabel: 'R$ 149,90/mes',
    color: '#C9A84C',
    icon: '\uD83C\uDFDB',
    badge: 'EXCLUSIVO',
    features: {
      maxConnections: -1,
      aiQueriesPerDay: -1,
      reportsPerMonth: -1,
      openFinance: true,
      marketData: true,
      cardAnalysis: true,
      exportData: true,
      alerts: true,
      alertsLimit: -1,
      prioritySupport: true,
      consultorMeeting: true,
    },
    description: 'Tudo ilimitado + reuniao mensal com consultor por video',
    highlights: [
      'Tudo do plano Unlimited',
      'Reuniao mensal com consultor por video',
      'Suporte VIP dedicado',
      'Onboarding personalizado',
      'Relatorios customizados sob demanda',
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;
export type PlanFeatures = (typeof PLANS)[PlanId]['features'];
export type PlanConfig = (typeof PLANS)[PlanId];

export const PLAN_HIERARCHY: PlanId[] = ['basic', 'pro', 'unlimited', 'enterprise'];

export const PLAN_LIST: PlanConfig[] = PLAN_HIERARCHY.map((id) => PLANS[id]);

export function formatLimit(value: number): string {
  if (value === -1) return 'Ilimitado';
  return String(value);
}

export function getPlanIndex(plan: PlanId): number {
  return PLAN_HIERARCHY.indexOf(plan);
}

export function isAtLeastPlan(current: PlanId, target: PlanId): boolean {
  return getPlanIndex(current) >= getPlanIndex(target);
}
