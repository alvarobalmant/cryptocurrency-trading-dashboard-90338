import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { 
  FinancialAnalytics, 
  RecurrenceMetrics, 
  RevenueByServiceCategory 
} from '@/types/financial-analytics';

interface UseFinancialAnalyticsParams {
  barbershopId: string;
  startDate?: string;
  endDate?: string;
  snapshotType?: 'daily' | 'weekly' | 'monthly';
}

export const useFinancialAnalytics = ({
  barbershopId,
  startDate,
  endDate,
  snapshotType = 'monthly'
}: UseFinancialAnalyticsParams) => {
  return useQuery({
    queryKey: ['financial-analytics', barbershopId, startDate, endDate, snapshotType],
    queryFn: async () => {
      let query = supabase
        .from('analytics_snapshots')
        .select('financial_analytics, period_start, period_end, snapshot_type, captured_at')
        .eq('barbershop_id', barbershopId)
        .eq('snapshot_type', snapshotType)
        .order('period_end', { ascending: false });

      if (startDate) {
        query = query.gte('period_start', startDate);
      }

      if (endDate) {
        query = query.lte('period_end', endDate);
      }

      const { data, error } = await query.limit(1).maybeSingle();

      if (error) {
        console.error('Error fetching financial analytics:', error);
        throw error;
      }

      if (!data || !data.financial_analytics) {
        return null;
      }

      return data.financial_analytics as FinancialAnalytics & {
        recurrence?: RecurrenceMetrics;
        revenueByServiceCategory?: RevenueByServiceCategory[];
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!barbershopId
  });
};

/**
 * Hook para buscar múltiplos snapshots financeiros (histórico)
 */
export const useFinancialAnalyticsHistory = ({
  barbershopId,
  startDate,
  endDate,
  snapshotType = 'monthly',
  limit = 12
}: UseFinancialAnalyticsParams & { limit?: number }) => {
  return useQuery({
    queryKey: ['financial-analytics-history', barbershopId, startDate, endDate, snapshotType, limit],
    queryFn: async () => {
      let query = supabase
        .from('analytics_snapshots')
        .select('financial_analytics, period_start, period_end, snapshot_type, captured_at')
        .eq('barbershop_id', barbershopId)
        .eq('snapshot_type', snapshotType)
        .order('period_end', { ascending: false });

      if (startDate) {
        query = query.gte('period_start', startDate);
      }

      if (endDate) {
        query = query.lte('period_end', endDate);
      }

      const { data, error } = await query.limit(limit);

      if (error) {
        console.error('Error fetching financial analytics history:', error);
        throw error;
      }

      return (data || []).map(snapshot => ({
        ...snapshot.financial_analytics,
        period_start: snapshot.period_start,
        period_end: snapshot.period_end,
        captured_at: snapshot.captured_at
      })) as (FinancialAnalytics & {
        period_start: string;
        period_end: string;
        captured_at: string;
      })[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!barbershopId
  });
};
