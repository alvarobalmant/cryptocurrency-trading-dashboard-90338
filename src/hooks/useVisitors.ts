import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Visitor {
  visitor_phone: string;
  visitor_name: string;
  variant_names: string[];
  variant_phones: string[];
  total_appointments: number;
  confirmed_appointments: number;
  pending_appointments: number;
  cancelled_appointments: number;
  no_show_appointments: number;
  first_appointment_date: string;
  last_appointment_date: string;
  days_since_last_visit: number;
}

export const useVisitors = (barbershopId?: string) => {
  return useQuery({
    queryKey: ['visitors', barbershopId],
    queryFn: async () => {
      if (!barbershopId) return [];
      
      const { data, error } = await supabase
        .rpc('get_visitors_by_barbershop', {
          p_barbershop_id: barbershopId,
          p_limit: 100
        });
      
      if (error) {
        console.error('Erro ao buscar visitantes:', error);
        throw error;
      }
      
      return (data || []) as Visitor[];
    },
    enabled: !!barbershopId,
    staleTime: 5 * 60 * 1000,
  });
};
