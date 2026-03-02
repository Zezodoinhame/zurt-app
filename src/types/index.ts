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
  imageUrl?: string;
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

// -----------------------------------------------------------------------------
// Watchlist
// -----------------------------------------------------------------------------

export interface WatchlistItem {
  id: string;
  ticker: string;
  name: string;
  class: AssetClass;
  currentPrice: number;
  dailyChange: number;
  priceHistory: number[];
  addedAt: string;
}

// -----------------------------------------------------------------------------
// Market News
// -----------------------------------------------------------------------------

export type NewsCategory = 'market' | 'economy' | 'stocks' | 'crypto' | 'funds';

export interface NewsArticle {
  id: string;
  title: string;
  source: string;
  date: string;
  summary: string;
  category: NewsCategory;
  relatedTickers?: string[];
  imageUrl?: string;
  url?: string;
}

// -----------------------------------------------------------------------------
// Dividend Calendar
// -----------------------------------------------------------------------------

export type DividendType = 'dividend' | 'jcp' | 'rendimento';

export interface DividendEvent {
  id: string;
  ticker: string;
  assetName: string;
  type: DividendType;
  amountPerShare: number;
  totalAmount: number;
  exDate: string;
  paymentDate: string;
  quantity: number;
}

export interface DividendMonth {
  month: string;
  date: string;
  events: DividendEvent[];
  totalIncome: number;
}

// -----------------------------------------------------------------------------
// Asset Comparison
// -----------------------------------------------------------------------------

export interface AssetComparisonData {
  ticker: string;
  name: string;
  ytdReturn: number;
  return12m: number;
  volatility: number;
  dividendYield: number;
  pe: number;
  marketCap: number;
  color: string;
}

// -----------------------------------------------------------------------------
// Budget
// -----------------------------------------------------------------------------

export interface BudgetCategory {
  category: TransactionCategory;
  limit: number;
  spent: number;
  color: string;
  icon: string;
}

export interface MonthlyBudget {
  month: string;
  totalLimit: number;
  totalSpent: number;
  categories: BudgetCategory[];
}

// -----------------------------------------------------------------------------
// Cash Flow Forecast
// -----------------------------------------------------------------------------

export interface CashFlowMonth {
  month: string;
  date: string;
  income: number;
  expenses: number;
  savings: number;
}

// -----------------------------------------------------------------------------
// Spending Insights
// -----------------------------------------------------------------------------

export interface CategoryTrend {
  category: TransactionCategory;
  label: string;
  color: string;
  months: { month: string; amount: number }[];
}

export interface SpendingInsightsData {
  categoryTrends: CategoryTrend[];
  topMerchants: { name: string; total: number; count: number }[];
  avgDailySpend: number;
  biggestExpense: { description: string; amount: number; date: string };
  spendingVelocity: number;
  savingsRate: number;
  totalThisMonth: number;
  totalLastMonth: number;
}

// -----------------------------------------------------------------------------
// Bill Reminders
// -----------------------------------------------------------------------------

export type BillStatus = 'paid' | 'pending' | 'overdue';
export type BillFrequency = 'monthly' | 'yearly' | 'weekly' | 'one-time';

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  frequency: BillFrequency;
  category: TransactionCategory;
  status: BillStatus;
  icon: string;
  color: string;
  reminder: boolean;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Correlation Matrix
// -----------------------------------------------------------------------------

export interface CorrelationPair {
  assetA: string; // ticker
  assetB: string; // ticker
  value: number; // -1 to +1
}

export interface CorrelationMatrix {
  tickers: string[];
  values: number[][]; // NxN matrix
  diversificationScore: number; // 0-100
}

// -----------------------------------------------------------------------------
// Backtesting
// -----------------------------------------------------------------------------

export interface BacktestAllocation {
  ticker: string;
  name: string;
  percentage: number; // 0-100
  color: string;
}

export interface BacktestPeriodReturn {
  date: string; // '2021-01'
  value: number; // portfolio value
  returnPct: number; // monthly return %
}

export interface BacktestResult {
  allocations: BacktestAllocation[];
  periodReturns: BacktestPeriodReturn[];
  totalReturn: number;
  cagr: number;
  maxDrawdown: number;
  sharpe: number;
  bestMonth: BacktestPeriodReturn;
  worstMonth: BacktestPeriodReturn;
  initialValue: number;
  finalValue: number;
}

// -----------------------------------------------------------------------------
// Scenario Planner
// -----------------------------------------------------------------------------

export type ScenarioType = 'bull' | 'bear' | 'rateHike' | 'crash' | 'custom';

export interface ScenarioPreset {
  type: ScenarioType;
  label: string;
  emoji: string;
  description: string;
  changes: Record<AssetClass, number>; // % change per asset class
}

