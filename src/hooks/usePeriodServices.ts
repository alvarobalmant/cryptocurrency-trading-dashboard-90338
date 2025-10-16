import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PeriodService {
  id: string;
  appointment_id: string;
  service_id: string;
  service_name: string;
  service_price: number;
  commission_percentage: number;
  commission_amount: number;
  performed_at: string;
  appointment?: {
    appointment_date: string;
    start_time: string;
    client_name: string;
  };
}

export const usePeriodServices = (periodId: string) => {
  const { data: services, isLoading } = useQuery({
    queryKey: ['period-services', periodId],
    queryFn: async (): Promise<PeriodService[]> => {
      // Buscar comissões vinculadas ao período
      const { data: items, error: itemsError } = await supabase
        .from('commission_period_items')
        .select(`
          commission_transaction:commissions_transactions(
            id,
            appointment_id,
            service_id,
            service_value,
            commission_percentage,
            commission_value,
            created_at,
            appointment:appointments(
              appointment_date,
              start_time,
              client_name
            ),
            service:services(
              name
            )
          )
        `)
        .eq('period_id', periodId);
      
      if (itemsError) throw itemsError;
      
      // Transformar para formato esperado
      const services: PeriodService[] = (items || []).map((item: any) => {
        const ct = item.commission_transaction;
        return {
          id: ct.id,
          appointment_id: ct.appointment_id,
          service_id: ct.service_id,
          service_name: ct.service?.name || 'Serviço',
          service_price: ct.service_value || 0,
          commission_percentage: ct.commission_percentage || 0,
          commission_amount: ct.commission_value || 0,
          performed_at: ct.appointment?.appointment_date && ct.appointment?.start_time 
            ? `${ct.appointment.appointment_date}T${ct.appointment.start_time}`
            : ct.created_at,
          appointment: ct.appointment
        };
      });
      
      return services;
    },
    enabled: !!periodId
  });

  return {
    services: services || [],
    isLoading
  };
};
