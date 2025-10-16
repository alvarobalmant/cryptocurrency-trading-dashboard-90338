import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface AvailabilityBlocks {
  [time: string]: boolean;
}

export const useEmployeeAvailability = (employeeId?: string, date?: Date) => {
  const dateStr = date ? format(date, 'yyyy-MM-dd') : '';

  return useQuery({
    queryKey: ['employee-availability-map', employeeId, dateStr],
    queryFn: async () => {
      if (!employeeId || !dateStr) {
        throw new Error('Employee ID and date are required');
      }

      // First, try to fetch from cache (availability_map field)
      const { data, error } = await supabase
        .from('employee_daily_availability')
        .select('availability_map')
        .eq('employee_id', employeeId)
        .eq('date', dateStr)
        .maybeSingle();

      if (error) throw error;

      // If exists and not null, return it
      if (data?.availability_map) {
        return data.availability_map as AvailabilityBlocks;
      }

      // If doesn't exist or is null, generate it
      const { error: refreshError } = await supabase
        .rpc('refresh_availability_map', {
          p_employee_id: employeeId,
          p_date: dateStr,
        });

      if (refreshError) throw refreshError;

      // Fetch again after generation
      const { data: newData, error: newError } = await supabase
        .from('employee_daily_availability')
        .select('availability_map')
        .eq('employee_id', employeeId)
        .eq('date', dateStr)
        .single();

      if (newError) throw newError;
      
      return (newData?.availability_map || {}) as AvailabilityBlocks;
    },
    enabled: !!employeeId && !!date,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
