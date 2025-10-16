import { useMemo } from 'react';
import type { FinancialAnalytics } from '@/types/financial-analytics';

interface AnalyticsForHealth {
  financial_analytics?: FinancialAnalytics;
  // Fallback para formato antigo
  receivedRevenue?: number;
  pendingRevenue?: number;
  futureRevenue?: number;
  totalRevenue?: number;
  totalCommissions?: number;
  totalAppointments?: number;
  cancelledAppointments?: number;
}

export const useFinancialHealth = (analytics: AnalyticsForHealth | null) => {
  return useMemo(() => {
    if (!analytics) return { score: 0, status: 'unknown' as const, trend: 0 };

    // Tentar usar novo formato primeiro
    if (analytics.financial_analytics) {
      const financial = analytics.financial_analytics;
      
      // Calculate cash flow health (40% weight)
      const totalRevenue = financial.revenue.received + financial.revenue.pending + financial.revenue.future;
      const cashFlowRatio = totalRevenue > 0 
        ? (financial.revenue.received / totalRevenue) * 100
        : 0;
      const cashFlowScore = Math.min(cashFlowRatio * 0.4, 40);

      // Calculate efficiency score (30% weight) - baseado na margem
      const efficiencyScore = Math.min((financial.margins.net_margin / 100) * 30, 30);

      // Calculate growth potential (30% weight) - baseado no cash flow positivo
      const growthScore = financial.cash_flow.net_cash_flow > 0 ? 30 : 15;

      const totalScore = Math.round(cashFlowScore + efficiencyScore + growthScore);

      // Determine status
      let status: 'excellent' | 'good' | 'fair' | 'poor';
      if (totalScore >= 80) status = 'excellent';
      else if (totalScore >= 60) status = 'good';
      else if (totalScore >= 40) status = 'fair';
      else status = 'poor';

      // Trend baseado em histórico mensal
      let trend = 0;
      if (financial.revenue.monthly_history && financial.revenue.monthly_history.length >= 2) {
        const lastMonth = financial.revenue.monthly_history[financial.revenue.monthly_history.length - 1];
        const prevMonth = financial.revenue.monthly_history[financial.revenue.monthly_history.length - 2];
        trend = lastMonth.total > prevMonth.total ? 1 : -1;
      } else {
        trend = financial.revenue.received > financial.revenue.pending ? 1 : -1;
      }

      return { score: totalScore, status, trend };
    }

    // Fallback para formato antigo
    const cashFlowRatio = (analytics.receivedRevenue || 0) > 0 
      ? ((analytics.receivedRevenue || 0) / ((analytics.receivedRevenue || 0) + (analytics.pendingRevenue || 0) + (analytics.futureRevenue || 0))) * 100
      : 0;
    const cashFlowScore = Math.min(cashFlowRatio * 0.4, 40);

    const commissionEfficiency = (analytics.totalRevenue || 0) > 0
      ? (((analytics.totalRevenue || 0) - (analytics.totalCommissions || 0)) / (analytics.totalRevenue || 0)) * 100
      : 0;
    const efficiencyScore = Math.min((commissionEfficiency / 100) * 30, 30);

    const cancellationRate = (analytics.totalAppointments || 0) > 0
      ? ((analytics.cancelledAppointments || 0) / (analytics.totalAppointments || 0))
      : 0;
    const growthScore = Math.max(0, (1 - cancellationRate) * 30);

    const totalScore = Math.round(cashFlowScore + efficiencyScore + growthScore);

    let status: 'excellent' | 'good' | 'fair' | 'poor';
    if (totalScore >= 80) status = 'excellent';
    else if (totalScore >= 60) status = 'good';
    else if (totalScore >= 40) status = 'fair';
    else status = 'poor';

    const trend = (analytics.receivedRevenue || 0) > (analytics.pendingRevenue || 0) ? 1 : -1;

    return { score: totalScore, status, trend };
  }, [analytics]);
};
