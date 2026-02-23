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
