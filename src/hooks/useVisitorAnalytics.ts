import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface VisitorDetail {
  visitorPhone: string;
  visitorName: string;
  variantNames?: string[];
  variantPhones?: string[];
  
  // CONTADORES DE APPOINTMENTS
  totalAppointments: number;
  confirmedAppointments: number;
  completedAppointments: number;
  pendingAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  queueReservedAppointments: number;
  
  // CONTADORES DE PAGAMENTOS
  paidPayments: number;
  pendingPayments: number;
  failedPayments: number;
  
  // VALORES FINANCEIROS
  totalPaidValue: number;
  totalPendingValue: number;
  totalExpectedValue: number;
  averageTicket: number;
  
  // DATAS
  firstAppointmentDate: string | null;
  lastAppointmentDate: string | null;
  lastPaidDate: string | null;
  daysSinceLastAppointment: number;
  daysSinceLastPaidVisit: number;
  visitFrequency: number;
  
  // CLASSIFICAÇÕES
  isRecurring: boolean;
  conversionPotential: 'high' | 'medium' | 'low';
}

interface VisitorMetrics {
  totalVisitors: number;
  recurringVisitors: number;
  oneTimeVisitors: number;
  totalAppointments: number;
  totalConfirmedAppointments: number;
  conversionOpportunities: number;
  appointmentsShare: number;
  
  // MÉTRICAS FINANCEIRAS
  totalRevenue: number;
  totalPendingRevenue: number;
  averageTicket: number;
  totalPaidPayments: number;
}

interface UseVisitorAnalyticsParams {
  barbershopId: string;
  startDate?: string;
  endDate?: string;
}

export const useVisitorAnalytics = ({
  barbershopId,
  startDate,
  endDate
}: UseVisitorAnalyticsParams) => {
  return useQuery({
    queryKey: ['visitor-analytics', barbershopId, startDate, endDate],
    queryFn: async () => {
      console.log('🔍 [useVisitorAnalytics] Buscando visitantes para:', {
        barbershopId,
        startDate,
        endDate
      });

      // Buscar snapshot mais recente com dados de visitantes
      let query = supabase
        .from('analytics_snapshots')
        .select('visitor_detailed_analytics, visitor_metrics, period_start, period_end, barbershop_id, barbershop_name')
        .eq('barbershop_id', barbershopId)
        .order('captured_at', { ascending: false });

      if (startDate) {
        query = query.gte('period_start', startDate);
      }

      if (endDate) {
        query = query.lte('period_end', endDate);
      }

      const { data, error } = await query.limit(1).maybeSingle();

      console.log('📊 [useVisitorAnalytics] Snapshot encontrado:', {
        hasData: !!data,
        barbershop: data?.barbershop_name,
        period: data ? `${data.period_start} - ${data.period_end}` : null,
        visitorsCount: Array.isArray(data?.visitor_detailed_analytics) ? data.visitor_detailed_analytics.length : 0
      });

      if (error) {
        console.error('Error fetching visitor analytics:', error);
        throw error;
      }

      if (!data || !data.visitor_detailed_analytics) {
        console.warn('⚠️ [useVisitorAnalytics] Nenhum snapshot com dados de visitantes encontrado');
        return {
          visitors: [] as VisitorDetail[],
          metrics: {
            totalVisitors: 0,
            recurringVisitors: 0,
            oneTimeVisitors: 0,
            totalAppointments: 0,
            totalConfirmedAppointments: 0,
            conversionOpportunities: 0,
            appointmentsShare: 0
          } as VisitorMetrics,
          period: null
        };
      }

      const visitors = data.visitor_detailed_analytics as VisitorDetail[];
      console.log('✅ [useVisitorAnalytics] Visitantes carregados:', visitors.map(v => ({
        nome: v.visitorName,
        telefone: v.visitorPhone,
        agendamentos: v.totalAppointments,
        confirmados: v.confirmedAppointments
      })));

      return {
        visitors,
        metrics: data.visitor_metrics as VisitorMetrics,
        period: {
          start: data.period_start,
          end: data.period_end
        }
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!barbershopId
  });
};