export interface ScenarioResult {
  currentValue: number;
  projectedValue: number;
  totalChange: number;
  totalChangePct: number;
  perClass: {
    class: AssetClass;
    label: string;
    currentValue: number;
    projectedValue: number;
    changePct: number;
    color: string;
  }[];
}

// -----------------------------------------------------------------------------
// Price Alerts
// -----------------------------------------------------------------------------

export type PriceAlertCondition = 'above' | 'below';
export type PriceAlertStatus = 'active' | 'triggered' | 'expired';

export interface PriceAlert {
  id: string;
  ticker: string;
  name: string;
  condition: PriceAlertCondition;
  targetPrice: number;
  currentPrice: number;
  status: PriceAlertStatus;
  createdAt: string;
  triggeredAt?: string;
}

// -----------------------------------------------------------------------------
// Recurring Investments
// -----------------------------------------------------------------------------

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly';
export type RecurringStatus = 'active' | 'paused';

export interface RecurringInvestment {
  id: string;
  ticker: string;
  name: string;
  amount: number;
  frequency: RecurringFrequency;
  executionDay: number; // 1-28
  status: RecurringStatus;
  nextExecution: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Net Worth Timeline
// -----------------------------------------------------------------------------

export interface NetWorthMilestone {
  id: string;
  label: string;
  emoji: string;
  date: string;
  value: number;
}

export interface NetWorthDataPoint {
  date: string; // '2024-03'
  assets: number;
  liabilities: number;
  netWorth: number;
}

export interface NetWorthSummary {
  currentNetWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  momGrowth: number;
  yoyGrowth: number;
  allTimeGrowth: number;
  timeline: NetWorthDataPoint[];
  milestones: NetWorthMilestone[];
}

// -----------------------------------------------------------------------------
// Debt Manager
// -----------------------------------------------------------------------------

export type DebtType = 'loan' | 'mortgage' | 'credit_card' | 'student_loan' | 'other';

export type PayoffStrategy = 'snowball' | 'avalanche';

export interface Debt {
  id: string;
  name: string;
  type: DebtType;
  totalAmount: number;
  remainingAmount: number;
  interestRate: number; // annual %
  minimumPayment: number;
  dueDate: string;
  createdAt: string;
}

export interface DebtSummary {
  totalDebt: number;
  monthlyPayments: number;
  totalInterestCost: number;
  debtFreeDate: string;
}

export interface PayoffComparison {
  snowball: { totalInterest: number; months: number };
  avalanche: { totalInterest: number; months: number };
  interestSaved: number;
  monthsSaved: number;
}

// -----------------------------------------------------------------------------
// Retirement Calculator
// -----------------------------------------------------------------------------

export interface RetirementParams {
  currentAge: number;
  retirementAge: number;
  monthlyContribution: number;
  expectedReturn: number; // annual %
  currentSavings: number;
  monthlyExpenses: number;
  inflation: number; // annual %
}

export interface RetirementResult {
  projectedFund: number;
  monthlyRetirementIncome: number;
  fireNumber: number;
  surplus: number; // positive = surplus, negative = deficit
  timelineByAge: { age: number; balance: number }[];
}

// -----------------------------------------------------------------------------
// Monte Carlo Simulation
// -----------------------------------------------------------------------------

export type MonteCarloHorizon = 5 | 10 | 20 | 30;

export interface MonteCarloPercentile {
  label: string; // e.g. '10th', '25th', '50th', '75th', '90th'
  values: number[]; // one value per year
  color: string;
}

export interface MonteCarloResult {
  horizon: MonteCarloHorizon;
  initialValue: number;
  targetValue: number;
  successProbability: number; // 0-100
  medianOutcome: number;
  bestCase: number;
  worstCase: number;
  percentiles: MonteCarloPercentile[];
  years: number[]; // [0, 1, 2, ..., horizon]
}

// -----------------------------------------------------------------------------
// Learn Hub
// -----------------------------------------------------------------------------

export type LessonCategory = 'beginner' | 'intermediate' | 'advanced';

export interface Lesson {
  id: string;
  emoji: string;
  title: string;
  description: string;
  category: LessonCategory;
  readingTimeMin: number;
  content: string;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface LearnProgress {
  completedIds: string[];
  streak: number;
  lastCompletedDate: string;
}

// -----------------------------------------------------------------------------
// Crypto Tracker
// -----------------------------------------------------------------------------

export interface CryptoHolding {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  currentValue: number;
  change24h: number;
  change7d: number;
  change30d: number;
  sparkline: number[];
  color: string;
  icon: string;
}

export interface CryptoPortfolio {
  totalValue: number;
  totalInvested: number;
  totalProfit: number;
  change24h: number;
  change7d: number;
  change30d: number;
  holdings: CryptoHolding[];
  fearGreedIndex: number;
  dominance: { symbol: string; percentage: number; color: string }[];
}

// -----------------------------------------------------------------------------
// Subscription Manager
// -----------------------------------------------------------------------------

export type SubscriptionCategory = 'entertainment' | 'productivity' | 'health' | 'education' | 'cloud' | 'other';
export type SubscriptionBilling = 'monthly' | 'yearly' | 'weekly';
export type SubscriptionStatus = 'active' | 'cancelled';

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  billing: SubscriptionBilling;
  category: SubscriptionCategory;
  status: SubscriptionStatus;
  nextBilling: string;
  icon: string;
  color: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Real Estate Calculator
// -----------------------------------------------------------------------------

export interface RealEstateParams {
  propertyValue: number;
  downPaymentPct: number;
  annualRate: number;
  termYears: number;
  rentValue: number;
  annualRentIncrease: number;
  appreciationRate: number;
  investmentReturn: number;
}

export interface RealEstateResult {
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
  downPayment: number;
  loanAmount: number;
  breakEvenYear: number;
  buyTotalCost: number[];
  rentTotalCost: number[];
  propertyValues: number[];
  recommendation: 'buy' | 'rent' | 'neutral';
}

// -----------------------------------------------------------------------------
// Savings Challenges
// -----------------------------------------------------------------------------

export type ChallengeType = '52week' | 'roundUp' | 'noSpend' | 'custom';
export type ChallengeStatus = 'active' | 'completed' | 'abandoned';

export interface SavingsChallenge {
  id: string;
  name: string;
  type: ChallengeType;
  status: ChallengeStatus;
  targetAmount: number;
  currentAmount: number;
  startDate: string;
  endDate: string;
  emoji: string;
  color: string;
  checkedItems: number[];
  totalItems: number;
  createdAt: string;
}

export interface ChallengesSummary {
  totalSaved: number;
  activeChallenges: number;
  completedChallenges: number;
  currentStreak: number;
}

// -----------------------------------------------------------------------------
// FIRE (Financial Independence)
// -----------------------------------------------------------------------------

export interface FIREParams {
  currentAge: number;
  annualIncome: number;
  annualExpenses: number;
  currentNetWorth: number;
  expectedReturn: number;
  inflation: number;
  safeWithdrawalRate: number;
}

export interface FIREResult {
  fireNumber: number;
  leanFireNumber: number;
  fatFireNumber: number;
  coastFireNumber: number;
  coastFireAge: number;
  savingsRate: number;
  yearsToFI: number;
  fiAge: number;
  monthlySavings: number;
  projectionByYear: { year: number; age: number; netWorth: number }[];
  isCoastFIReached: boolean;
}

// -----------------------------------------------------------------------------
// Investment Diary
// -----------------------------------------------------------------------------

export type DiaryMood = 'confident' | 'anxious' | 'uncertain' | 'calm' | 'focused';
export type DiaryTag = 'stock' | 'crypto' | 'fund' | 'rebalance' | 'macro' | 'custom';
export type DiaryDecision = 'buy' | 'sell' | 'hold';

export interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  mood: DiaryMood;
  tags: DiaryTag[];
  ticker?: string;
  decision?: DiaryDecision;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Compound Interest Calculator
// -----------------------------------------------------------------------------

export interface CompoundParams {
  initialAmount: number;
  monthlyContribution: number;
  annualRate: number;
  years: number;
  inflationAdjust: boolean;
  inflationRate: number;
}

export interface CompoundResult {
  finalValue: number;
  totalInvested: number;
  totalInterest: number;
  finalValueInflationAdj: number;
  totalInterestInflationAdj: number;
  projectionByMonth: { month: number; balance: number; balanceAdj: number }[];
}

// -----------------------------------------------------------------------------
// Currency Converter
// -----------------------------------------------------------------------------

export type CurrencyCode = 'BRL' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CNY';

export interface CurrencyRate {
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number;
  history: number[]; // 30-day history
}

// -----------------------------------------------------------------------------
// Emergency Fund
// -----------------------------------------------------------------------------

export interface EmergencyFundData {
  currentAmount: number;
  monthlyExpenses: number;
  targetMonths: number;
  contributions: { date: string; amount: number }[];
}

// -----------------------------------------------------------------------------
// Financial Calendar
// -----------------------------------------------------------------------------

export type FinancialEventType = 'dividend' | 'bill' | 'tax_deadline' | 'goal_deadline' | 'custom';

export interface FinancialEvent {
  id: string;
  title: string;
  date: string;
  amount: number;
  type: FinancialEventType;
  color: string;
}
