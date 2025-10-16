import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ClientDetailedAnalytics } from '@/types/financial-analytics';

interface UseClientAnalyticsParams {
  barbershopId: string;
  startDate?: string;
  endDate?: string;
}

export const useClientAnalytics = ({
  barbershopId,
  startDate,
  endDate
}: UseClientAnalyticsParams) => {
  return useQuery({
    queryKey: ['client-analytics', barbershopId, startDate, endDate],
    queryFn: async () => {
      // Buscar snapshot mais recente
      let query = supabase
        .from('analytics_snapshots')
        .select('client_detailed_analytics, period_start, period_end')
        .eq('barbershop_id', barbershopId)
        .order('captured_at', { ascending: false });

      if (startDate) {
        query = query.gte('period_start', startDate);
      }

      if (endDate) {
        query = query.lte('period_end', endDate);
      }

      const { data, error } = await query.limit(1).maybeSingle();

      if (error) {
        console.error('Error fetching client analytics:', error);
        throw error;
      }

      if (!data || !data.client_detailed_analytics) {
        return {
          clients: [],
          summary: {
            totalClients: 0,
            vipClients: 0,
            regularClients: 0,
            newClients: 0,
            atRiskClients: 0,
            averageLTV: 0,
            averageVisitFrequency: 0,
            retentionRate: 0,
            averageNPS: 0
          }
        };
      }

      const clients = data.client_detailed_analytics as ClientDetailedAnalytics[];

      // Calcular métricas agregadas
      const summary = {
        totalClients: clients.length,
        vipClients: clients.filter(c => c.totalAppointments >= 10).length,
        regularClients: clients.filter(c => c.totalAppointments >= 3 && c.totalAppointments < 10).length,
        newClients: clients.filter(c => c.totalAppointments < 3).length,
        atRiskClients: clients.filter(c => c.churnRisk > 70).length,
        averageLTV: clients.reduce((sum, c) => sum + c.lifetimeValue, 0) / (clients.length || 1),
        averageVisitFrequency: clients.reduce((sum, c) => sum + c.visitFrequency, 0) / (clients.length || 1),
        retentionRate: clients.reduce((sum, c) => sum + c.retentionRate, 0) / (clients.length || 1),
        averageNPS: clients
          .filter(c => c.npsScore !== null)
          .reduce((sum, c) => sum + (c.npsScore || 0), 0) / 
          (clients.filter(c => c.npsScore !== null).length || 1)
      };

      return {
        clients,
        summary,
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

/**
 * Hook para buscar insights de clientes específicos
 */
export const useClientInsights = (barbershopId: string, clientProfileId: string) => {
  return useQuery({
    queryKey: ['client-insights', barbershopId, clientProfileId],
    queryFn: async () => {
      // Buscar todas as informações do cliente
      const [
        { data: client },
        { data: appointments },
        { data: subscriptions },
        { data: feedback }
      ] = await Promise.all([
        supabase
          .from('client_profiles')
          .select('*')
          .eq('id', clientProfileId)
          .single(),
        supabase
          .from('appointments')
          .select('*, services(name, price)')
          .eq('client_profile_id', clientProfileId)
          .order('appointment_date', { ascending: false }),
        supabase
          .from('client_subscriptions')
          .select('*, subscription_plans(name, price)')
          .eq('client_profile_id', clientProfileId)
          .order('created_at', { ascending: false }),
        supabase
          .from('client_feedback')
          .select('*')
          .eq('client_profile_id', clientProfileId)
          .order('created_at', { ascending: false })
      ]);

      // CORRIGIDO: Calcular métricas individuais usando dados reais de PAYMENTS
      // Buscar pagamentos reais do cliente
      const { data: clientPayments } = await supabase
        .from('payments')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('client_phone', client?.phone || '')
        .eq('status', 'paid');

      const totalSpent = (clientPayments || [])
        .reduce((sum, p) => sum + (Number(p.net_received_amount) || Number(p.amount) || 0), 0);

      const visitDates = (appointments || [])
        .filter(a => a.status === 'confirmed')
        .map(a => new Date(a.appointment_date).getTime())
        .sort();

      const visitFrequency = visitDates.length > 1
        ? visitDates.slice(1).reduce((sum, date, i) => 
            sum + (date - visitDates[i]), 0
          ) / (visitDates.length - 1) / (1000 * 60 * 60 * 24)
        : 0;

      const lastVisit = visitDates.length > 0 
        ? new Date(visitDates[visitDates.length - 1]).toISOString()
        : null;

      const daysSinceLastVisit = lastVisit
        ? Math.floor((Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      const churnRisk = Math.min(100, Math.max(0, 
        daysSinceLastVisit > 90 ? 100 :
        daysSinceLastVisit > 60 ? 75 :
        daysSinceLastVisit > 30 ? 50 : 25
      ));

      const avgNPS = (feedback || [])
        .filter(f => f.nps_score !== null)
        .reduce((sum, f) => sum + (f.nps_score || 0), 0) / 
        ((feedback || []).filter(f => f.nps_score !== null).length || 1);

      const avgRating = (feedback || [])
        .filter(f => f.rating !== null)
        .reduce((sum, f) => sum + (f.rating || 0), 0) / 
        ((feedback || []).filter(f => f.rating !== null).length || 1);

      return {
        client,
        appointments: appointments || [],
        subscriptions: subscriptions || [],
        feedback: feedback || [],
        metrics: {
          lifetimeValue: totalSpent,
          visitFrequency,
          lastVisit,
          daysSinceLastVisit,
          churnRisk,
          averageTicket: (appointments || []).length > 0 
            ? totalSpent / (appointments || []).length 
            : 0,
          npsScore: isNaN(avgNPS) ? null : avgNPS,
          satisfactionRating: isNaN(avgRating) ? null : avgRating,
          hasActiveSubscription: (subscriptions || []).some(s => s.status === 'active')
        }
      };
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!barbershopId && !!clientProfileId
  });
};
