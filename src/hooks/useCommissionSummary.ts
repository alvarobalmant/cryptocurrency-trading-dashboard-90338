import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EmployeeCommissionSummary {
  employee_id: string;
  employee_name: string;
  total_due: number;
  total_paid: number;
  total_all_time: number;
  pending_transactions_count: number;
  last_payment_date: string | null;
}

export interface CommissionSummary {
  id: string;
  barbershop_id: string;
  employee_id: string;
  total_commission_due: number;
  total_commission_paid: number;
  last_updated: string;
  created_at: string;
  employee?: {
    name: string;
    avatar_url: string | null;
  };
}

export const useCommissionSummary = (barbershopId: string, employeeId?: string) => {
  return useQuery({
    queryKey: ['commission-summary', barbershopId, employeeId],
    queryFn: async () => {
      if (employeeId) {
        // Resumo detalhado de um funcionário específico
        const { data, error } = await supabase
          .rpc('get_employee_commission_summary', {
            p_employee_id: employeeId,
            p_barbershop_id: barbershopId
          });
        
        if (error) throw error;
        return data ? data[0] as EmployeeCommissionSummary : null;
      } else {
        // Resumo de todos os funcionários
        const { data, error } = await supabase
          .from('commissions_summary')
          .select(`
            *,
            employee:employees(name, avatar_url)
          `)
          .eq('barbershop_id', barbershopId);
        
        if (error) throw error;
        return data as CommissionSummary[];
      }
    },
    enabled: !!barbershopId
  });
};
