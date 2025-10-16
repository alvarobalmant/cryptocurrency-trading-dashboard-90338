import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface AvailabilityBlocks {
  [time: string]: boolean;
}

export const useEmployeeAvailability = (employeeId?: string, date?: Date) => {
  const dateStr = date ? format(date, 'yyyy-MM-dd') : '';

  return useQuery({
    queryKey: ['employee-availability', employeeId, dateStr],
    queryFn: async () => {
      if (!employeeId || !dateStr) {
        throw new Error('Employee ID and date are required');
      }

      // Tentar consultar o cache diretamente
      const { data, error } = await supabase
        .from('employee_availability_cache')
        .select('availability_blocks')
        .eq('employee_id', employeeId)
        .eq('date', dateStr)
        .maybeSingle();

      if (error) throw error;

      // Se existir no cache, retornar
      if (data?.availability_blocks) {
        return data.availability_blocks as AvailabilityBlocks;
      }

      // Se não existir, chamar RPC para calcular e cachear
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_employee_availability', {
          p_employee_id: employeeId,
          p_date: dateStr,
        });

      if (rpcError) throw rpcError;
      
      return (rpcData || {}) as AvailabilityBlocks;
    },
    enabled: !!employeeId && !!date,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos no React Query
    gcTime: 10 * 60 * 1000, // Manter em memória por 10 minutos
  });
};
