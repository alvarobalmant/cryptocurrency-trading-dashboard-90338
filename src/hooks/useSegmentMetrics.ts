import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SegmentMetric {
  segment: string;
  client_count: number;
  total_clv: number;
  avg_clv: number;
  total_revenue: number;
  avg_frequency: number;
  avg_ticket: number;
  avg_days_since_visit: number;
}

export const useSegmentMetrics = (
  barbershopId: string,
  startDate: string,
  endDate: string
) => {
  return useQuery({
    queryKey: ['segment-metrics', barbershopId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('calculate_segment_metrics', {
        p_barbershop_id: barbershopId,
        p_period_start: startDate,
        p_period_end: endDate
      });

      if (error) {
        console.error('Error fetching segment metrics:', error);
        throw error;
      }

      const metrics = (data as SegmentMetric[]) || [];
      
      return {
        vip: metrics.find(m => m.segment === 'vip') || null,
        regular: metrics.find(m => m.segment === 'regular') || null,
        new: metrics.find(m => m.segment === 'new') || null
      };
    },
    enabled: !!barbershopId && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000
  });
};
