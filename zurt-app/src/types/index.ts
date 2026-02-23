// =============================================================================
// ZURT Wealth Intelligence - Type Definitions
// =============================================================================

// -----------------------------------------------------------------------------
// Asset Classes
// -----------------------------------------------------------------------------

export type AssetClass =
  | 'fixedIncome'
  | 'stocks'
  | 'fiis'
  | 'crypto'
  | 'international'
  | 'pension';

// -----------------------------------------------------------------------------
// Institutions
// -----------------------------------------------------------------------------

export type InstitutionId = string;

export type ConnectionStatus = 'connected' | 'syncing' | 'error';

export interface Institution {
  id: InstitutionId;
  name: string;
  color: string;
  secondaryColor?: string;
  assetCount: number;
  totalValue: number;
  status: ConnectionStatus;
}

// -----------------------------------------------------------------------------
// Assets
// -----------------------------------------------------------------------------

export interface Asset {
  id: string;
  name: string;
  ticker: string;
  class: AssetClass;
  institution: InstitutionId;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  investedValue: number;
  currentValue: number;
  variation: number; // percentage
  priceHistory: number[]; // last 30 days
}

// -----------------------------------------------------------------------------
// Portfolio
// -----------------------------------------------------------------------------

export interface PortfolioSummary {
  totalValue: number;
  investedValue: number;
  profit: number;
  variation1m: number;
  variation12m: number;
  history: MonthlyData[];
}

export interface MonthlyData {
  month: string; // 'Jan', 'Fev', 'Mar', etc.
  date: string; // '2025-01'
  value: number;
}

// -----------------------------------------------------------------------------
// Allocation
// -----------------------------------------------------------------------------

export interface Allocation {
  class: AssetClass;
  label: string;
  value: number;
  percentage: number;
  color: string;
}

// -----------------------------------------------------------------------------
// Credit Cards
// -----------------------------------------------------------------------------

export type CardBrand = string;

export interface CreditCard {
  id: string;
  name: string;
  lastFour: string;
  brand: CardBrand;
  limit: number;
  used: number;
  dueDate: string;
  closingDate: string;
  color: string;
  secondaryColor: string;
  currentInvoice: number;
  nextInvoice: number;
  transactions: Transaction[];
}

// -----------------------------------------------------------------------------
// Transactions
// -----------------------------------------------------------------------------

export type TransactionCategory =
  | 'food'
  | 'transport'
  | 'subscriptions'
  | 'shopping'
  | 'fuel'
  | 'health'
  | 'travel'
  | 'tech';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: TransactionCategory;
  amount: number;
  installment?: string; // "3/12"
}

// -----------------------------------------------------------------------------
// Category Spending
// -----------------------------------------------------------------------------

export interface CategorySpending {
  category: TransactionCategory;
  label: string;
  icon: string;
  total: number;
  percentage: number;
  color: string;
}

// -----------------------------------------------------------------------------
// Notifications
// -----------------------------------------------------------------------------

export type NotificationType =
  | 'distribution'
  | 'maturity'
  | 'invoice'
  | 'insight'
  | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  date: string;
  read: boolean;
}

// -----------------------------------------------------------------------------
// User
// -----------------------------------------------------------------------------

export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  biometricEnabled: boolean;
  hideValuesOnOpen: boolean;
  pushEnabled: boolean;
  zurtTokens: number;
  revenueShareReceived: number;
  nextDistribution: string;
}

// -----------------------------------------------------------------------------
// Insights
// -----------------------------------------------------------------------------

export interface Insight {
  id: string;
  icon: string;
  text: string;
  action: string;
  type: 'warning' | 'info' | 'opportunity';
}

// -----------------------------------------------------------------------------
// Goals
// -----------------------------------------------------------------------------

export type GoalCategory = 'emergency' | 'trip' | 'car' | 'house' | 'retirement' | 'education' | 'custom';

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  category: GoalCategory;
  icon: string;
  color: string;
  monthly_contribution: number;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Rebalancing
// -----------------------------------------------------------------------------

export interface TargetAllocation {
  class: AssetClass;
  label: string;
  currentPct: number;
  targetPct: number;
  color: string;
}

export type TradeAction = 'BUY' | 'SELL' | 'HOLD';

export interface RebalanceTrade {
  class: AssetClass;
  label: string;
  action: TradeAction;
  amount: number;
  color: string;
}

export interface RebalanceResult {
  trades: RebalanceTrade[];
  totalBuy: number;
  totalSell: number;
  estimatedTax: number;
  netCashRequired: number;
}

// -----------------------------------------------------------------------------
// Tax Dashboard
// -----------------------------------------------------------------------------

export type DarfStatus = 'paid' | 'pending' | 'overdue' | 'exempt';

export interface DarfEntry {
  month: number; // 1-12
  label: string;
  amount: number;
  status: DarfStatus;
  dueDate: string;
}

export interface TaxSummary {
  year: number;
  estimatedIR: number;
  totalGains: number;
  totalLosses: number;
  netGains: number;
  exemptAmount: number;
  taxableAmount: number;
  darfs: DarfEntry[];
}

// -----------------------------------------------------------------------------
// Risk Metrics
// -----------------------------------------------------------------------------

export interface RadarDimension {
  label: string;
  value: number; // 0-100
}

export interface RiskMetrics {
  healthScore: number; // 0-100
  sharpe: number;
  beta: number;
  maxDrawdown: number;
  volatility: number;
  diversification: number;
  concentration: number;
  historicalScores: number[];
}

// -----------------------------------------------------------------------------
// Badges / Achievements
// -----------------------------------------------------------------------------

export type BadgeCategory = 'milestones' | 'consistency' | 'education' | 'tax';

export type BadgeStatus = 'earned' | 'inProgress' | 'locked';

export interface Badge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  category: BadgeCategory;
  status: BadgeStatus;
  progress?: number; // 0-100, for inProgress
  earnedAt?: string;
}

// -----------------------------------------------------------------------------
// Pending Actions (Offline Queue)
// -----------------------------------------------------------------------------

export interface PendingAction {
  id: string;
  method: string;
  path: string;
  body?: any;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Smart Alerts
// -----------------------------------------------------------------------------

export type SmartAlertType =
  | 'portfolio_drift'
  | 'dividend_received'
  | 'goal_milestone'
  | 'tax_deadline'
  | 'market_alert';

export interface SmartAlert {
  id: string;
  type: SmartAlertType;
  title: string;
  body: string;
  date: string;
  read: boolean;
  data?: Record<string, any>;
}

export interface AlertPreferences {
  portfolio_drift: boolean;
  dividend_received: boolean;
  goal_milestone: boolean;
  tax_deadline: boolean;
  market_alert: boolean;
}

// -----------------------------------------------------------------------------
// Consultant Mode
// -----------------------------------------------------------------------------

export interface ConsultantClient {
  id: string;
  name: string;
  email: string;
  initials: string;
  netWorth: number;
  lastSync: string;
  accountCount: number;
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
}

export interface ClientPortfolio {
  summary: {
    totalValue: number;
    investedValue: number;
    profit: number;
    variation12m: number;
  };
  allocations: Allocation[];
  topAssets: { ticker: string; name: string; value: number; variation: number }[];
  riskScore: number;
}
