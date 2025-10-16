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

      console.log('🔍 [Availability] Fetching for employee:', employeeId, 'date:', dateStr);

      // First, try to fetch from cache (availability_map field)
      const { data, error } = await supabase
        .from('employee_daily_availability')
        .select('availability_map')
        .eq('employee_id', employeeId)
        .eq('date', dateStr)
        .maybeSingle();

      if (error) {
        console.error('❌ [Availability] Error fetching cache:', error);
        throw error;
      }

      console.log('📦 [Availability] Cache data:', data);

      // If exists and not null, return it
      if (data?.availability_map && Object.keys(data.availability_map).length > 0) {
        console.log('✅ [Availability] Returning from cache, keys:', Object.keys(data.availability_map).length);
        return data.availability_map as AvailabilityBlocks;
      }

      console.log('⚡ [Availability] Cache empty/null, calling refresh_availability_map...');

      // If doesn't exist or is null, generate it
      const { data: rpcData, error: refreshError } = await supabase
        .rpc('refresh_availability_map', {
          p_employee_id: employeeId,
          p_date: dateStr,
        });

      if (refreshError) {
        console.error('❌ [Availability] Error calling RPC:', refreshError);
        throw refreshError;
      }

      console.log('📡 [Availability] RPC response:', rpcData);

      // Fetch again after generation
      const { data: newData, error: newError } = await supabase
        .from('employee_daily_availability')
        .select('availability_map')
        .eq('employee_id', employeeId)
        .eq('date', dateStr)
        .single();

      if (newError) {
        console.error('❌ [Availability] Error fetching after refresh:', newError);
        throw newError;
      }

      console.log('🔄 [Availability] Data after refresh:', newData);
      console.log('📊 [Availability] Final map keys:', Object.keys(newData?.availability_map || {}).length);
      
      return (newData?.availability_map || {}) as AvailabilityBlocks;
    },
    enabled: !!employeeId && !!date,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
