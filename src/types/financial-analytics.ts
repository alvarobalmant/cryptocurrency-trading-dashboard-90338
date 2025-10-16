/**
 * FINANCIAL ANALYTICS TYPES
 * 
 * Tipos para a estrutura consolidada de dados financeiros
 * armazenados no campo financial_analytics da tabela analytics_snapshots
 */

export interface PaymentMethodDetails {
  amount: number;
  count: number;
  percentage: number;
}

export interface PaymentMethods {
  pix: PaymentMethodDetails;
  card: PaymentMethodDetails;
  cash: PaymentMethodDetails;
  subscription: PaymentMethodDetails;
  total_amount: number;
  total_count: number;
}

export interface RevenueBySource {
  services: number;
  products: number;
  subscriptions: number;
  tabs: number;
}

export interface MonthlyRevenueHistory {
  month: string; // YYYY-MM
  total: number;
  by_source: RevenueBySource;
}

export interface Revenue {
  received: number;        // Receita confirmada e paga
  pending: number;         // Receita confirmada mas pendente
  future: number;          // Receita futura (agendamentos pendentes)
  lost: number;            // Receita perdida (cancelamentos)
  by_source: RevenueBySource;
  monthly_history: MonthlyRevenueHistory[];
}

export interface CostDistribution {
  commissions_pct: number;
  products_pct: number;
  purchase_orders_pct: number;
  saas_pct: number;
}

export interface MonthlyCostHistory {
  month: string; // YYYY-MM
  total: number;
  commissions?: number;
  products?: number;
  purchase_orders?: number;
  saas?: number;
}

export interface Costs {
  commissions_paid: number;
  commissions_pending: number;
  products: number;
  purchase_orders: number;
  saas: number;
  total: number;
  distribution: CostDistribution;
  monthly_history: MonthlyCostHistory[];
}

export interface MonthlyMarginHistory {
  month: string; // YYYY-MM
  gross_margin: number;    // Percentual
  net_margin: number;      // Percentual
  gross_profit: number;
  net_profit: number;
}

export interface Margins {
  gross_profit: number;
  gross_margin: number;    // Percentual
  net_profit: number;
  net_margin: number;      // Percentual
  ebitda: number;
  monthly_history: MonthlyMarginHistory[];
}

export interface MonthlyCashFlowHistory {
  month: string; // YYYY-MM
  inflow: number;
  outflow: number;
  net: number;
}

export interface CashFlow {
  net_cash_flow: number;
  inflow: number;
  outflow: number;
  burn_rate: number;
  runway_months: number;
  subscription_mrr: number;
  monthly_history: MonthlyCashFlowHistory[];
}

export interface Profitability {
  gross_revenue: number;
  net_revenue: number;
  cogs: number;              // Cost of goods sold
  labor_costs: number;
  operational_costs: number;
  roi: number;               // Return on investment %
  profit_per_transaction: number;
}

export interface FinancialMetadata {
  period_start: string;      // YYYY-MM-DD
  period_end: string;        // YYYY-MM-DD
  snapshot_type: 'daily' | 'weekly' | 'monthly';
  captured_at: string;       // ISO timestamp
  total_transactions: number;
  data_quality_score: number;
}

export interface FinancialAnalytics {
  revenue: Revenue;
  costs: Costs;
  margins: Margins;
  cash_flow: CashFlow;
  payment_methods: PaymentMethods;
  profitability: Profitability;
  metadata: FinancialMetadata;
}

/**
 * Helper para verificar se um snapshot tem dados financeiros consolidados
 */
export const hasFinancialAnalytics = (snapshot: any): snapshot is { financial_analytics: FinancialAnalytics } => {
  return snapshot?.financial_analytics && 
         typeof snapshot.financial_analytics === 'object' &&
         'revenue' in snapshot.financial_analytics &&
         'costs' in snapshot.financial_analytics &&
         'margins' in snapshot.financial_analytics &&
         'cash_flow' in snapshot.financial_analytics &&
         'payment_methods' in snapshot.financial_analytics &&
         'metadata' in snapshot.financial_analytics;
};

/**
 * Utilização diária de um funcionário
 */
export interface DayUtilization {
  available_hours: number;  // Horas disponíveis no schedule
  worked_hours: number;      // Horas efetivamente trabalhadas
  utilization_pct: number;   // Percentual de utilização (0-100+)
}

/**
 * Mapa de calor semanal de utilização
 */
export interface WeeklyUtilization {
  sunday: DayUtilization;
  monday: DayUtilization;
  tuesday: DayUtilization;
  wednesday: DayUtilization;
  thursday: DayUtilization;
  friday: DayUtilization;
  saturday: DayUtilization;
}

/**
 * Analytics detalhado de um funcionário
 */
export interface EmployeeDetailedAnalytics {
  employeeId: string;
  employeeName: string;
  totalAppointments: number;
  confirmedAppointments: number;
  pendingAppointments: number;
  cancelledAppointments: number;
  revenue: number;
  confirmedRevenue: number;
  pendingRevenue: number;
  cancelledRevenue: number;
  clientsServed: number;
  avgRevenuePerService: number;
  conversionRate: number;
  
  // Mapa de calor de utilização
  weeklyUtilization: WeeklyUtilization;
  totalAvailableHours: number;
  totalWorkedHours: number;
  overallUtilization: number;
  
  // NOVAS MÉTRICAS - FASE 1
  revenuePerHour: number;           // Receita por hora trabalhada
  cancellationRate: number;         // % de cancelamentos
  rescheduleRate: number;           // % de reagendamentos
  productivityScore: number;        // Score 0-100 baseado em múltiplos fatores
}

/**
 * Analytics detalhado de clientes
 */
export interface ClientDetailedAnalytics {
  clientProfileId: string;
  clientName: string;
  clientPhone: string;
  totalAppointments: number;
  confirmedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  totalSpent: number;
  lastVisit: string | null;
  firstVisit: string | null;
  
  // NOVAS MÉTRICAS - FASE 1
  lifetimeValue: number;            // LTV - valor total histórico
  visitFrequency: number;           // Dias médios entre visitas
  retentionRate: number;            // % de retorno (0-100)
  churnRisk: number;                // Score de risco 0-100 (100 = alto risco)
  daysSinceLastVisit: number;       // Dias desde última visita
  averageTicket: number;            // Ticket médio
  hasActiveSubscription: boolean;   // Tem assinatura ativa
  npsScore: number | null;          // NPS médio se disponível
  satisfactionRating: number | null; // Rating médio se disponível
}

/**
 * Métricas de recorrência e assinaturas
 */
export interface RecurrenceMetrics {
  activeSubscriptions: number;
  totalSubscriptionRevenue: number;
  monthlyRecurringRevenue: number;  // MRR
  averageSubscriptionValue: number;
  subscriptionChurnRate: number;    // % de cancelamentos no período
  newSubscriptions: number;
  cancelledSubscriptions: number;
  subscriptionRetentionRate: number;
}

/**
 * Breakdown de receita por categoria de serviço
 */
export interface RevenueByServiceCategory {
  categoryName: string;
  revenue: number;
  appointmentCount: number;
  averageTicket: number;
  percentage: number; // % do total
}

/**
 * Helper para extrair dados financeiros com fallback
 */
export const extractFinancialData = (snapshot: any): FinancialAnalytics | null => {
  if (hasFinancialAnalytics(snapshot)) {
    return snapshot.financial_analytics;
  }
  return null;
};
